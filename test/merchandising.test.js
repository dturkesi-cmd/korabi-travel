const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { decorateOffers } = require("../src/lib/merchandising");

const sample = [
  { id: "a", total_amount: "200", total_currency: "USD", slices: [{ duration: "PT2H30M", stops: 0 }] },
  { id: "b", total_amount: "350", total_currency: "USD", slices: [{ duration: "PT5H", stops: 1 }] },
  { id: "c", total_amount: "180", total_currency: "USD", slices: [{ duration: "PT3H", stops: 0 }] },
];

describe("merchandising", () => {
  it("assigns Cheapest badge to lowest fare", () => {
    const out = decorateOffers(sample);
    const cheapest = out.find((o) => o.merch.badges.includes("Cheapest"));
    assert.equal(cheapest.id, "c");
  });

  it("applies member discount when user present", () => {
    const out = decorateOffers(sample, { user: { id: "u1" } });
    assert.ok(out[0].merch.member_save > 0);
    assert.ok(out[0].merch.loyalty_earn > 0);
  });

  it("no member save for guests", () => {
    const out = decorateOffers(sample);
    assert.equal(out[0].merch.member_save, 0);
  });
});
