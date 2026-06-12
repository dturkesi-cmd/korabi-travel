const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { verifyDuffelWebhook } = require("../src/lib/webhooks");

describe("webhooks", () => {
  it("rejects missing signature", () => {
    const r = verifyDuffelWebhook("{}", null);
    assert.equal(r.ok, false);
  });

  it("verifies valid HMAC", () => {
    const secret = "test_secret";
    const body = '{"type":"ping"}';
    const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
    process.env.DUFFEL_WEBHOOK_SECRET = secret;
    delete require.cache[require.resolve("../src/config")];
    delete require.cache[require.resolve("../src/lib/webhooks")];
    const { verifyDuffelWebhook: verify } = require("../src/lib/webhooks");
    assert.equal(verify(body, sig).ok, true);
    delete process.env.DUFFEL_WEBHOOK_SECRET;
  });
});
