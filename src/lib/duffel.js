const config = require("../config");
const store = require("../db/store");

let client = null;

function getClient() {
  if (!config.duffelToken) return null;
  if (!client) {
    const { Duffel } = require("@duffel/api");
    client = new Duffel({ token: config.duffelToken });
  }
  return client;
}

function isConfigured() {
  return Boolean(config.duffelToken);
}

function buildPassengers({ adults = 1, children_ages = [] }) {
  const out = [];
  for (let i = 0; i < adults; i++) out.push({ type: "adult" });
  children_ages.forEach((age) => out.push({ type: age === 0 ? "infant_without_seat" : "child", age: Number(age) }));
  return out;
}

function demoOffers(payload) {
  const airlines = [
    ["British Airways", "BA"],
    ["TAP Air Portugal", "TP"],
    ["Lufthansa", "LH"],
    ["KLM", "KL"],
    ["Iberia", "IB"],
    ["Finnair", "AY"],
  ];
  const paxN = payload.adults + (payload.children_ages ? payload.children_ages.length : 0);

  function seg(o, d, dep, dur, carrier) {
    const depT = new Date(`${payload.departure_date}T${dep}:00`);
    const arr = new Date(depT.getTime() + dur * 60000);
    return {
      origin: o,
      destination: d,
      departing_at: depT.toISOString(),
      arriving_at: arr.toISOString(),
      operating_carrier: carrier,
      marketing_carrier: carrier,
      flight_number: String(100 + Math.floor(Math.random() * 800)),
    };
  }

  function addMin(hhmm, min) {
    const p = hhmm.split(":");
    const t = Number(p[0]) * 60 + Number(p[1]) + min;
    const wrapped = ((t % 1440) + 1440) % 1440;
    return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
  }

  function slice(o, d, stops, baseDep, carrier) {
    let segs;
    let totalDur;
    if (stops === 0) {
      totalDur = 130 + Math.floor(Math.random() * 120);
      segs = [seg(o, d, baseDep, totalDur, carrier)];
    } else {
      const hub = ["MAD", "CDG", "AMS", "FRA", "LIS"][Math.floor(Math.random() * 5)];
      const d1 = 80 + Math.floor(Math.random() * 60);
      const d2 = 90 + Math.floor(Math.random() * 80);
      totalDur = d1 + 80 + d2;
      segs = [seg(o, hub, baseDep, d1, carrier), seg(hub, d, addMin(baseDep, d1 + 80), d2, carrier)];
    }
    return {
      origin: o,
      destination: d,
      stops,
      duration: `PT${Math.floor(totalDur / 60)}H${totalDur % 60}M`,
      segments: segs,
    };
  }

  const out = [];
  for (let i = 0; i < 6; i++) {
    const a = airlines[i % airlines.length];
    const stops = i < 2 ? 0 : i < 4 ? 0 : 1;
    const base = (7 + i * 2) % 24;
    const dep = `${String(base).padStart(2, "0")}:${["05", "20", "35", "50"][i % 4]}`;
    const price = Math.round((180 + i * 65 + Math.random() * 90) * paxN);
    const slices = [slice(payload.origin, payload.destination, stops, dep, a[0])];
    if (payload.return_date) slices.push(slice(payload.destination, payload.origin, stops, addMin(dep, 180), a[0]));
    const offer = {
      id: `off_demo_${i}_${Date.now()}`,
      total_amount: String(price),
      total_currency: "USD",
      cabin_class: payload.cabin_class || "economy",
      owner: { name: a[0], iata_code: a[1], logo: null },
      slices,
      expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
      supplier: "demo",
    };
    store.offerCache.set(offer.id, offer);
    out.push(offer);
  }
  return out;
}

function demoPassengers(payload) {
  const arr = [];
  for (let i = 0; i < payload.adults; i++) arr.push({ id: `pax_a${i}`, type: "adult" });
  (payload.children_ages || []).forEach((age, i) => arr.push({ id: `pax_c${i}`, type: "child", age }));
  return arr;
}

