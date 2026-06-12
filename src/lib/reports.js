/**
 * Operational reporting for the desk: period summaries + CSV exports
 * (bookings, marketplace, escrow ledger) suitable for ARC reconciliation.
 * Summary totals sum across currencies numerically for an at-a-glance view —
 * the CSVs carry per-row currency for proper per-currency reconciliation.
 */
const store = require("../db/store");

const round2 = (n) => Math.round(Number(n) * 100) / 100;

function parseRange(q = {}) {
  const from = q.from ? new Date(q.from + "T00:00:00Z").getTime() : undefined;
  const to = q.to ? new Date(q.to + "T23:59:59Z").getTime() : undefined;
  return { from: isNaN(from) ? undefined : from, to: isNaN(to) ? undefined : to };
}
function inRange(iso, { from, to } = {}) {
  const t = new Date(iso).getTime();
  return (!from || t >= from) && (!to || t <= to);
}
const sum = (arr, f) => round2(arr.reduce((s, x) => s + Number(x[f] || 0), 0));

function summary(range = {}) {
  const bk = store.bookings.all().filter((b) => inRange(b.created_at, range));
  const ls = store.listings.all().filter((l) => inRange(l.created_at, range));
  const pm = store.payments.all().filter((p) => inRange(p.created_at, range));
  const rel = pm.filter((p) => p.state === "released");
  return {
    bookings: {
      count: bk.length, gross: sum(bk, "total_amount"),
      cancelled: bk.filter((b) => b.status === "cancelled").length,
      korabi_cash_issued: sum(bk, "korabi_cash_earned"),
    },
    marketplace: {
      listings: ls.length, sold: ls.filter((l) => l.status === "sold").length,
      gmv: sum(rel, "amount"), commission: sum(rel, "commission"), payouts: sum(rel, "payout"),
      refunded: sum(pm.filter((p) => p.state === "refunded"), "amount"),
      escrow_held: sum(pm.filter((p) => p.state === "held"), "amount"),
    },
  };
}

function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCSV(cols, rows) {
  return [cols.join(",")].concat(rows.map((r) => cols.map((c) => csvEscape(r[c])).join(","))).join("\n") + "\n";
}
const emailOf = (id) => { const u = store.users.findById(id); return u ? u.email : ""; };

function bookingsCSV(range = {}) {
  const rows = store.bookings.all().filter((b) => inRange(b.created_at, range)).map((b) => ({
    id: b.id, created_at: b.created_at, status: b.status, route: b.route, reference: b.reference,
    order_id: b.orderId || "", total_amount: b.total_amount, currency: b.total_currency,
    user_email: emailOf(b.userId), korabi_cash_earned: b.korabi_cash_earned || 0, source: b.source,
    refund_amount: (b.refund && b.refund.amount) || "",
  }));
  return toCSV(["id","created_at","status","route","reference","order_id","total_amount","currency","user_email","korabi_cash_earned","source","refund_amount"], rows);
}
function marketplaceCSV(range = {}) {
  const rows = store.listings.all().filter((l) => inRange(l.created_at, range)).map((l) => ({
    id: l.id, created_at: l.created_at, status: l.status,
    airline: l.airline ? l.airline.name : "", origin: l.origin, destination: l.destination,
    departing_at: l.departing_at, asking_price: l.asking_price, currency: l.currency,
    seller_email: emailOf(l.sellerUserId), buyer_email: emailOf(l.buyerUserId),
    escrow_state: (l.escrow && l.escrow.state) || "", commission: (l.escrow && l.escrow.commission) || "",
    payout: (l.escrow && l.escrow.payout) || "", verification: (l.verification && l.verification.state) || "unverified",
  }));
  return toCSV(["id","created_at","status","airline","origin","destination","departing_at","asking_price","currency","seller_email","buyer_email","escrow_state","commission","payout","verification"], rows);
}
function ledgerCSV(range = {}) {
  const rows = store.payments.all().filter((p) => inRange(p.created_at, range)).map((p) => ({
    id: p.id, created_at: p.created_at, state: p.state, listing_id: p.listingId,
    seller_email: emailOf(p.sellerUserId), buyer_email: emailOf(p.buyerUserId),
    amount: p.amount, currency: p.currency, commission: p.commission, payout: p.payout,
    released_at: p.released_at || "", refunded_at: p.refunded_at || "", provider: p.provider,
  }));
  return toCSV(["id","created_at","state","listing_id","seller_email","buyer_email","amount","currency","commission","payout","released_at","refunded_at","provider"], rows);
}

module.exports = { parseRange, summary, bookingsCSV, marketplaceCSV, ledgerCSV, csvEscape };
