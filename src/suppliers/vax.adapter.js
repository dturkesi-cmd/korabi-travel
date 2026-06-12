const { vaxDemoOffers } = require("./demo-offers");

function hasCredentials() {
  return Boolean(process.env.SUPPLIER_VAX_API_KEY || process.env.SUPPLIER_VAX_USERNAME);
}

/** VAX Quick Connect — package offers when distributor credentials arrive. */
module.exports = {
  id: "vax",
  async search(payload) {
    if (hasCredentials()) {
      // TODO: call VAX Quick Connect XML and map → NormalizedOffer
      return [];
    }
    return vaxDemoOffers(payload);
  },
};
