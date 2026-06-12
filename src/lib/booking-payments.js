/**
 * Flight checkout payments — card must be confirmed before /api/orders runs.
 *
 * Demo: local checkout intents (simulated card confirm).
 * Live: Duffel Payment Intents (client collects card → balance top-up → order uses balance).
 */
const config = require("../config");
const store = require("../db/store");
const duffel = require("./duffel");

const round2 = (n) => Math.round(Number(n) * 100) / 100;
const SUCCEEDED = new Set(["succeeded", "confirmed"]);

function paymentMode() {
  if (duffel.isConfigured()) return "duffel";
  return "demo";
}

function getClient() {
  if (!config.duffelToken) return null;
  const { Duffel } = require("@duffel/api");
  return new Duffel({ token: config.duffelToken });
}

function findIntent(id) {
  return store.checkoutIntents.find((x) => x.id === id || x.external_id === id);
}

async function createIntent({ offer_id, amount, currency, userId = null }) {
  if (!offer_id || amount == null || !currency) {
    const err = new Error("offer_id, amount, and currency are required.");
    err.status = 400;
    err.code = "bad_payment_intent";
    throw err;
  }

  const amt = round2(amount);
  const cur = String(currency).toUpperCase();

  if (duffel.isConfigured()) {
    const client = getClient();
    const { data: pi } = await client.paymentIntents.create({
      amount: String(amt),
      currency: cur,
    });
    const row = {
      id: store.id("cpi"),
      external_id: pi.id,
      offer_id,
      amount: amt,
      currency: cur,
      status: pi.status || "requires_payment_method",
      demo: false,
      client_token: pi.client_token,
      user_id: userId,
      created_at: new Date().toISOString(),
      confirmed_at: pi.confirmed_at || null,
      consumed_at: null,
      card_last_four: pi.card_last_four_digits || null,
    };
    store.checkoutIntents.create(row);
    return { payment_intent: publicIntent(row), mode: "duffel" };
  }

  const row = {
    id: store.id("cpi"),
    external_id: null,
    offer_id,
    amount: amt,
    currency: cur,
    status: "requires_payment_method",
    demo: true,
    client_token: "demo",
    user_id: userId,
    created_at: new Date().toISOString(),
    confirmed_at: null,
    consumed_at: null,
    card_last_four: null,
  };
  store.checkoutIntents.create(row);
  return { payment_intent: publicIntent(row), mode: "demo" };
}

async function refreshIntent(id) {
  const row = findIntent(id);
  if (!row) return null;
  if (row.demo || !row.external_id) return row;

  const client = getClient();
  if (!client) return row;
  try {
    const { data: pi } = await client.paymentIntents.get(row.external_id);
    store.checkoutIntents.update((x) => x.id === row.id, {
      status: pi.status || row.status,
      confirmed_at: pi.confirmed_at || row.confirmed_at,
      card_last_four: pi.card_last_four_digits || row.card_last_four,
    });
    return findIntent(row.id);
  } catch {
    return row;
  }
}

async function confirmDemoIntent(id, { card_last_four = "4242" } = {}) {
  const row = findIntent(id);
  if (!row) {
    const err = new Error("Payment intent not found.");
    err.status = 404;
    err.code = "payment_intent_not_found";
    throw err;
  }
  if (!row.demo) {
    const err = new Error("Live payments are confirmed via Duffel Payments on the client.");
    err.status = 400;
    err.code = "use_duffel_payments";
    throw err;
  }
  if (row.consumed_at) {
    const err = new Error("Payment intent already used for a booking.");
    err.status = 409;
    err.code = "payment_intent_consumed";
    throw err;
  }

  const now = new Date().toISOString();
  store.checkoutIntents.update((x) => x.id === row.id, {
    status: "succeeded",
    confirmed_at: now,
    card_last_four: String(card_last_four).slice(-4),
  });
  return { payment_intent: publicIntent(findIntent(row.id)) };
}

function publicIntent(row) {
  return {
    id: row.id,
    external_id: row.external_id,
    offer_id: row.offer_id,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    demo: row.demo,
    client_token: row.client_token,
    confirmed_at: row.confirmed_at,
    card_last_four: row.card_last_four,
  };
}

async function assertReadyForOrder({ payment_intent_id, offer_id, amount, currency }) {
  let row = findIntent(payment_intent_id);
  if (!row) {
    const err = new Error("Valid payment_intent_id required — create and confirm payment first.");
    err.status = 402;
    err.code = "payment_required";
    throw err;
  }

  if (!row.demo) row = (await refreshIntent(row.id)) || row;

  if (row.consumed_at) {
    const err = new Error("Payment intent already used.");
    err.status = 409;
    err.code = "payment_intent_consumed";
    throw err;
  }
  if (!SUCCEEDED.has(row.status)) {
    const err = new Error(`Payment not confirmed (status: ${row.status || "unknown"}).`);
    err.status = 402;
    err.code = "payment_not_confirmed";
    throw err;
  }
  if (row.offer_id !== offer_id) {
    const err = new Error("Payment intent does not match this offer.");
    err.status = 400;
    err.code = "payment_offer_mismatch";
    throw err;
  }

  const expected = round2(amount);
  if (Math.abs(round2(row.amount) - expected) > 0.02) {
    const err = new Error("Payment amount does not match order total.");
    err.status = 400;
    err.code = "payment_amount_mismatch";
    throw err;
  }
  if (String(row.currency).toUpperCase() !== String(currency).toUpperCase()) {
    const err = new Error("Payment currency does not match order.");
    err.status = 400;
    err.code = "payment_currency_mismatch";
    throw err;
  }

  return row;
}

function markConsumed(payment_intent_id) {
  const now = new Date().toISOString();
  store.checkoutIntents.update(
    (x) => x.id === payment_intent_id || x.external_id === payment_intent_id,
    { consumed_at: now }
  );
}

module.exports = {
  paymentMode,
  createIntent,
  refreshIntent,
  confirmDemoIntent,
  assertReadyForOrder,
  markConsumed,
  publicIntent,
};
