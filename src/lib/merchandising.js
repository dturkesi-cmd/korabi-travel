const config = require("../config");

const durMin = (o) =>
  (o.slices || []).reduce((s, sl) => {
    const m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(sl.duration || "");
    return s + (m ? Number(m[1] || 0) * 60 + Number(m[2] || 0) : 0);
  }, 0);

const stopsOf = (o) => (o.slices || []).reduce((s, sl) => s + (sl.stops || 0), 0);

function decorateOffers(offers, { user } = {}) {
  if (!offers.length) return offers;
  const prices = offers.map((o) => Number(o.total_amount));
  const durs = offers.map(durMin);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const minD = Math.min(...durs);
  const maxD = Math.max(...durs);
  const norm = (v, lo, hi) => (hi > lo ? (v - lo) / (hi - lo) : 0);

  let bestIdx = 0;
  let best = Infinity;
  offers.forEach((o, i) => {
    const sc = 0.6 * norm(prices[i], minP, maxP) + 0.3 * norm(durs[i], minD, maxD) + 0.1 * Math.min(1, stopsOf(o) / 3);
    if (sc < best) {
      best = sc;
      bestIdx = i;
    }
  });
  const fastIdx = durs.indexOf(minD);

  return offers.map((o, i) => {
    const badges = [];
    if (Number(o.total_amount) === minP) badges.push("Cheapest");
    if (i === fastIdx) badges.push("Fastest");
    if (stopsOf(o) === 0) badges.push("Nonstop");
    if (i === bestIdx) badges.push("Best value");
    if (o.fare_type === "net") badges.push("Net fare");

    const base = Number(o.total_amount);
    let memberPrice = base;
    let memberSave = 0;
    if (user && config.memberDiscountPct > 0) {
      memberSave = Math.round(base * config.memberDiscountPct / 100);
      memberPrice = Math.max(0, base - memberSave);
    }
    const loyaltyEarn = Math.round((user ? memberPrice : base) * config.loyaltyEarnPct / 100);

    return {
      ...o,
      merch: {
        badges,
        member_price: memberPrice,
        member_save: user ? memberSave : 0,
        loyalty_earn: loyaltyEarn,
        loyalty_pct: config.loyaltyEarnPct,
      },
    };
  });
}

module.exports = { decorateOffers, durMin, stopsOf };
