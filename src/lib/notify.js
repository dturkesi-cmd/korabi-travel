const config = require("../config");
const store = require("../db/store");

function sendEmailStub({ to, subject, body }) {
  console.log(`[email-stub] to=${to} subject=${subject}\n${body}\n---`);
}

function create(userId, { type, title, message, meta }) {
  const n = {
    id: store.id("ntf"),
    userId,
    type,
    title,
    message,
    meta: meta || {},
    read: false,
    created_at: new Date().toISOString(),
  };
  store.notifications.create(n);
  const user = store.users.findById(userId);
  if (user) sendEmailStub({ to: user.email, subject: title, body: message });
  return n;
}

function bookingConfirmed(userId, booking) {
  return create(userId, {
    type: "booking_confirmed",
    title: "Booking confirmed",
    message: `Your trip ${booking.route} is confirmed. Reference ${booking.reference}.`,
    meta: { bookingId: booking.id },
  });
}

function marketplaceSold(sellerId, listing) {
  return create(sellerId, {
    type: "marketplace_sold",
    title: "Your seat sold",
    message: `${listing.origin} → ${listing.destination} sold — transfer queued on the ARC desk.`,
    meta: { listingId: listing.id },
  });
}

function marketplacePurchased(buyerId, listing) {
  return create(buyerId, {
    type: "marketplace_purchased",
    title: "Purchase received",
    message: `Escrow held for ${listing.origin} → ${listing.destination}. We'll notify you when the ticket is re-issued.`,
    meta: { listingId: listing.id },
  });
}

function transferComplete(buyerId, listing, eticket) {
  return create(buyerId, {
    type: "ticket_ready",
    title: "Ticket ready",
    message: `Name change complete${eticket ? ` — e-ticket ${eticket}` : ""}. Safe travels!`,
    meta: { listingId: listing.id },
  });
}

function payoutReleased(sellerId, amount, currency) {
  return create(sellerId, {
    type: "payout_released",
    title: "Payout released",
    message: `${amount} ${currency} has been released to your payout method.`,
    meta: {},
  });
}

function refundIssued(buyerId, amount, currency, reason) {
  return create(buyerId, {
    type: "refund_issued",
    title: "Refund issued",
    message: `${amount} ${currency} refunded${reason ? `: ${reason}` : ""}.`,
    meta: {},
  });
}

function transferFailed(buyerId, reason) {
  return create(buyerId, {
    type: "transfer_failed",
    title: "Transfer failed",
    message: reason || "The airline could not complete the name change. Your payment was refunded.",
    meta: {},
  });
}

function listingVerified(sellerId, listing) {
  return create(sellerId, {
    type: "listing_verified",
    title: "Listing verified",
    message: `Your ${listing.origin} → ${listing.destination} listing is verified and live.`,
    meta: { listingId: listing.id },
  });
}

function cancellationConfirmed(userId, booking, refund, settlementRefund) {
  let extra = refund ? ` — refund ${refund.amount} ${refund.currency}` : "";
  if (settlementRefund && settlementRefund.ok && settlementRefund.path !== "skipped") {
    extra += settlementRefund.path.includes("SANDBOX")
      ? " · FedNow return queued (sandbox)"
      : " · instant FedNow return queued";
  }
  return create(userId, {
    type: "booking_cancelled",
    title: "Trip cancelled",
    message: `${booking.route} cancelled${extra}.`,
    meta: { bookingId: booking.id, settlement_refund: settlementRefund || null },
  });
}

function changeRequestResolved(userId, req) {
  return create(userId, {
    type: "change_resolved",
    title: "Change request resolved",
    message: req.resolution || "Your change request has been handled by the desk.",
    meta: { requestId: req.id },
  });
}

module.exports = {
  create,
  bookingConfirmed,
  marketplaceSold,
  marketplacePurchased,
  transferComplete,
  payoutReleased,
  refundIssued,
  transferFailed,
  listingVerified,
  cancellationConfirmed,
  changeRequestResolved,
  sendEmailStub,
};
