/**
 * Seller payouts. PRIVACY: the full bank account number is intentionally NEVER
 * persisted — only the holder name + last 4 digits, enough for the seller to
 * recognise their method. Real payouts should onboard sellers through the PSP
 * (e.g. Stripe Connect Express), which holds details + KYC itself.
 */
const router = require("express").Router();
const store = require("../db/store");
const { requireAuth } = require("../middleware/auth");
const { verifyCsrf } = require("../middleware/csrf");

const round2 = (n) => Math.round(Number(n) * 100) / 100;
const label = (map) => { const ks = Object.keys(map); return ks.length ? ks.map((c) => map[c] + " " + c).join(", ") : null; };

router.get("/payouts", requireAuth, (req, res) => {
  const mine = store.payments.all().filter((p) => p.sellerUserId === req.user.id);
  const released = mine.filter((p) => p.state === "released");
  const held = mine.filter((p) => p.state === "held");
  const tp = {}, pe = {};
  released.forEach((p) => { tp[p.currency] = round2((tp[p.currency] || 0) + Number(p.payout)); });
  held.forEach((p) => { pe[p.currency] = round2((pe[p.currency] || 0) + Number(p.payout)); });
  res.json({
    payout_method: req.user.payout_method || null,
    payouts: released.map((p) => ({ id: p.id, amount: p.payout, currency: p.currency, released_at: p.released_at, listingId: p.listingId })),
    total_paid_label: label(tp), pending_label: label(pe),
  });
});

router.post("/payout-method", requireAuth, verifyCsrf, (req, res) => {
  const holder = ((req.body && req.body.holder) || "").trim();
  const account = ((req.body && req.body.account) || "").replace(/\s+/g, "");
  if (!holder || account.length < 6)
    return res.status(400).json({ error: "bad_method", message: "Holder name and a valid account number are required." });
  const method = { holder, last4: account.slice(-4), added_at: new Date().toISOString() }; // full number discarded
  store.users.setPayoutMethod(req.user.id, method);
  res.json({ payout_method: method });
});

module.exports = router;
