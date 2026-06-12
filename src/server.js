const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const config = require("./config");
const store = require("./db/store");
const { attachUser } = require("./middleware/auth");
const { ensureCsrf } = require("./middleware/csrf");
const { securityHeaders } = require("./middleware/security");
const { notFound, errorHandler } = require("./middleware/errors");
const { devRequestLog } = require("./middleware/devLog");
const openapi = require("./lib/openapi");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

if (!config.isProd) {
  app.use(devRequestLog);
}

app.use(securityHeaders);
app.use(express.json({ limit: config.bodyLimit, verify: (req, _res, buf) => { req.rawBody = buf.toString(); } }));
app.use(attachUser);
app.use(ensureCsrf);

const publicDir = path.join(__dirname, "../public");

function sendPage(name) {
  return (_req, res) => res.sendFile(path.join(publicDir, name));
}

app.get("/", sendPage("index.html"));
app.get("/account", sendPage("account.html"));
app.get("/admin", sendPage("admin.html"));
app.get("/login", sendPage("login.html"));
app.get("/marketplace", sendPage("marketplace.html"));

app.use(express.static(publicDir));

app.get("/api/openapi.json", (_req, res) => {
  res.json(openapi);
});

app.use("/api/payments", require("./routes/payments"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api", require("./routes/flights"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/agent", require("./routes/agent"));
app.use("/api/account", require("./routes/account"));
app.use("/api/account", require("./routes/payouts"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/marketplace", require("./routes/marketplace"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/webhooks", require("./routes/webhooks"));
app.get("/api/webhooks/recent", (req, res) => {
  res.json({ events: store.events.all().slice(-20).reverse() });
});

app.use(notFound);
app.use(errorHandler);

function seed() {
  store.load();
  if (store.users.all().length) return;

  const admin = {
    id: store.id("usr"),
    email: config.adminEmail,
    name: "Admin",
    password_hash: bcrypt.hashSync(config.adminPassword, 10),
    role: "admin",
    korabi_cash: 0,
    payout_method: null,
    created_at: new Date().toISOString(),
  };
  store.users.create(admin);

  const demoUser = {
    id: store.id("usr"),
    email: "demo@korabi.test",
    name: "Demo Traveler",
    password_hash: bcrypt.hashSync("demo1234", 10),
    role: "user",
    korabi_cash: 24,
    payout_method: null,
    created_at: new Date().toISOString(),
  };
  store.users.create(demoUser);

  const dep1 = new Date(Date.now() + 14 * 86400000).toISOString();
  const dep2 = new Date(Date.now() + 21 * 86400000).toISOString();
  store.listings.create({
    id: store.id("lst"),
    sellerUserId: demoUser.id,
    buyerUserId: null,
    origin: "LIS",
    destination: "BCN",
    departing_at: dep1,
    asking_price: 89,
    fare_paid: 142,
    currency: "EUR",
    airline: { iata: "FR", name: "Ryanair" },
    pnr: "DEMO01",
    status: "active",
    source: "external",
    verification: { state: "verified", at: new Date().toISOString() },
    created_at: new Date().toISOString(),
  });
  store.listings.create({
    id: store.id("lst"),
    sellerUserId: demoUser.id,
    buyerUserId: null,
    origin: "LON",
    destination: "RAK",
    departing_at: dep2,
    asking_price: 120,
    fare_paid: 198,
    currency: "GBP",
    airline: { iata: "U2", name: "easyJet" },
    pnr: "DEMO02",
    status: "active",
    source: "external",
    verification: { state: "verified", at: new Date().toISOString() },
    created_at: new Date().toISOString(),
  });

  store.bookings.create({
    id: store.id("bk"),
    userId: demoUser.id,
    reference: "KORABI1",
    route: "LIS → NYC",
    status: "confirmed",
    total_amount: 642,
    total_currency: "USD",
    passenger_names: ["Demo Traveler"],
    korabi_cash_earned: 13,
    source: "demo",
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  });

  const notify = require("./lib/notify");
  notify.create(demoUser.id, {
    type: "welcome",
    title: "Welcome to Korabi",
    message: "You have $24 Korabi Cash — book a trip to earn more.",
  });

  console.log(`[seed] admin ${config.adminEmail} / ${config.adminPassword}`);
  console.log("[seed] demo demo@korabi.test / demo1234");
}

function ensureDemoContent() {
  store.load();
  const demo = store.users.findByEmail("demo@korabi.test");
  if (!demo) return;
  const hasBooking = store.bookings.all().some((b) => b.userId === demo.id);
  if (!hasBooking) {
    store.bookings.create({
      id: store.id("bk"),
      userId: demo.id,
      reference: "KORABI1",
      route: "LIS → NYC",
      status: "confirmed",
      total_amount: 642,
      total_currency: "USD",
      passenger_names: ["Demo Traveler"],
      korabi_cash_earned: 13,
      source: "demo",
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    });
    console.log("[seed] added demo booking for demo@korabi.test");
  }
}

seed();
ensureDemoContent();

function listenWithFallback(basePort, maxAttempts = 11) {
  let port = basePort;
  let attempts = 0;

  function tryListen() {
    const server = app.listen(port, () => {
      const url = `http://127.0.0.1:${port}`;
      if (port !== basePort) {
        console.warn(`[server] port ${basePort} in use — listening on ${port} instead`);
      }
      console.log(`Korabi Travel → ${url}`);
      console.log(`Open that URL in your browser (use 127.0.0.1, not localhost, if another app intercepts localhost).`);
      console.log(`Mode: ${config.duffelToken ? "Duffel configured" : "demo (no DUFFEL_ACCESS_TOKEN)"}`);
    });

    server.on("error", (err) => {
      server.close();
      if (err.code === "EADDRINUSE" && attempts < maxAttempts - 1) {
        attempts += 1;
        const prev = port;
        port += 1;
        console.warn(`[server] port ${prev} in use, trying ${port}…`);
        tryListen();
        return;
      }
      console.error(`[server] failed to bind (tried ${basePort}–${port}): ${err.message}`);
      process.exit(1);
    });
  }

  tryListen();
}

if (require.main === module) {
  listenWithFallback(config.port);
}

module.exports = app;
