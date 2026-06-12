/**
 * Escrow payments abstraction — simulated ledger in this build.
 *
 * Stripe Connect seam (no stripe npm dep until credentials are wired):
 *   holdViaStripe   — PaymentIntent, capture_method=manual, transfer_data.destination
 *   releaseViaStripe — capture intent; platform keeps application_fee_amount (commission)
 *   refundViaStripe — Refund.create on held/captured intent when transfer fails
 *
 * Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (optional), seller stripe_account on user row.
 */
const config = require("../config");
const store = require("../db/store");

const round2 = (n) => Math.round(Number(n) * 100) / 100;
const PROVIDER = "simulated";
const STRIPE_PROVIDER = "stripe_connect";

function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function stripeNotConfiguredError() {
  const err = new Error(
    "Stripe Connect not configured: set STRIPE_SECRET_KEY and install stripe (npm install stripe)."
  );
  err.code = "STRIPE_NOT_CONFIGURED";
  return err;
}

/**
 * Authorize buyer funds on platform; route payout to seller Connect account on capture.
 * @param {object} params
 * @param {string} params.listingId
 * @param {string} params.sellerUserId
 * @param {string} params.buyerUserId
 * @param {number} params.amount — buyer pays (major units)
 * @param {string} params.currency
 * @param {string} [params.sellerStripeAccountId] — acct_… from Connect onboarding
 * @param {string} [params.paymentMethodId] — pm_… from Stripe.js / Elements
 * @returns {Promise<object>} payment row shape + stripe_payment_intent_id when live
 */
async function holdViaStripe({
  listingId,
  sellerUserId,
  buyerUserId,
  amount,
  currency,
  sellerStripeAccountId,
  paymentMethodId,
}) {
  if (!stripeConfigured()) throw stripeNotConfiguredError();

  const commission = round2(Number(amount) * config.marketplaceCommissionPct / 100);
  const payout = round2(Number(amount) - commission);

  // Live wiring (after npm install stripe):
  // const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  // const intent = await stripe.paymentIntents.create({
  //   amount: Math.round(amount * 100),
  //   currency: currency.toLowerCase(),
  //   capture_method: "manual",
  //   payment_method: paymentMethodId,
  //   confirm: true,
  //   transfer_data: { destination: sellerStripeAccountId },
  //   application_fee_amount: Math.round(commission * 100),
  //   metadata: { listingId, sellerUserId, buyerUserId },
  // });

  const p = {
    id: store.id("pay"),
    listingId,
    sellerUserId,
    buyerUserId,
    amount: round2(amount),
    currency,
    commission,
    payout,
    state: "held",
    provider: STRIPE_PROVIDER,
    stripe_payment_intent_id: null,
    stripe_connect_account: sellerStripeAccountId || null,
    stripe_payment_method_id: paymentMethodId || null,
    created_at: new Date().toISOString(),
    released_at: null,
    refunded_at: null,
    history: [{ state: "held", at: new Date().toISOString(), via: "stripe_stub" }],
  };
  store.payments.create(p);
  return p;
}

/**
 * Capture held PaymentIntent — seller receives transfer minus platform fee.
 * @param {string} paymentId — internal pay_… id
 * @returns {Promise<object|null>}
 */
async function releaseViaStripe(paymentId) {
  if (!stripeConfigured()) throw stripeNotConfiguredError();

  const p = store.payments.find((x) => x.id === paymentId);
  if (!p || p.state !== "held" || p.provider !== STRIPE_PROVIDER) return null;

  // const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  // await stripe.paymentIntents.capture(p.stripe_payment_intent_id);

  const now = new Date().toISOString();
  store.payments.update((x) => x.id === paymentId, {
    state: "released",
    released_at: now,
    history: [...(p.history || []), { state: "released", at: now, via: "stripe_stub" }],
  });
  return store.payments.find((x) => x.id === paymentId);
}

/**
 * Refund buyer when name transfer fails after capture or while still held.
 * @param {string} paymentId
 * @returns {Promise<object|null>}
 */
async function refundViaStripe(paymentId) {
  if (!stripeConfigured()) throw stripeNotConfiguredError();

  const p = store.payments.find((x) => x.id === paymentId);
  if (!p || p.state !== "held" || p.provider !== STRIPE_PROVIDER) return null;

  // const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  // await stripe.refunds.create({ payment_intent: p.stripe_payment_intent_id });

  const now = new Date().toISOString();
  store.payments.update((x) => x.id === paymentId, {
    state: "refunded",
    refunded_at: now,
    history: [...(p.history || []), { state: "refunded", at: now, via: "stripe_stub" }],
  });
  return store.payments.find((x) => x.id === paymentId);
}

function hold({ listingId, sellerUserId, buyerUserId, amount, currency }) {
  const commission = round2(Number(amount) * config.marketplaceCommissionPct / 100);
  const payout = round2(Number(amount) - commission);
  const p = {
    id: store.id("pay"),
    listingId,
    sellerUserId,
    buyerUserId,
    amount: round2(amount),
    currency,
    commission,
    payout,
    state: "held",
    provider: PROVIDER,
    created_at: new Date().toISOString(),
    released_at: null,
    refunded_at: null,
    history: [{ state: "held", at: new Date().toISOString() }],
  };
  store.payments.create(p);
  return p;
}

function release(paymentId) {
  const p = store.payments.find((x) => x.id === paymentId);
  if (!p || p.state !== "held") return null;
  const now = new Date().toISOString();
  store.payments.update((x) => x.id === paymentId, {
    state: "released",
    released_at: now,
    history: [...(p.history || []), { state: "released", at: now }],
  });
  return store.payments.find((x) => x.id === paymentId);
}

function refund(paymentId) {
  const p = store.payments.find((x) => x.id === paymentId);
  if (!p || p.state !== "held") return null;
  const now = new Date().toISOString();
  store.payments.update((x) => x.id === paymentId, {
    state: "refunded",
    refunded_at: now,
    history: [...(p.history || []), { state: "refunded", at: now }],
  });
  return store.payments.find((x) => x.id === paymentId);
}

function summary() {
  const all = store.payments.all();
  const held = all.filter((p) => p.state === "held");
  const released = all.filter((p) => p.state === "released");
  const refunded = all.filter((p) => p.state === "refunded");
  const sum = (arr, f) => round2(arr.reduce((s, x) => s + Number(x[f] || 0), 0));
  return {
    provider: PROVIDER,
    held_count: held.length,
    held_amount: sum(held, "amount"),
    payouts_sent: sum(released, "payout"),
    commission_earned: sum(released, "commission"),
    refunded_amount: sum(refunded, "amount"),
  };
}

module.exports = {
  PROVIDER,
  STRIPE_PROVIDER,
  stripeConfigured,
  hold,
  release,
  refund,
  summary,
  holdViaStripe,
  releaseViaStripe,
  refundViaStripe,
};
