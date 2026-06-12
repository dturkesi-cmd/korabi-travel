const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const DATA = path.join(os.tmpdir(), `korabi-pay-test-${process.pid}.json`);

function loadStore() {
  delete require.cache[require.resolve("../src/db/store")];
  delete require.cache[require.resolve("../src/lib/booking-payments")];
  return {
    store: require("../src/db/store"),
    bookingPayments: require("../src/lib/booking-payments"),
  };
}

describe("booking payments", () => {
  beforeEach(() => {
    if (fs.existsSync(DATA)) fs.unlinkSync(DATA);
    process.env.KORABI_DATA_FILE = DATA;
    process.env.DUFFEL_ACCESS_TOKEN = "";
  });

  afterEach(() => {
    delete process.env.KORABI_DATA_FILE;
    delete process.env.DUFFEL_ACCESS_TOKEN;
    if (fs.existsSync(DATA)) fs.unlinkSync(DATA);
  });

  it("creates demo intent and confirms before order", async () => {
    const { bookingPayments } = loadStore();
    assert.equal(bookingPayments.paymentMode(), "demo");

    const { payment_intent } = await bookingPayments.createIntent({
      offer_id: "off_demo_0",
      amount: 299.5,
      currency: "USD",
    });
    assert.equal(payment_intent.demo, true);
    assert.equal(payment_intent.status, "requires_payment_method");

    const confirmed = await bookingPayments.confirmDemoIntent(payment_intent.id, {
      card_last_four: "4242",
    });
    assert.equal(confirmed.payment_intent.status, "succeeded");

    const row = await bookingPayments.assertReadyForOrder({
      payment_intent_id: payment_intent.id,
      offer_id: "off_demo_0",
      amount: "299.50",
      currency: "USD",
    });
    assert.equal(row.card_last_four, "4242");

    bookingPayments.markConsumed(payment_intent.id);
    await assert.rejects(
      () =>
        bookingPayments.assertReadyForOrder({
          payment_intent_id: payment_intent.id,
          offer_id: "off_demo_0",
          amount: "299.50",
          currency: "USD",
        }),
      (e) => e.code === "payment_intent_consumed"
    );
  });

  it("rejects order without confirmed payment", async () => {
    const { bookingPayments } = loadStore();
    const { payment_intent } = await bookingPayments.createIntent({
      offer_id: "off_demo_1",
      amount: 100,
      currency: "EUR",
    });

    await assert.rejects(
      () =>
        bookingPayments.assertReadyForOrder({
          payment_intent_id: payment_intent.id,
          offer_id: "off_demo_1",
          amount: 100,
          currency: "EUR",
        }),
      (e) => e.code === "payment_not_confirmed"
    );
  });

  it("rejects amount mismatch", async () => {
    const { bookingPayments } = loadStore();
    const { payment_intent } = await bookingPayments.createIntent({
      offer_id: "off_demo_2",
      amount: 200,
      currency: "USD",
    });
    await bookingPayments.confirmDemoIntent(payment_intent.id);

    await assert.rejects(
      () =>
        bookingPayments.assertReadyForOrder({
          payment_intent_id: payment_intent.id,
          offer_id: "off_demo_2",
          amount: 199,
          currency: "USD",
        }),
      (e) => e.code === "payment_amount_mismatch"
    );
  });
});
