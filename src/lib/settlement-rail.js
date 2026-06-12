/**
 * Shteg R09 Anti-ARC settlement seam — post-ticket FedNow direct rail.
 *
 * Korabi books via Duffel (L1 distribution), then optionally dispatches
 * per-ticket settlement to a Shteg gateway (L4 direct / R09).
 *
 * Env:
 *   SHTEG_API_BASE_URL   — e.g. https://api.shteg.ai or http://127.0.0.1:3000
 *   SHTEG_API_BEARER     — Firebase ID token or service bearer for requireAuth routes
 *   SHTEG_SETTLEMENT_MODE — off | sandbox | live (default: sandbox when base URL set)
 *   SHTEG_AGENCY_ID      — OTA entity id for ARC TDR fallback
 *   SHTEG_ARC_NUMBER     — optional ARC number for hybrid ARC/report path
 */
const crypto = require("crypto");
const config = require("../config");
const store = require("../db/store");

/** Subset aligned with Shteg travelHub.js KNOWN_IATA_CARRIERS */
const R09_CARRIERS = new Set([
  "AA", "UA", "DL", "WN", "AS", "B6", "NK", "F9", "G4", "HA",
  "BA", "LH", "AF", "KL", "IB", "TP", "AY", "AC", "WS",
  "FR", "U2", "W6", "VY", "EI", "LX", "OS", "SK", "SN",
  "SQ", "CX", "QF", "JL", "NH", "KE", "EK", "QR", "TK",
]);

const PNR_RE = /^[A-Z0-9]{5,6}$/;

function hashPnr(pnr) {
  return crypto
    .createHash("sha256")
    .update(`SHTEG-R09-PNR:${pnr}`)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();
}

function extractItinerary(offer) {
  if (!offer || !offer.slices || !offer.slices.length) return null;
  const sl = offer.slices[0];
  const seg = sl.segments && sl.segments[0];
  const carrier =
    (offer.owner && offer.owner.iata_code) ||
    (seg && seg.marketing_carrier) ||
    null;
  const origin = sl.origin || (seg && seg.origin);
  const destination = sl.destination || (seg && seg.destination);
  const departDate = seg && seg.departing_at
    ? String(seg.departing_at).slice(0, 10)
    : new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  return { carrier, origin, destination, departDate, airlineName: (offer.owner && offer.owner.name) || carrier };
}

