const router = require("express").Router();
const config = require("../config");
const store = require("../db/store");
const payments = require("../lib/payments");
const notify = require("../lib/notify");
const reports = require("../lib/reports");
const settlementRail = require("../lib/settlement-rail");
const { status } = require("../suppliers/registry");
const { requireAdmin } = require("../middleware/auth");
const { verifyCsrf } = require("../middleware/csrf");

router.use(requireAdmin);

router.get("/overview", (req, res) => {
  const allBk = store.bookings.all();
  const pending = store.listings.all().filter((l) => l.status === "pending_transfer");
  const openReq = store.requests.all().filter((r) => r.status === "open");
  const unverified = store.listings.all().filter(
    (l) => l.status === "active" && (!l.verification || l.verification.state !== "verified")
  );

  res.json({
    stats: {
      users: store.users.all().length,
      bookings: allBk.length,
      pending_transfers: pending.length,
    },
    recent_bookings: allBk.slice(-10).reverse(),
    recent_events: store.events.all().slice(-10).reverse(),
    suppliers: status(),
    payments: payments.summary(),
    open_requests: openReq.map((q) => ({
      ...q,
      user: store.users.findById(q.userId),
    })),
    unverified_listings: unverified.map((l) => ({
      id: l.id,
      route: `${l.origin} → ${l.destination}`,
      airline: l.airline,
      departing_at: l.departing_at,
      pnr: l.pnr,
      source: l.source || "external",
    })),
  });
});

router.get("/transfers", (req, res) => {
  const items = store.listings.all().filter((l) => l.status === "pending_transfer");
  res.json({
    transfers: items.map((x) => ({
      ...x,
      seller: store.users.findById(x.sellerUserId),
      buyer: store.users.findById(x.buyerUserId),
      escrow: x.escrow || {},
      policy_verify: true,
    })),
  });
});

router.post("/transfers/:id/complete", verifyCsrf, (req, res) => {
  const listing = store.listings.find((l) => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: "not_found" });
  const eticket = (req.body && req.body.new_eticket) || null;
  store.listings.update((l) => l.id === listing.id, {
    status: "sold",
    eticket,
    transfer_completed_at: new Date().toISOString(),
  });
  const pay = store.payments.find((p) => p.listingId === listing.id && p.state === "held");
  if (pay) {
    payments.release(pay.id);
    notify.payoutReleased(listing.sellerUserId, pay.payout, pay.currency);
  }
  notify.transferComplete(listing.buyerUserId, listing, eticket);
  res.json({ ok: true });
});

router.post("/transfers/:id/fail", verifyCsrf, (req, res) => {
  const listing = store.listings.find((l) => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: "not_found" });
  const reason = (req.body && req.body.reason) || "Transfer could not be completed.";
  store.listings.update((l) => l.id === listing.id, { status: "failed", fail_reason: reason });
  const pay = store.payments.find((p) => p.listingId === listing.id && p.state === "held");
  if (pay) {
    payments.refund(pay.id);
    notify.refundIssued(listing.buyerUserId, pay.amount, pay.currency, reason);
  }
  notify.transferFailed(listing.buyerUserId, reason);
  res.json({ ok: true });
});

router.post("/listings/:id/verify", verifyCsrf, (req, res) => {
  const listing = store.listings.find((l) => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: "not_found" });
  store.listings.update((l) => l.id === listing.id, {
    verification: { state: "verified", at: new Date().toISOString(), by: req.user.id },
  });
  notify.listingVerified(listing.sellerUserId, listing);
  res.json({ ok: true });
});

router.post("/requests/:id/resolve", verifyCsrf, (req, res) => {
  const row = store.requests.find((r) => r.id === req.params.id);
  if (!row) return res.status(404).json({ error: "not_found" });
  const resolution = ((req.body && req.body.resolution) || "").trim();
  store.requests.update((r) => r.id === row.id, {
    status: "resolved",
    resolution,
    resolved_at: new Date().toISOString(),
  });
  const updated = store.requests.find((r) => r.id === row.id);
  notify.changeRequestResolved(row.userId, updated);
  res.json({ request: updated });
});

router.get("/reports/summary", (req, res) => {
  const range = reports.parseRange(req.query);
  res.json(reports.summary(range));
});

router.get("/reports/export", (req, res) => {
  const range = reports.parseRange(req.query);
  const kind = req.query.kind || "bookings";
  let csv = "";
  let name = "export.csv";
  if (kind === "marketplace") {
    csv = reports.marketplaceCSV(range);
    name = "marketplace.csv";
  } else if (kind === "ledger") {
    csv = reports.ledgerCSV(range);
    name = "escrow-ledger.csv";
  } else {
    csv = reports.bookingsCSV(range);
    name = "bookings.csv";
  }
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  res.send(csv);
});

router.get("/settlements", (req, res) => {
  res.json({
    rail: settlementRail.settlementStatus(),
    checkout_mode: config.checkoutMode,
    settlements: settlementRail.listLocalSettlements(50),
  });
});

router.get("/settlements/pnr/:locator", async (req, res) => {
  try {
    const result = await settlementRail.lookupPnr(req.params.locator);
    res.json(result);
  } catch (e) {
    res.status(502).json({ error: "pnr_lookup_failed", message: e.message });
  }
});

module.exports = router;
