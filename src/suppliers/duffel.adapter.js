const duffel = require("../lib/duffel");

module.exports = {
  id: "duffel",
  async search(payload) {
    const res = await duffel.search(payload);
    return (res.offers || []).map((o) => ({ ...o, supplier: "duffel", fare_type: "published" }));
  },
};