function normalizePnr(ref) {
  const up = String(ref || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  if (PNR_RE.test(up)) return up;
  return up.padEnd(6, "0").slice(0, 6);
}

function isR09Eligible(carrier) {
  return Boolean(carrier && R09_CARRIERS.has(String(carrier).toUpperCase()));
}

function settlementStatus() {
  const mode = config.shtegSettlementMode;
  return {
    enabled: mode !== "off",
    mode,
    base_url: config.shtegBaseUrl || null,
    bearer_configured: Boolean(config.shtegBearer),
    hybrid: {
      r09_direct: true,
      arc_fallback: Boolean(config.shtegArcNumber),
    },
    checkout_mode: config.checkoutMode,
  };
}

function buildSettlePayload({ pnr, offer, amountCents, ticketNumber }) {
  const itin = extractItinerary(offer);
  if (!itin || !itin.carrier || !itin.origin || !itin.destination) {
    return { ok: false, error: "missing_itinerary" };
  }
  const carrier = String(itin.carrier).toUpperCase();
  if (!isR09Eligible(carrier)) {
    return { ok: false, error: "carrier_not_r09", carrier };
  }
  const pnrNorm = normalizePnr(pnr);
  return {
    ok: true,
    payload: {
      pnr: pnrNorm,
      carrier,
      origin: String(itin.origin).toUpperCase().slice(0, 3),
      destination: String(itin.destination).toUpperCase().slice(0, 3),
      departDate: itin.departDate,
      amountCents,
      airlineName: itin.airlineName || carrier,
      ticketNumber: ticketNumber || null,
    },
    pnrHash: hashPnr(pnrNorm),
  };
}

function shtegBase() {
  return (config.shtegBaseUrl || "").replace(/\/+$/, "");
}

async function callShtegGet(path) {
  const base = shtegBase();
  if (!base) return null;
  const headers = { Accept: "application/json" };
  if (config.shtegBearer) headers.Authorization = `Bearer ${config.shtegBearer}`;
  const res = await fetch(`${base}${path}`, { headers });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(json.error || json.message || `Shteg GET ${path} HTTP ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function callShteg(path, body, idempotencyKey) {
  const base = shtegBase();
  if (!base) throw new Error("SHTEG_API_BASE_URL not configured");
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (config.shtegBearer) headers.Authorization = `Bearer ${config.shtegBearer}`;
  if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;

  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(json.error || json.message || `Shteg ${path} HTTP ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

function sandboxReceipt(parsed, bookingId) {
  const { pnrHash, carrier, origin, destination, departDate, amountCents, airlineName } = parsed.payload;
  return {
    ok: true,
    path: "R09_SANDBOX",
    mode: "SANDBOX",
    settlementId: `FEDNOW-R09-${carrier}-${pnrHash}-${Date.now()}`,
    pnrHash,
    carrier,
    route: `${origin}-${destination}`,
    departDate,
    amountCents,
    amountUSD: (amountCents / 100).toFixed(2),
    airlineName,
    txSts: "ACSC",
    settled: true,
    settledAt: new Date().toISOString(),
    bookingId,
    disclaimer: "Korabi sandbox — no real FedNow transfer. Wire SHTEG_API_BASE_URL for gateway dispatch.",
    antiArc: {
      bypassType: "DIRECT_FEDNOW",
      settlementSpeed: "INSTANT",
      batchWindow: "NONE",
    },
  };
}

async function reportArcFallback({ booking, amountCents, pnr, carrier }) {
  if (!config.shtegArcNumber || !config.shtegAgencyId) return null;
  try {
    return await callShteg("/api/airline/arc/report", {
      arcNumber: config.shtegArcNumber,
      agencyId: config.shtegAgencyId,
      type: "SALE",
      amountCents,
      pnr,
      carrier,
      ticketNumber: booking.orderId || booking.reference,
      sourceRef: booking.id,
      metadata: { path: "KORABI_HYBRID_ARC_FALLBACK" },
    });
  } catch (e) {
    return { ok: false, error: e.message, path: "ARC_REPORT_FAILED" };
  }
}

/**
 * After a confirmed Korabi booking, route settlement:
 *   R09-eligible carrier → /api/airline/direct/settle (or local sandbox)
 *   else → optional ARC TDR report when arcNumber configured
 */
async function settleAfterBooking({ booking, offer, order }) {
  const mode = config.shtegSettlementMode;
  if (mode === "off") {
    return { ok: true, path: "skipped", reason: "settlement_off" };
  }

  const amountCents = Math.round(Number(booking.total_amount) * 100);
  const pnr = order.booking_reference || booking.reference;
  const built = buildSettlePayload({
    pnr,
    offer,
    amountCents,
    ticketNumber: order.id || booking.orderId,
  });

  if (!built.ok) {
    if (built.error === "carrier_not_r09" && config.shtegArcNumber) {
      const arc = await reportArcFallback({
        booking,
        amountCents,
        pnr: normalizePnr(pnr),
        carrier: built.carrier,
      });
      return {
        ok: true,
        path: "arc_fallback",
        carrier: built.carrier,
        arc,
      };
    }
    return { ok: true, path: "skipped", reason: built.error, carrier: built.carrier || null };
  }

  const idempotencyKey = `korabi-${booking.id}-${built.pnrHash}`;

  if (mode === "sandbox" || !config.shtegBaseUrl || !config.shtegBearer) {
    return sandboxReceipt(built, booking.id);
  }

  try {
    const receipt = await callShteg(
      "/api/airline/direct/settle",
      {
        ...built.payload,
        idempotencyKey,
        otaEntityId: config.shtegAgencyId || "korabi",
      },
      idempotencyKey
    );
    return {
      ok: true,
      path: "r09_direct",
      receipt,
    };
  } catch (e) {
    if (config.shtegArcNumber) {
      const arc = await reportArcFallback({
        booking,
        amountCents,
        pnr: built.payload.pnr,
        carrier: built.payload.carrier,
      });
      return {
        ok: false,
        path: "r09_failed_arc_fallback",
        error: e.message,
        arc,
      };
    }
    throw e;
  }
}

async function refundSettlement({ settlementId, reason, amountCents }) {
  if (config.shtegSettlementMode === "off") {
    return { ok: true, path: "skipped", reason: "settlement_off" };
  }
  if (!settlementId) return { ok: false, error: "settlementId required" };

  if (config.shtegSettlementMode === "sandbox" || !shtegBase() || !config.shtegBearer) {
    return {
      ok: true,
      path: "R09_REFUND_SANDBOX",
      refundId: `R09-REFUND-${Date.now()}`,
      originalSettlementId: settlementId,
      status: "REFUND_QUEUED",
      note: "Instant FedNow return simulated — wire SHTEG_API_BASE_URL for live pacs.004.",
    };
  }

  return callShteg("/api/travel/refund", {
    settlementId,
    reason: reason || "Customer cancellation",
    amountCents,
  });
}

function persistSettlementOnBooking(bookingId, settlement, extra = {}) {
  if (!settlement) return null;
  let sid = settlement.settlementId;
  if (!sid && settlement.receipt) {
    sid = settlement.receipt.settlementId || settlement.receipt.receipt?.settlementId;
  }
  if (!sid) return null;
  const patch = {
    settlement_id: sid,
    settlement_path: settlement.path || null,
    pnr_hash: settlement.pnrHash || null,
    ...extra,
  };
  store.bookings.update((x) => x.id === bookingId, patch);
  return { ...patch, settlement_id: sid };
}

function listLocalSettlements(limit = 50) {
  return store.bookings
    .all()
    .filter((b) => b.settlement_id)
    .slice(-limit)
    .reverse()
    .map((b) => ({
      booking_id: b.id,
      reference: b.reference,
      route: b.route,
      total_amount: b.total_amount,
      total_currency: b.total_currency,
      status: b.status,
      settlement_id: b.settlement_id,
      settlement_path: b.settlement_path,
      pnr_hash: b.pnr_hash || hashPnr(normalizePnr(b.reference)),
      checkout_path: b.checkout_path || "korabi_split",
      settlement_refund: b.settlement_refund || null,
      created_at: b.created_at,
    }));
}

function lookupPnrLocal(locator) {
  const norm = normalizePnr(locator);
  const pnrHash = hashPnr(norm);
  const bookings = store.bookings.all().filter((b) => {
    const bNorm = normalizePnr(b.reference);
    return bNorm === norm || hashPnr(bNorm) === pnrHash;
  });
  return { pnrHash, locator: norm, bookings };
}

async function lookupPnr(locator) {
  const local = lookupPnrLocal(locator);
  let remote = null;
  if (shtegBase() && config.shtegBearer) {
    try {
      remote = await callShtegGet(`/api/travel/pnr/${encodeURIComponent(local.locator)}`);
    } catch (e) {
      remote = { ok: false, error: e.message };
    }
  }
  return { ...local, remote, rail: settlementStatus() };
}

/**
 * Single-call Shteg gds/book-and-settle (L1 book + L3/L4 settle).
 * Falls back to korabi_split when Shteg is unavailable.
 */
async function bookAndSettleAtomic({ offer_id, passengers, total_amount, total_currency, offer, duffelCreateOrder }) {
  const canLive =
    config.checkoutMode === "shteg_atomic" &&
    config.shtegSettlementMode === "live" &&
    shtegBase() &&
    config.shtegBearer &&
    !String(offer_id).startsWith("off_demo_");

  if (canLive) {
    const idempotencyKey = `korabi-atomic-${offer_id}-${Date.now()}`;
    const receipt = await callShteg(
      "/api/airline/gds/book-and-settle",
      {
        agencyId: config.shtegAgencyId,
        arcNumber: config.shtegArcNumber || undefined,
        offerId: offer_id,
        passengers,
        recordArcTdr: Boolean(config.shtegArcNumber),
      },
      idempotencyKey
    );
    const order = {
      id: receipt.duffelOrderId || receipt.receipt?.duffelOrderId,
      booking_reference: receipt.airlinePnr || receipt.receipt?.airlinePnr,
      total_amount,
      total_currency,
    };
    return {
      ok: true,
      checkout_path: "shteg_atomic",
      demo: false,
      order,
      settlement: {
        ok: true,
        path: "shteg_atomic",
        settlementId: receipt.fednowTxId || receipt.receipt?.fednowTxId,
        receipt,
      },
    };
  }

  // Sandbox atomic: Korabi Duffel book + R09 settle in one logical transaction
  const result = await duffelCreateOrder();
  const settlement = await settleAfterBooking({
    booking: {
      id: "pending",
      total_amount: Number(total_amount),
      reference: result.order.booking_reference,
      orderId: result.order.id,
    },
    offer,
    order: result.order,
  });
  return {
    ok: true,
    checkout_path: "shteg_atomic_sandbox",
    demo: result.demo,
    order: result.order,
    settlement,
  };
}

module.exports = {
  R09_CARRIERS,
  hashPnr,
  normalizePnr,
  isR09Eligible,
  extractItinerary,
  buildSettlePayload,
  settlementStatus,
  settleAfterBooking,
  refundSettlement,
  persistSettlementOnBooking,
  listLocalSettlements,
  lookupPnrLocal,
  lookupPnr,
  bookAndSettleAtomic,
};
