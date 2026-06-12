const { skybirdDemoOffers } = require("./demo-offers");

function hasCredentials() {
  return Boolean(process.env.SUPPLIER_SKYBIRD_API_KEY || process.env.SUPPLIER_SKYBIRD_USERNAME);
}

/** Sky Bird B2B — map skyAPI/WINGS response → NormalizedOffer when credentials arrive. */
module.exports = {
  id: "skybird",
  async search(payload) {
    if (hasCredentials()) {
      // TODO: call skyAPI/WINGS and map → NormalizedOffer
      return [];
    }
    return skybirdDemoOffers(payload);
  },
};
