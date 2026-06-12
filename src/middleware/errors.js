const path = require("path");

const publicDir = path.join(__dirname, "../../public");

function notFound(req, res) {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "not_found" });
  res.status(404).sendFile(path.join(publicDir, "404.html"));
}

function errorHandler(err, req, res, _next) {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.code || "server_error",
    message: err.message || "Internal server error",
  });
}

module.exports = { notFound, errorHandler };
