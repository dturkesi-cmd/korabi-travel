/**
 * Clearly-labelled demo fares for B2B supplier stubs (no credentials yet).
 * Returned only when SUPPLIER_*_ENABLED=true so stacking can be exercised.
 */

function segment(origin, dest, departureDate, depTime, durationMin, carrier) {
  const depT = new Date(`${departureDate}T${depTime}:00`);
  const arr = new Date(depT.getTime() + durationMin * 60000);
  return {
    origin,
    destination: dest,
    departing_at: depT.toISOString(),
    arriving_at: arr.toISOString(),
    operating_carrier: carrier,
    marketing_carrier: carrier,
    flight_number: String(200 + Math.floor(Math.random() * 600)),
  };
}

function slice(origin, dest, departureDate, depTime, durationMin, carrier, stops = 0) {
  return {
    origin,
    destination: dest,
    stops,
    duration: `PT${Math.floor(durationMin / 60)}H${durationMin % 60}M`,
    segments: [segment(origin, dest, departureDate, depTime, durationMin, carrier)],
  };
}

function basePayload(payload) {
  return {
    origin: payload.origin || "JFK",
    destination: payload.destination || "LHR",
    departure_date: payload.departure_date || new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
    cabin_class: payload.cabin_class || "economy",
    adults: payload.adults || 1,
    children_ages: payload.children_ages || [],
  };
}

function paxCount(payload) {
  return payload.adults + (payload.children_ages ? payload.children_ages.length : 0);
}

function skybirdDemoOffers(rawPayload) {
  const payload = basePayload(rawPayload);
  const paxN = paxCount(payload);
  const offers = [
    {
      label: "Sky Bird net — DEMO",
      owner: { name: "Emirates", iata_code: "EK", logo: null },
      dep: "09:15",
      dur: 415,
      basePrice: 142,
      stops: 0,
    },
    {
      label: "Sky Bird net — DEMO",
      owner: { name: "Qatar Airways", iata_code: "QR", logo: null },
      dep: "22:40",
      dur: 455,
      basePrice: 128,
      stops: 1,
    },
  ];

  return offers.map((spec, i) => ({
    id: `off_skybird_demo_${i}_${Date.now()}`,
    total_amount: String(Math.round(spec.basePrice * paxN)),
    total_currency: "USD",
    cabin_class: payload.cabin_class,
    owner: spec.owner,
    slices: [
      slice(payload.origin, payload.destination, payload.departure_date, spec.dep, spec.dur, spec.owner.name, spec.stops),
    ],
    expires_at: new Date(Date.now() + 45 * 60000).toISOString(),
    supplier: "skybird",
    fare_type: "net",
    demo: true,
    demo_label: spec.label,
  }));
}

function vaxDemoOffers(rawPayload) {
  const payload = basePayload(rawPayload);
  const paxN = paxCount(payload);
  const offers = [
    {
      label: "VAX flight+hotel bundle — DEMO",
      owner: { name: "United", iata_code: "UA", logo: null },
      dep: "07:30",
      dur: 380,
      basePrice: 289,
      package_note: "Includes 4-night hotel — sample package fare",
    },
  ];

  return offers.map((spec, i) => ({
    id: `off_vax_demo_${i}_${Date.now()}`,
    total_amount: String(Math.round(spec.basePrice * paxN)),
    total_currency: "USD",
    cabin_class: payload.cabin_class,
    owner: spec.owner,
    slices: [slice(payload.origin, payload.destination, payload.departure_date, spec.dep, spec.dur, spec.owner.name, 0)],
    expires_at: new Date(Date.now() + 60 * 60000).toISOString(),
    supplier: "vax",
    fare_type: "package",
    demo: true,
    demo_label: spec.label,
    package_note: spec.package_note,
  }));
}

module.exports = { skybirdDemoOffers, vaxDemoOffers };
