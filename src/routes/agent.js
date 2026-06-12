const router = require("express").Router();
const { runAgent } = require("../lib/gemini");
const { agentLimiter } = require("../middleware/security");

router.post("/", agentLimiter, async (req, res) => {
  const { step, message, context } = req.body || {};
  if (!message) return res.status(400).json({ error: "bad_input" });
  const out = await runAgent({ step: step || "search", message, context: context || {} });
  res.json(out);
});

module.exports = router;
