const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "../data/store.payout.test.json");

describe("payout method privacy", () => {
  it("never persists full account number", () => {
    if (fs.existsSync(DATA)) fs.unlinkSync(DATA);
    process.env.KORABI_DATA_FILE = DATA;
    delete require.cache[require.resolve("../src/db/store")];

    const store = require("../src/db/store");
    store.users.create({
      id: "u1",
      email: "s@test",
      name: "Seller",
      password_hash: "x",
      role: "user",
      korabi_cash: 0,
      payout_method: null,
    });
    const account = "PT50001234567890123456789";
    store.users.setPayoutMethod("u1", { holder: "Sara Lopes", last4: account.slice(-4), added_at: new Date().toISOString() });

    const raw = fs.readFileSync(DATA, "utf8");
    assert.ok(!raw.includes(account));
    assert.ok(raw.includes("6789"));
    const u = store.users.findById("u1");
    assert.equal(u.payout_method.last4, "6789");
    assert.equal(u.payout_method.holder, "Sara Lopes");
    fs.unlinkSync(DATA);
    delete process.env.KORABI_DATA_FILE;
  });
});
