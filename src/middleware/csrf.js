const crypto = require("crypto");

const COOKIE = "korabi_csrf";

function ensureCsrf(req, res, next) {
  const cookies = Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((p) => {
        const i = p.indexOf("=");
        return i < 0 ? [p.trim(), ""] : [p.slice(0, i).trim(), decodeURIComponent(p.slice(i + 1))];
      })
  );
  if (!cookies[COOKIE]) {
    const token = crypto.randomBytes(16).toString("hex");
    const secure = process.env.NODE_ENV === "production";
    res.setHeader(
      "Set-Cookie",
      `${COOKIE}=${token}; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`
    );
    req.csrfToken = token;
  } else {
    req.csrfToken = cookies[COOKIE];
  }
  next();
}

function verifyCsrf(req, res, next) {
  const cookies = Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((p) => {
        const i = p.indexOf("=");
        return i < 0 ? [p.trim(), ""] : [p.slice(0, i).trim(), decodeURIComponent(p.slice(i + 1))];
      })
  );
  const header = req.headers["x-csrf-token"];
  if (!header || !cookies[COOKIE] || header !== cookies[COOKIE]) {
    return res.status(403).json({ error: "csrf", message: "Invalid CSRF token." });
  }
  next();
}

module.exports = { ensureCsrf, verifyCsrf, COOKIE };