async function search(payload) {
  const duffel = getClient();
  if (!duffel) {
    const offers = demoOffers(payload);
    return { demo: true, offers, currency: "USD", passengers: demoPassengers(payload) };
  }

  const slices = [{ origin: payload.origin, destination: payload.destination, departure_date: payload.departure_date }];
  if (payload.return_date) slices.push({ origin: payload.destination, destination: payload.origin, departure_date: payload.return_date });

  const passengers = buildPassengers(payload);
  const offerRequest = await duffel.offerRequests.create({
    slices,
    passengers,
    cabin_class: payload.cabin_class || "economy",
    return_offers: true,
  });

  const offers = (offerRequest.data.offers || []).map((o) => {
    const normalized = {
      id: o.id,
      total_amount: o.total_amount,
      total_currency: o.total_currency,
      cabin_class: o.slices[0]?.fare_brand_name || payload.cabin_class,
      owner: o.owner,
      slices: o.slices.map((sl) => ({
        origin: sl.origin.iata_code,
        destination: sl.destination.iata_code,
        stops: (sl.segments.length || 1) - 1,
        duration: sl.duration,
        segments: sl.segments.map((sg) => ({
          origin: sg.origin.iata_code,
          destination: sg.destination.iata_code,
          departing_at: sg.departing_at,
          arriving_at: sg.arriving_at,
          operating_carrier: sg.operating_carrier?.name || sg.marketing_carrier?.name,
          marketing_carrier: sg.marketing_carrier?.iata_code,
          flight_number: sg.marketing_carrier_flight_number,
        })),
      })),
      expires_at: o.expires_at,
      supplier: "duffel",
      _raw: o,
    };
    store.offerCache.set(o.id, normalized);
    return normalized;
  });

  const paxMeta = passengers.map((p, i) => ({ id: `pax_${i}`, type: p.type, age: p.age }));
  return {
    demo: false,
    offers,
    currency: offers[0]?.total_currency || "USD",
    passengers: paxMeta,
    live_mode: !String(config.duffelToken).startsWith("duffel_test"),
  };
}

async function getOffer(offerId) {
  const cached = store.offerCache.get(offerId);
  if (cached && String(offerId).startsWith("off_demo_")) {
    return {
      offer: cached,
      cfar: { id: null, amount: Math.round(Number(cached.total_amount) * 0.08), currency: cached.total_currency },
      extra_bags_available: true,
    };
  }
  const duffel = getClient();
  if (!duffel) return cached ? { offer: cached } : null;
  try {
    const { data: offer } = await duffel.offers.get(offerId);
    const cfarSvc = (offer.available_services || []).find((s) => /cancel/i.test(s.type || ""));
    return {
      offer: {
        id: offer.id,
        total_amount: offer.total_amount,
        total_currency: offer.total_currency,
        slices: offer.slices,
      },
      cfar: cfarSvc ? { id: cfarSvc.id, amount: Number(cfarSvc.total_amount), currency: offer.total_currency } : null,
      extra_bags_available: (offer.available_services || []).some((s) => /bag/i.test(s.type || "")),
    };
  } catch {
    return cached ? { offer: cached } : null;
  }
}

async function getSeatMaps(offerId) {
  if (String(offerId).startsWith("off_demo_")) return { available: false };
  const duffel = getClient();
  if (!duffel) return { available: false };
  try {
    const res = await duffel.seatMaps.get({ offer_id: offerId });
    return { available: (res.data || []).length > 0, seat_maps: res.data };
  } catch {
    return { available: false };
  }
}

async function getAncillaries(offerId) {
  const cached = store.offerCache.get(offerId);
  if (String(offerId).startsWith("off_demo_") || !getClient()) return { offer: cached, seat_maps: [] };
  const duffel = getClient();
  try {
    const { data: offer } = await duffel.offers.get(offerId);
    let seat_maps = [];
    try {
      const sm = await duffel.seatMaps.get({ offer_id: offerId });
      seat_maps = sm.data || [];
    } catch { /* optional */ }
    return { offer, seat_maps };
  } catch {
    return null;
  }
}

