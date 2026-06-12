const router = require("express").Router();
const config = require("../config");
const store = require("../db/store");
const payments = require("../lib/payments");
const notify = require("../lib/notify");
const transferability = require("../lib/transferability");
const { requireAuth } = require("../middleware/auth");
const { verifyCsrf } = require("../middleware/csrf");

router.get("/airlines", (_req, res) => {
  res.json({ airlines: Object.values(transferability.AIRLINES) });
});

router.get("/policy/:iata", (req, res) => {
  const p = transferability.policy(req.params.iata.toUpperCase());
  if (!p) return res.status(404).json({ error: "not_transferable" });
  res.json({ policy: p });
});

router.get("/listings", (req, res) => {
  const now = Date.now();
  let items = store.listings.all().filter((l) => l.status === "active");
  items = items.filter((l) => {
    const airline = l.airline && l.airline.iata;
    return new Date(l.departing_at).getTime() - now > transferability.cutoffMs(airline);
  });
  if (req.query.origin) items = items.filter((l) => l.origin === req.query.origin.toUpperCase());
  if (req.query.destination) items = items.filter((l) => l.destination === req.query.destination.toUpperCase());
  if (req.query.airline) items = items.filter((l) => l.airline && l.airline.iata === req.query.airline.toUpperCase());

  const sort = req.query.sort || "soonest";
  if (sort === "cheapest") items.sort((a, b) => a.asking_price - b.asking_price);
  else if (sort === "newest") items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  else items.sort((a, b) => new Date(a.departing_at) - new Date(b.departing_at));

  res.json({
    listings: items.map((l) => ({
      id: l.id,
      origin: l.origin,
      destination: l.destination,
      departing_at: l.departing_at,
      asking_price: l.asking_price,
      fare_paid: l.fare_paid,
      currency: l.currency,
      airline: l.airline,
      verification: l.verification,
      seller_masked: "••••",
    })),
  });
});

router.post("/listings", requireAuth, verifyCsrf, (req, res) => {
  const b = req.body || {};
  const airline_iata = (b.airline_iata || "").toUpperCase();
  const check = transferability.canList({ airline_iata, departing_at: b.departing_at });
  if (!check.ok) return res.status(400).json({ error: "not_eligible", message: check.reason });

  const policy = transferability.policy(airline_iata);
  const listing = {
    id: store.id("lst"),
    sellerUserId: req.user.id,
    buyerUserId: null,
    origin: (b.origin || "").toUpperCase(),
    destination: (b.destination || "").toUpperCase(),
    departing_at: b.departing_at,
    asking_price: Number(b.asking_price),
    fare_paid: Number(b.fare_paid || b.asking_price),
    currency: b.currency || "USD",
    airline: { iata: airline_iata, name: policy.name },
    pnr: b.pnr || "",
    eticket: b.eticket || null,
    orderId: b.orderId || null,
    status: "active",
    source: b.orderId ? "korabi" : "external",
    verification: b.orderId
      ? { state: "verified", at: new Date().toISOString(), note: "Auto-verified Korabi booking" }
      : { state: "pending" },
    created_at: new Date().toISOString(),
  };
  store.listings.create(listing);
  res.json({ listing });
});

router.post("/listings/:id/cancel", requireAuth, verifyCsrf, (req, res) => {
  const l = store.listings.find((x) => x.id === req.params.id && x.sellerUserId === req.user.id);
  if (!l) return res.status(404).json({ error: "not_found" });
  if (l.status !== "active") return res.status(400).json({ message: "Cannot cancel this listing." });
  store.listings.update((x) => x.id === l.id, { status: "cancelled" });
  res.json({ ok: true });
});

router.post("/listings/:id/buy", requireAuth, verifyCsrf, (req, res) => {
  const l = store.listings.find((x) => x.id === req.params.id && x.status === "active");
  if (!l) return res.status(404).json({ error: "not_found" });
  if (l.sellerUserId === req.user.id) return res.status(400).json({ message: "You cannot buy your own listing." });

  const check = transferability.canBuy({ airline_iata: l.airline.iata, departing_at: l.departing_at });
  if (!check.ok) return res.status(400).json({ message: check.reason });

  const passenger = req.body && req.body.passenger;
  if (!passenger || !passenger.given_name || !passenger.family_name) {
    return res.status(400).json({ message: "Buyer passenger name required." });
  }

  const pay = payments.hold({
    listingId: l.id,
    sellerUserId: l.sellerUserId,
    buyerUserId: req.user.id,
    amount: l.asking_price,
    currency: l.currency,
  });

  const commission = pay.commission;
  const payout = pay.payout;

  store.listings.update((x) => x.id === l.id, {
    status: "pending_transfer",
    buyerUserId: req.user.id,
    buyer_passenger: passenger,
    escrow: { state: "held", amount: l.asking_price, commission, payout, paymentId: pay.id },
    purchased_at: new Date().toISOString(),
  });

  const updated = store.listings.find((x) => x.id === l.id);
  notify.marketplaceSold(l.sellerUserId, updated);
  notify.marketplacePurchased(req.user.id, updated);
  res.json({ listing: updated, escrow: { simulated: true, provider: payments.PROVIDER } });
});

router.get("/mine", requireAuth, (req, res) => {
  const selling = store.listings.all().filter((l) => l.sellerUserId === req.user.id);
  const buying = store.listings.all().filter((l) => l.buyerUserId === req.user.id);
  res.json({ selling, buying });
});

module.exports = router;
