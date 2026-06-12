const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const t = require("../src/lib/transferability");

describe("transferability", () => {
  it("allows Ryanair listings", () => {
    const dep = new Date(Date.now() + 48 * 3600000).toISOString();
    assert.equal(t.canList({ airline_iata: "FR", departing_at: dep }).ok, true);
  });

  it("blocks non-transferable airlines", () => {
    const dep = new Date(Date.now() + 48 * 3600000).toISOString();
    assert.equal(t.canList({ airline_iata: "BA", departing_at: dep }).ok, false);
  });

  it("enforces Frontier 24h cutoff", () => {
    const dep = new Date(Date.now() + 12 * 3600000).toISOString();
    assert.equal(t.canList({ airline_iata: "F9", departing_at: dep }).ok, false);
  });

  it("policy returns airline metadata", () => {
    assert.equal(t.policy("U2").name, "easyJet");
    assert.equal(t.policy("XX"), null);
  });
});
