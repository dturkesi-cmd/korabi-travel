const crypto = require("crypto");
const config = require("../config");

function verifyDuffelWebhook(rawBody, signatureHeader) {
  const secret = config.duffelWebhookSecret;
  if (!secret) return { ok: false, reason: "no_secret" };
  if (!signatureHeader) return { ok: false, reason: "no_signature" };
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const sig = String(signatureHeader).replace(/^sha256=/, "");
  try {
    const ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    return { ok, reason: ok ? null : "mismatch" };
  } catch {
    return { ok: false, reason: "mismatch" };
  }
}

module.exports = { verifyDuffelWebhook };
