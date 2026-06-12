const router = require("express").Router();
const config = require("../config");
const store = require("../db/store");
const duffel = require("../lib/duffel");
const notify = require("../lib/notify");
const settlementRail = require("../lib/settlement-rail");
const { requireAuth } = require("../middleware/auth");
const { verifyCsrf } = require("../middleware/csrf");

router.get("/bookings", requireAuth, (req, res) => {
  const mine = store.bookings.all().filter((b) => b.userId === req.user.id);
  res.json({ bookings: mine, korabi_cash: req.user.korabi_cash || 0 });
});

router.post("/bookings", requireAuth, verifyCsrf, (req, res) => {
  const b = req.body || {};
  const booking = {
    id: store.id("bk"),
    userId: req.user.id,
    reference: b.reference || store.id("ref").slice(4).toUpperCase(),
    route: b.route || "Trip",
    status: "confirmed",
    total_amount: Number(b.total_amount || 0),
    total_currency: b.total_currency || "USD",
    passenger_names: b.passenger_names || [],
    korabi_cash_earned: 0,
    source: b.source || "demo",
    created_at: new Date().toISOString(),
  };
  store.bookings.create(booking);
  res.json({ booking });
});

router.post("/bookings/:id/cancel/quote", requireAuth, verifyCsrf, async (req, res) => {
  const bk = store.bookings.find((b) => b.id === req.params.id && b.userId === req.user.id);
  if (!bk) return res.status(404).json({ error: "not_found" });
  if (bk.status === "cancelled") return res.status(400).json({ error: "already_cancelled" });

  if (bk.source === "demo" || !bk.orderId) {
    const refund = Math.round(Number(bk.total_amount) * 0.8 * 100) / 100;
    return res.json({
      quote: {
        refund_amount: String(refund),
        refund_currency: bk.total_currency,
        simulated: true,
        note: "Simulated refund quote for demo booking (80% of fare).",
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      },
    });
  }

  const q = await duffel.cancelQuote(bk.orderId);
  res.json({ quote: q });
});

router.post("/bookings/:id/cancel/confirm", requireAuth, verifyCsrf, async (req, res) => {
  const bk = store.bookings.find((b) => b.id === req.params.id && b.userId === req.user.id);
  if (!bk) return res.status(404).json({ error: "not_found" });
  if (bk.status === "cancelled") return res.status(400).json({ message: "Already cancelled." });

  const refundAmt = bk.source === "demo"
    ? Math.round(Number(bk.total_amount) * 0.8 * 100) / 100
    : Number(bk.total_amount) * 0.5;

  let settlementRefund = null;
  if (bk.settlement_id) {
    try {
      settlementRefund = await settlementRail.refundSettlement({
        settlementId: bk.settlement_id,
        reason: "Customer trip cancellation",
        amountCents: Math.round(Number(bk.total_amount) * 100),
      });
    } catch (e) {
      settlementRefund = { ok: false, error: e.message };
    }
  }

  store.bookings.update((b) => b.id === bk.id, {
    status: "cancelled",
    refund: { amount: refundAmt, currency: bk.total_currency, at: new Date().toISOString() },
    settlement_refund: settlementRefund,
  });
  const updated = store.bookings.find((b) => b.id === bk.id);
  notify.cancellationConfirmed(req.user.id, updated, updated.refund, settlementRefund);
  res.json({ booking: updated, settlement_refund: settlementRefund });
});

router.post("/bookings/:id/change-request", requireAuth, verifyCsrf, (req, res) => {
  const bk = store.bookings.find((b) => b.id === req.params.id && b.userId === req.user.id);
  if (!bk) return res.status(404).json({ error: "not_found" });
  const note = ((req.body && req.body.note) || "").trim();
  if (!note) return res.status(400).json({ message: "Describe what you'd like to change." });

  const reqRow = {
    id: store.id("req"),
    userId: req.user.id,
    bookingId: bk.id,
    route: bk.route,
    reference: bk.reference,
    note,
    status: "open",
    resolution: null,
    created_at: new Date().toISOString(),
  };
  store.requests.create(reqRow);
  res.json({ request: reqRow });
});

router.get("/requests", requireAuth, (req, res) => {
  const mine = store.requests.all().filter((r) => r.userId === req.user.id);
  res.json({ requests: mine });
});

module.exports = router;
