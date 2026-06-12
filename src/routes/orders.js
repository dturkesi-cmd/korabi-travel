const router = require("express").Router();
const config = require("../config");
const store = require("../db/store");
const duffel = require("../lib/duffel");
const notify = require("../lib/notify");
const bookingPayments = require("../lib/booking-payments");
const settlementRail = require("../lib/settlement-rail");
const { verifyCsrf } = require("../middleware/csrf");

router.post("/", verifyCsrf, async (req, res) => {
  const b = req.body || {};
  if (!b.offer_id || !b.passengers || !b.total_amount || !b.payment_intent_id) {
    return res.status(400).json({
      error: "bad_order",
      message: "offer_id, passengers, total_amount, and payment_intent_id required.",
    });
  }
  try {
    const payment = await bookingPayments.assertReadyForOrder({
      payment_intent_id: b.payment_intent_id,
      offer_id: b.offer_id,
      amount: b.total_amount,
      currency: b.total_currency || "USD",
    });

    const cached = store.offerCache.get(b.offer_id);
    const route = cached
      ? `${cached.slices[0].origin} → ${cached.slices[0].destination}`
      : "Flight";

    let result;
    let settlement = null;
    let checkoutPath = "korabi_split";

    if (config.checkoutMode === "shteg_atomic") {
      const atomic = await settlementRail.bookAndSettleAtomic({
        offer_id: b.offer_id,
        passengers: b.passengers,
        total_amount: b.total_amount,
        total_currency: b.total_currency || "USD",
        offer: cached,
        duffelCreateOrder: () =>
          duffel.createOrder({
            offer_id: b.offer_id,
            passengers: b.passengers,
            services: b.services || [],
            total_amount: b.total_amount,
            total_currency: b.total_currency || "USD",
            payment_intent_id: payment.external_id || payment.id,
          }),
      });
      result = { demo: atomic.demo, order: atomic.order };
      settlement = atomic.settlement;
      checkoutPath = atomic.checkout_path;
    } else {
      result = await duffel.createOrder({
        offer_id: b.offer_id,
        passengers: b.passengers,
        services: b.services || [],
        total_amount: b.total_amount,
        total_currency: b.total_currency || "USD",
        payment_intent_id: payment.external_id || payment.id,
      });
      try {
        settlement = await settlementRail.settleAfterBooking({
          booking: {
            id: "pending",
            total_amount: Number(b.total_amount),
            reference: result.order.booking_reference,
            orderId: result.order.id,
          },
          offer: cached,
          order: result.order,
        });
      } catch (settleErr) {
        console.warn("[orders] settlement rail:", settleErr.message);
        settlement = { ok: false, error: settleErr.message };
      }
    }

    bookingPayments.markConsumed(payment.id);

    const earn = Math.round(Number(b.total_amount) * config.loyaltyEarnPct / 100);
    const booking = {
      id: store.id("bk"),
      userId: req.user ? req.user.id : null,
      orderId: result.order.id,
      reference: result.order.booking_reference,
      route,
      status: "confirmed",
      total_amount: Number(b.total_amount),
      total_currency: b.total_currency || "USD",
      passenger_names: b.passengers.map((p) => `${p.given_name} ${p.family_name}`),
      korabi_cash_earned: req.user ? earn : 0,
      source: result.demo ? "demo" : "duffel",
      payment_intent_id: payment.id,
      checkout_path: checkoutPath,
      created_at: new Date().toISOString(),
    };
    store.bookings.create(booking);

    if (settlement) {
      settlementRail.persistSettlementOnBooking(booking.id, settlement, { checkout_path: checkoutPath });
      const updated = store.bookings.find((x) => x.id === booking.id);
      if (updated) {
        booking.settlement_id = updated.settlement_id;
        booking.settlement_path = updated.settlement_path;
        booking.pnr_hash = updated.pnr_hash;
      }
    }

    if (req.user && earn > 0) {
      store.users.addKorabiCash(req.user.id, earn);
      notify.bookingConfirmed(req.user.id, booking);
    }

    res.json({
      order: result.order,
      booking,
      demo: result.demo,
      payment_intent_id: payment.id,
      checkout_path: checkoutPath,
      settlement,
    });
  } catch (e) {
    res.status(502).json({ error: "order_failed", message: e.message });
  }
});

module.exports = router;
