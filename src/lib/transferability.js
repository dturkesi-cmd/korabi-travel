const config = require("../config");

const AIRLINES = {
  FR: { iata: "FR", name: "Ryanair", min_cutoff_hours: 6, transfer_fee_note: "Name change fee ~€115 per passenger", policy_verify: true },
  U2: { iata: "U2", name: "easyJet", min_cutoff_hours: 6, transfer_fee_note: "Name change fee per easyJet fare rules", policy_verify: true },
  W6: { iata: "W6", name: "Wizz Air", min_cutoff_hours: 6, transfer_fee_note: "Name change fee per Wizz policy", policy_verify: true },
  VY: { iata: "VY", name: "Vueling", min_cutoff_hours: 6, transfer_fee_note: "Name change fee per Vueling policy", policy_verify: true },
  F9: { iata: "F9", name: "Frontier", min_cutoff_hours: 24, transfer_fee_note: "Name change fee per Frontier policy", policy_verify: true },
  NK: { iata: "NK", name: "Spirit", min_cutoff_hours: 24, transfer_fee_note: "Name change fee per Spirit policy", policy_verify: true },
  Y4: { iata: "Y4", name: "Volaris", min_cutoff_hours: 6, transfer_fee_note: "Name change fee per Volaris policy", policy_verify: true },
};

function policy(iata) {
  return AIRLINES[iata] || null;
}

function isTransferable(iata) {
  return Boolean(AIRLINES[iata]);
}

function cutoffMs(iata) {
  const p = policy(iata);
  const hours = Math.max(config.marketplaceCutoffHours, p ? p.min_cutoff_hours : config.marketplaceCutoffHours);
  return hours * 3600 * 1000;
}

function hoursUntilDeparture(iso) {
  return new Date(iso).getTime() - Date.now();
}

function canList({ airline_iata, departing_at }) {
  if (!isTransferable(airline_iata)) {
    return { ok: false, reason: "This airline does not permit name transfers through resale." };
  }
  if (hoursUntilDeparture(departing_at) < cutoffMs(airline_iata)) {
    return { ok: false, reason: "Too close to departure — listing cutoff has passed." };
  }
  return { ok: true };
}

function canBuy({ airline_iata, departing_at }) {
  return canList({ airline_iata, departing_at });
}

module.exports = { AIRLINES, policy, isTransferable, cutoffMs, canList, canBuy };
