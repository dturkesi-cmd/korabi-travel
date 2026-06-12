const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "../data/store.test.json");

beforeEach(() => {
  if (fs.existsSync(DATA)) fs.unlinkSync(DATA);
  process.env.KORABI_DATA_FILE = DATA;
  delete require.cache[require.resolve("../src/db/store")];
  delete require.cache[require.resolve("../src/lib/payments")];
});

describe("payments escrow", () => {
  it("hold → release moves state", () => {
    const store = require("../src/db/store");
    const payments = require("../src/lib/payments");
    store.users.create({ id: "u1", email: "s@test", name: "S", password_hash: "x", role: "user" });
    store.users.create({ id: "u2", email: "b@test", name: "B", password_hash: "x", role: "user" });
    const pay = payments.hold({ listingId: "lst1", sellerUserId: "u1", buyerUserId: "u2", amount: 100, currency: "USD" });
    assert.equal(pay.state, "held");
    assert.equal(pay.commission, 12);
    assert.equal(pay.payout, 88);
    const released = payments.release(pay.id);
    assert.equal(released.state, "released");
    assert.ok(released.released_at);
  });

  it("hold → refund on failed transfer", () => {
    const store = require("../src/db/store");
    const payments = require("../src/lib/payments");
    store.users.create({ id: "u1", email: "s2@test", name: "S", password_hash: "x", role: "user" });
    store.users.create({ id: "u2", email: "b2@test", name: "B", password_hash: "x", role: "user" });
    const pay = payments.hold({ listingId: "lst2", sellerUserId: "u1", buyerUserId: "u2", amount: 50, currency: "EUR" });
    const refunded = payments.refund(pay.id);
    assert.equal(refunded.state, "refunded");
    assert.ok(refunded.refunded_at);
  });

  it("Stripe stubs throw when STRIPE_SECRET_KEY unset", async () => {
    const payments = require("../src/lib/payments");
    delete process.env.STRIPE_SECRET_KEY;
    assert.equal(payments.stripeConfigured(), false);
    await assert.rejects(
      () => payments.holdViaStripe({ listingId: "l", sellerUserId: "s", buyerUserId: "b", amount: 10, currency: "USD" }),
      (err) => err.code === "STRIPE_NOT_CONFIGURED"
    );
  });

  it("Stripe hold → release stub when key set", async () => {
    const store = require("../src/db/store");
    const payments = require("../src/lib/payments");
    process.env.STRIPE_SECRET_KEY = "sk_test_stub";
    store.users.create({ id: "u1", email: "st@test", name: "S", password_hash: "x", role: "user" });
    store.users.create({ id: "u2", email: "bt@test", name: "B", password_hash: "x", role: "user" });
    const pay = await payments.holdViaStripe({
      listingId: "lst3",
      sellerUserId: "u1",
      buyerUserId: "u2",
      amount: 100,
      currency: "USD",
      sellerStripeAccountId: "acct_test",
    });
    assert.equal(pay.provider, "stripe_connect");
    assert.equal(pay.state, "held");
    const released = await payments.releaseViaStripe(pay.id);
    assert.equal(released.state, "released");
    delete process.env.STRIPE_SECRET_KEY;
  });
});
