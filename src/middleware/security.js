const config = require("../config");

const buckets = new Map();

function rateLimit({ windowMs = 60000, max = 60, keyFn }) {
  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || now - b.start > windowMs) {
      b = { start: now, count: 0 };
      buckets.set(key, b);
    }
    b.count += 1;
    if (b.count > max) {
      return res.status(429).json({ error: "rate_limit", message: "Too many requests." });
    }
    next();
  };
}

function ipKey(req) {
  return req.ip || req.headers["x-forwarded-for"] || "unknown";
}

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://assets.duffel.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.duffel.com https://generativelanguage.googleapis.com; frame-src 'none'"
  );
  if (config.isProd) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
}

const authLimiter = rateLimit({ windowMs: 60000, max: 20, keyFn: (req) => `auth:${ipKey(req)}` });
const searchLimiter = rateLimit({ windowMs: 60000, max: 30, keyFn: (req) => `search:${ipKey(req)}` });
const agentLimiter = rateLimit({ windowMs: 60000, max: 20, keyFn: (req) => `agent:${ipKey(req)}` });

module.exports = { securityHeaders, authLimiter, searchLimiter, agentLimiter };
