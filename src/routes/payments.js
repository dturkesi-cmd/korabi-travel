const router = require("express").Router();
const bookingPayments = require("../lib/booking-payments");
const { verifyCsrf } = require("../middleware/csrf");

router.post("/intent", verifyCsrf, async (req, res) => {
  const b = req.body || {};
  if (!b.offer_id || b.amount == null || !b.currency) {
    return res.status(400).json({
      error: "bad_payment_intent",
      message: "offer_id, amount, and currency required.",
    });
  }
  try {
    const result = await bookingPayments.createIntent({
      offer_id: b.offer_id,
      amount: b.amount,
      currency: b.currency,
      userId: req.user ? req.user.id : null,
    });
    res.json(result);
  } catch (e) {
    res.status(e.status || 502).json({ error: e.code || "payment_intent_failed", message: e.message });
  }
});

router.get("/intent/:id", async (req, res) => {
  const row = await bookingPayments.refreshIntent(req.params.id);
  if (!row) return res.status(404).json({ error: "not_found", message: "Payment intent not found." });
  res.json({
    payment_intent: bookingPayments.publicIntent(row),
    mode: bookingPayments.paymentMode(),
  });
});

router.post("/intent/:id/confirm", verifyCsrf, async (req, res) => {
  try {
    const result = await bookingPayments.confirmDemoIntent(req.params.id, req.body || {});
    res.json(result);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.code || "confirm_failed", message: e.message });
  }
});

module.exports = router;
