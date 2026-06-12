const crypto = require("crypto");
const store = require("../db/store");

const COOKIE = "korabi_session";

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  return Object.fromEntries(
    raw.split(";").map((p) => {
      const i = p.indexOf("=");
      if (i < 0) return [p.trim(), ""];
      return [p.slice(0, i).trim(), decodeURIComponent(p.slice(i + 1))];
    })
  );
}

function attachUser(req, res, next) {
  store.sessions.purgeExpired();
  const cookies = parseCookies(req);
  const token = cookies[COOKIE];
  if (!token) {
    req.user = null;
    return next();
  }
  const session = store.sessions.findByToken(token);
  if (!session) {
    req.user = null;
    return next();
  }
  const user = store.users.findById(session.userId);
  if (!user) {
    req.user = null;
    return next();
  }
  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    korabi_cash: user.korabi_cash || 0,
    payout_method: user.payout_method || null,
  };
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "auth_required" });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "auth_required" });
  if (req.user.role !== "admin") return res.status(403).json({ error: "forbidden" });
  next();
}

function createSession(res, userId, days = 14) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  store.sessions.create({ token, userId, expires_at: expires.toISOString() });
  const secure = process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}; Max-Age=${days * 86400}`
  );
  return token;
}

function clearSession(req, res) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE];
  if (token) store.sessions.remove((s) => s.token === token);
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`);
}

module.exports = { attachUser, requireAuth, requireAdmin, createSession, clearSession, COOKIE };