async function createOrder({ offer_id, passengers, services, total_amount, total_currency, payment_intent_id }) {
  if (String(offer_id).startsWith("off_demo_")) {
    const ref = "K" + Math.random().toString(36).slice(2, 8).toUpperCase();
    return {
      demo: true,
      order: {
        id: store.id("ord"),
        booking_reference: ref,
        total_amount,
        total_currency,
      },
    };
  }
  const duffel = getClient();
  if (!duffel) throw new Error("Duffel not configured");

  const paxPayload = passengers.map((p) => ({
    id: p.id,
    title: p.title,
    gender: p.gender,
    given_name: p.given_name,
    family_name: p.family_name,
    born_on: p.born_on,
    email: p.email,
    phone_number: p.phone_number,
  }));

  const { data: order } = await duffel.orders.create({
    selected_offers: [offer_id],
    passengers: paxPayload,
    services: services || [],
    type: "instant",
    payments: [{ type: "balance", amount: total_amount, currency: total_currency }],
    metadata: payment_intent_id ? { payment_intent_id: String(payment_intent_id) } : undefined,
  });

  return {
    demo: false,
    order: {
      id: order.id,
      booking_reference: order.booking_reference,
      total_amount: order.total_amount,
      total_currency: order.total_currency,
    },
  };
}

async function cancelQuote(orderId) {
  if (String(orderId).startsWith("ord_") || !getClient()) {
    return { simulated: true, refund_amount: "0", refund_currency: "USD", note: "Demo booking — no airline quote." };
  }
  const duffel = getClient();
  try {
    const { data: cxl } = await duffel.orderCancellations.create({ order_id: orderId });
    return {
      simulated: false,
      refund_amount: cxl.refund_amount,
      refund_currency: cxl.refund_currency,
      expires_at: cxl.expires_at,
      cancellation_id: cxl.id,
    };
  } catch (e) {
    return { simulated: true, refund_amount: "0", refund_currency: "USD", note: e.message };
  }
}

const FALLBACK_PLACES = [
  { iata_code: "LON", name: "London (all airports)", city: "London", country: "GB", type: "city" },
  { iata_code: "NYC", name: "New York (all airports)", city: "New York", country: "US", type: "city" },
  { iata_code: "PAR", name: "Paris (all airports)", city: "Paris", country: "FR", type: "city" },
  { iata_code: "LIS", name: "Lisbon Portela", city: "Lisbon", country: "PT", type: "airport" },
  { iata_code: "BCN", name: "Barcelona El Prat", city: "Barcelona", country: "ES", type: "airport" },
  { iata_code: "JFK", name: "John F. Kennedy", city: "New York", country: "US", type: "airport" },
  { iata_code: "LAX", name: "Los Angeles Intl", city: "Los Angeles", country: "US", type: "airport" },
  { iata_code: "DXB", name: "Dubai Intl", city: "Dubai", country: "AE", type: "airport" },
];

async function places(q) {
  const duffel = getClient();
  if (duffel) {
    try {
      const res = await duffel.suggestions.list({ query: q });
      return (res.data || []).slice(0, 8).map((p) => ({
        iata_code: p.iata_code,
        name: p.name,
        city: p.city_name,
        country: p.iata_country_code,
        type: p.type,
      }));
    } catch { /* fall through */ }
  }
  const s = q.toLowerCase();
  return FALLBACK_PLACES.filter((p) => `${p.name}${p.city}${p.iata_code}`.toLowerCase().includes(s)).slice(0, 6);
}

module.exports = {
  isConfigured,
  search,
  getOffer,
  getSeatMaps,
  getAncillaries,
  createOrder,
  cancelQuote,
  places,
  demoOffers,
  demoPassengers,
};
