/** Structured request logging — development only. */
function devRequestLog(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    console.log(JSON.stringify({
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      ms: Date.now() - start,
    }));
  });
  next();
}

module.exports = { devRequestLog };
