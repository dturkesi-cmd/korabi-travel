const router = require("express").Router();
const store = require("../db/store");
const { verifyDuffelWebhook } = require("../lib/webhooks");

router.post("/duffel", (req, res) => {
  const raw = req.rawBody || JSON.stringify(req.body);
  const sig = req.headers["x-duffel-signature"] || req.headers["duffel-signature"];
  const v = verifyDuffelWebhook(raw, sig);
  if (!v.ok) return res.status(401).json({ error: "invalid_signature", reason: v.reason });

  const evt = req.body && req.body.data ? req.body : { data: req.body };
  store.events.create({
    id: store.id("evt"),
    type: evt.data?.type || evt.type || "unknown",
    payload_id: evt.data?.id || null,
    live_mode: evt.live_mode !== false,
    received_at: new Date().toISOString(),
  });
  res.json({ ok: true });
});

router.get("/recent", (req, res) => {
  res.json({ events: store.events.all().slice(-20).reverse() });
});

module.exports = router;
