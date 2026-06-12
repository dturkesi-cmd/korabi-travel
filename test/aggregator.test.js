const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { applySupplierRules } = require("../src/suppliers/aggregator");
const { skybirdDemoOffers, vaxDemoOffers } = require("../src/suppliers/demo-offers");
const { decorateOffers } = require("../src/lib/merchandising");

describe("aggregator supplier rules", () => {
  it("applies 8% markup and net fare_type for Sky Bird", () => {
    const raw = { id: "x", total_amount: "100", supplier: "skybird", fare_type: "net" };
    const out = applySupplierRules(raw, "skybird");
    assert.equal(out.total_amount, "108");
    assert.equal(out.fare_type, "net");
    assert.equal(out.supplier, "skybird");
  });

  it("preserves package fare_type for VAX", () => {
    const raw = { id: "y", total_amount: "250", supplier: "vax", fare_type: "package" };
    const out = applySupplierRules(raw, "vax");
    assert.equal(out.total_amount, "250");
    assert.equal(out.fare_type, "package");
  });
});

describe("demo supplier offers", () => {
  const payload = { origin: "JFK", destination: "LHR", departure_date: "2026-07-01", adults: 1 };

  it("Sky Bird stub returns labelled demo net fares", () => {
    const offers = skybirdDemoOffers(payload);
    assert.ok(offers.length >= 1 && offers.length <= 2);
    for (const o of offers) {
      assert.equal(o.supplier, "skybird");
      assert.equal(o.demo, true);
      assert.match(o.demo_label, /Sky Bird.*DEMO/i);
      assert.equal(o.fare_type, "net");
    }
  });

  it("VAX stub returns labelled demo package fare", () => {
    const offers = vaxDemoOffers(payload);
    assert.equal(offers.length, 1);
    assert.equal(offers[0].supplier, "vax");
    assert.equal(offers[0].demo, true);
    assert.match(offers[0].demo_label, /VAX.*DEMO/i);
    assert.equal(offers[0].fare_type, "package");
  });

  it("stacked Sky Bird demo gets Net fare badge after aggregator rules + merchandising", () => {
    const [demo] = skybirdDemoOffers(payload);
    const stacked = applySupplierRules(demo, "skybird");
    const [decorated] = decorateOffers([stacked]);
    assert.ok(decorated.merch.badges.includes("Net fare"));
  });
});
