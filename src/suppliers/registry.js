const config = require("../config");
const duffelAdapter = require("./duffel.adapter");
const skybirdAdapter = require("./skybird.adapter");
const vaxAdapter = require("./vax.adapter");

const registry = [
  { id: "duffel", label: "Duffel", kind: "NDC/GDS retail", enabled: true, adapter: duffelAdapter },
  { id: "skybird", label: "Sky Bird", kind: "Consolidator net fares", enabled: config.suppliers.skybird, adapter: skybirdAdapter },
  { id: "vax", label: "VAX VacationAccess", kind: "Packages", enabled: config.suppliers.vax, adapter: vaxAdapter },
];

function enabled() {
  return registry.filter((s) => s.enabled);
}

function status() {
  return registry.map(({ id, label, kind, enabled: on }) => ({ id, label, kind, enabled: on }));
}

module.exports = { registry, enabled, status };
