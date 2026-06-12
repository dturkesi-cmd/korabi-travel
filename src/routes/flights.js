const router = require("express").Router();
const config = require("../config");
const duffel = require("../lib/duffel");
const bookingPayments = require("../lib/booking-payments");
const settlementRail = require("../lib/settlement-rail");
const aggregator = require("../suppliers/aggregator");
const { status } = require("../suppliers/registry");
const { searchLimiter } = require("../middleware/security");

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    token_configured: duffel.isConfigured(),
    live_mode: duffel.isConfigured() && !String(config.duffelToken).startsWith("duffel_test"),
    gemini_configured: Boolean(config.geminiKey),
    payments_mode: bookingPayments.paymentMode(),
    settlement_rail: settlementRail.settlementStatus(),
    loyalty: { earn_pct: config.loyaltyEarnPct, member_discount_pct: config.memberDiscountPct },
    suppliers: status(),
  });
});

router.get("/suppliers", (_req, res) => res.json({ suppliers: status() }));

router.get("/places", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (q.length < 2) return res.json({ places: [] });
  const places = await duffel.places(q);
  res.json({ places });
});

router.post("/search", searchLimiter, async (req, res) => {
  const b = req.body || {};
  if (!b.origin || !b.destination || !b.departure_date) {
    return res.status(400).json({ error: "bad_search", message: "origin, destination, and departure_date required." });
  }
  try {
    const result = await aggregator.search(
      {
        origin: b.origin,
        destination: b.destination,
        departure_date: b.departure_date,
        return_date: b.return_date || null,
        adults: b.adults || 1,
        children_ages: b.children_ages || [],
        cabin_class: b.cabin_class || "economy",
      },
      { user: req.user }
    );
    res.json(result);
  } catch (e) {
    if (!duffel.isConfigured()) {
      return res.status(503).json({ error: "no_token", message: "Duffel token not configured." });
    }
    res.status(502).json({ error: "search_failed", message: e.message });
  }
});

router.get("/offers/:id", async (req, res) => {
  const data = await duffel.getOffer(req.params.id);
  if (!data) return res.status(404).json({ error: "not_found" });
  res.json(data);
});

router.get("/seat-maps/:id", async (req, res) => {
  res.json(await duffel.getSeatMaps(req.params.id));
});

router.get("/ancillaries/:id", async (req, res) => {
  const data = await duffel.getAncillaries(req.params.id);
  if (!data) return res.status(404).json({ error: "not_found" });
  res.json(data);
});

module.exports = router;
