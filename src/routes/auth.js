const router = require("express").Router();
const bcrypt = require("bcryptjs");
const config = require("../config");
const store = require("../db/store");
const { createSession, clearSession, requireAuth } = require("../middleware/auth");
const { verifyCsrf } = require("../middleware/csrf");
const { authLimiter } = require("../middleware/security");

router.use(authLimiter);

router.post("/register", async (req, res) => {
  const email = ((req.body && req.body.email) || "").trim().toLowerCase();
  const password = (req.body && req.body.password) || "";
  const name = ((req.body && req.body.name) || "").trim() || email.split("@")[0];
  if (!email || password.length < 6) {
    return res.status(400).json({ error: "bad_input", message: "Email and password (6+ chars) required." });
  }
  if (store.users.findByEmail(email)) {
    return res.status(409).json({ error: "exists", message: "An account with this email already exists." });
  }
  const user = {
    id: store.id("usr"),
    email,
    name,
    password_hash: await bcrypt.hash(password, 10),
    role: "user",
    korabi_cash: 0,
    payout_method: null,
    created_at: new Date().toISOString(),
  };
  store.users.create(user);
  createSession(res, user.id, config.sessionDays);
  res.json({ user: { id: user.id, email: user.email, name: user.name, korabi_cash: 0, role: user.role } });
});

router.post("/login", async (req, res) => {
  const email = ((req.body && req.body.email) || "").trim().toLowerCase();
  const password = (req.body && req.body.password) || "";
  const user = store.users.findByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "bad_credentials", message: "Invalid email or password." });
  }
  createSession(res, user.id, config.sessionDays);
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      korabi_cash: user.korabi_cash || 0,
      role: user.role,
    },
  });
});

router.post("/logout", verifyCsrf, (req, res) => {
  clearSession(req, res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
