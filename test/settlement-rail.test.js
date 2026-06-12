const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  hashPnr,
  normalizePnr,
  isR09Eligible,
  buildSettlePayload,
} = require("../src/lib/settlement-rail");

describe("settlement rail (R09 seam)", () => {
  it("hashPnr matches Shteg travelHub format", () => {
    const h = hashPnr("ABC123");
    assert.equal(h.length, 16);
    assert.match(h, /^[A-F0-9]+$/);
    assert.equal(hashPnr("ABC123"), hashPnr("ABC123"));
  });

  it("normalizes booking references to PNR shape", () => {
    assert.equal(normalizePnr("KORABI1").length, 6);
    assert.match(normalizePnr("ABC123"), /^[A-Z0-9]{6}$/);
  });

  it("flags R09-eligible carriers", () => {
    assert.equal(isR09Eligible("FR"), true);
    assert.equal(isR09Eligible("AA"), true);
    assert.equal(isR09Eligible("ZZ"), false);
  });

  it("builds settle payload from cached offer", () => {
    const offer = {
      owner: { iata_code: "FR", name: "Ryanair" },
      slices: [{
        origin: "LIS",
        destination: "BCN",
        segments: [{ departing_at: "2026-08-01T10:00:00Z", marketing_carrier: "FR" }],
      }],
    };
    const built = buildSettlePayload({
      pnr: "ABC123",
      offer,
      amountCents: 8900,
    });
    assert.equal(built.ok, true);
    assert.equal(built.payload.carrier, "FR");
    assert.equal(built.payload.origin, "LIS");
    assert.equal(built.payload.amountCents, 8900);
  });

  it("skips non-R09 carriers", () => {
    const offer = {
      owner: { iata_code: "ZZ", name: "Unknown Air" },
      slices: [{ origin: "JFK", destination: "LAX", segments: [{ departing_at: "2026-08-01T10:00:00Z" }] }],
    };
    const built = buildSettlePayload({ pnr: "XYZ789", offer, amountCents: 50000 });
    assert.equal(built.ok, false);
    assert.equal(built.error, "carrier_not_r09");
  });

  it("lookupPnrLocal finds booking by reference", () => {
    process.env.KORABI_DATA_FILE = path.join(os.tmpdir(), `korabi-lookup-${process.pid}.json`);
    delete require.cache[require.resolve("../src/db/store")];
    delete require.cache[require.resolve("../src/lib/settlement-rail")];
    const st = require("../src/db/store");
    const { lookupPnrLocal, hashPnr, normalizePnr } = require("../src/lib/settlement-rail");
    st.load();
    st.bookings.create({
      id: "bk_test1",
      reference: "ABC123",
      route: "LIS → BCN",
      settlement_id: "FEDNOW-R09-FR-TEST",
      status: "confirmed",
      total_amount: 89,
      total_currency: "EUR",
      created_at: new Date().toISOString(),
    });
    const found = lookupPnrLocal("ABC123");
    assert.equal(found.pnrHash, hashPnr(normalizePnr("ABC123")));
    assert.equal(found.bookings.length, 1);
    if (fs.existsSync(process.env.KORABI_DATA_FILE)) fs.unlinkSync(process.env.KORABI_DATA_FILE);
    delete process.env.KORABI_DATA_FILE;
  });

  it("refundSettlement returns sandbox receipt", async () => {
    const { refundSettlement } = require("../src/lib/settlement-rail");
    const r = await refundSettlement({ settlementId: "FEDNOW-R09-FR-ABC", amountCents: 8900 });
    assert.equal(r.ok, true);
    assert.match(r.path, /REFUND/);
  });
});
