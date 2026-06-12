const { enabled } = require("./registry");
const { decorateOffers } = require("../lib/merchandising");
const duffel = require("../lib/duffel");

/** Pure supplier merge rules — markup net fares and tag fare_type for merchandising. */
function applySupplierRules(offer, supplierId) {
  const markup = supplierId === "skybird" ? 1.08 : 1;
  return {
    ...offer,
    supplier: offer.supplier || supplierId,
    total_amount: String(Math.round(Number(offer.total_amount) * markup)),
    fare_type: supplierId === "skybird" ? "net" : offer.fare_type || "published",
  };
}

async function search(payload, opts = {}) {
  const sources = enabled();
  const results = await Promise.all(
    sources.map(async (s) => {
      try {
        const offers = await s.adapter.search(payload);
        return offers.map((o) => applySupplierRules(o, s.id));
      } catch (e) {
        console.warn(`[aggregator] ${s.id} failed:`, e.message);
        return [];
      }
    })
  );

  let offers = results.flat();
  if (!offers.length && !duffel.isConfigured()) {
    const demo = await duffel.search(payload);
    return {
      demo: true,
      offers: decorateOffers(demo.offers, opts),
      currency: demo.currency,
      passengers: demo.passengers,
    };
  }

  offers.sort((a, b) => Number(a.total_amount) - Number(b.total_amount));
  offers = decorateOffers(offers, opts);

  const currency = offers[0]?.total_currency || "USD";
  const passengers = duffel.demoPassengers(payload);
  return { demo: !duffel.isConfigured(), offers, currency, passengers };
}

module.exports = { search, applySupplierRules };
