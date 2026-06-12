const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("child_process");
const fs = require("fs");
const net = require("net");
const path = require("path");
const os = require("os");

const ROOT = path.join(__dirname, "..");
const SERVER_SCRIPT = path.join(ROOT, "src/server.js");
const STARTUP_RE = /Korabi Travel → http:\/\/127\.0\.0\.1:(\d+)/;

let child;
let baseUrl;
let dataFile;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

function storeSetCookies(jar, response) {
  const lines =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : response.headers.get("set-cookie")
        ? [response.headers.get("set-cookie")]
        : [];
  for (const line of lines) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function fetchCsrf() {
  const jar = new Map();
  await apiFetch("/", { jar });
  const csrf = jar.get("korabi_csrf");
  assert.ok(csrf, "CSRF cookie from first request");
  return { jar, csrf };
}

async function apiFetchWithCsrf(pathname, { method = "GET", body, jar, csrf } = {}) {
  const headers = { Accept: "application/json", "X-CSRF-Token": csrf };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (jar && jar.size) headers.Cookie = cookieHeader(jar);
  const res = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (jar) storeSetCookies(jar, res);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, json, text };
}

async function apiFetch(pathname, { method = "GET", body, jar } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (jar && jar.size) {
    headers.Cookie = cookieHeader(jar);
  }
  const res = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (jar) storeSetCookies(jar, res);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, json, text };
}

async function startServer() {
  const port = await getFreePort();
  dataFile = path.join(os.tmpdir(), `korabi-integration-${process.pid}-${Date.now()}.json`);
  if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile);

  return new Promise((resolve, reject) => {
    child = spawn(process.execPath, [SERVER_SCRIPT], {
      cwd: ROOT,
      env: {
        ...process.env,
        KORABI_DATA_FILE: dataFile,
        PORT: String(port),
        NODE_ENV: "test",
        DUFFEL_ACCESS_TOKEN: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    const timeout = setTimeout(() => {
      reject(new Error(`server did not start within 15s\n${stderr}`));
    }, 15000);

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      const match = text.match(STARTUP_RE);
      if (match) {
        clearTimeout(timeout);
        baseUrl = `http://127.0.0.1:${match[1]}`;
        resolve();
        return;
      }
      if (text.includes("Korabi Travel →") && !baseUrl) {
        clearTimeout(timeout);
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      }
    });

    child.once("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    child.once("exit", (code, signal) => {
      if (!baseUrl) {
        clearTimeout(timeout);
        reject(new Error(`server exited before ready (code=${code}, signal=${signal})\n${stderr}`));
      }
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null) {
      if (dataFile && fs.existsSync(dataFile)) fs.unlinkSync(dataFile);
      return resolve();
    }
    const forceKill = setTimeout(() => {
      child.kill("SIGKILL");
    }, 5000);
    child.once("exit", () => {
      clearTimeout(forceKill);
      if (dataFile && fs.existsSync(dataFile)) fs.unlinkSync(dataFile);
      resolve();
    });
    child.kill("SIGTERM");
  });
}

describe("HTTP API integration", () => {
  before(async () => {
    await startServer();
  });

  after(async () => {
    await stopServer();
  });

  it("GET /api/health returns ok", async () => {
    const { res, json } = await apiFetch("/api/health");
    assert.equal(res.status, 200);
    assert.equal(json.ok, true);
    assert.equal(typeof json.token_configured, "boolean");
  });

  it("POST /api/search returns demo offers", async () => {
    const departure = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const { res, json } = await apiFetch("/api/search", {
      method: "POST",
      body: {
        origin: "LIS",
        destination: "BCN",
        departure_date: departure,
        adults: 1,
      },
    });
    assert.equal(res.status, 200);
    assert.equal(json.demo, true);
    assert.ok(Array.isArray(json.offers));
    assert.ok(json.offers.length > 0);
  });

  it("GET /api/marketplace/listings returns seeded listings", async () => {
    const { res, json } = await apiFetch("/api/marketplace/listings");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(json.listings));
    assert.ok(json.listings.length >= 2);
    assert.ok(json.listings.every((l) => l.origin && l.destination));
  });

  it("POST /api/auth/login and GET /api/auth/me with session cookie", async () => {
    const jar = new Map();

    const login = await apiFetch("/api/auth/login", {
      method: "POST",
      body: { email: "demo@korabi.test", password: "demo1234" },
      jar,
    });
    assert.equal(login.res.status, 200);
    assert.equal(login.json.user.email, "demo@korabi.test");
    assert.ok(jar.has("korabi_session"));

    const me = await apiFetch("/api/auth/me", { jar });
    assert.equal(me.res.status, 200);
    assert.equal(me.json.user.email, "demo@korabi.test");
    assert.equal(me.json.user.role, "user");
  });

  it("demo checkout: payment intent → confirm → order", async () => {
    const departure = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
    const search = await apiFetch("/api/search", {
      method: "POST",
      body: { origin: "LIS", destination: "BCN", departure_date: departure, adults: 1 },
    });
    assert.equal(search.res.status, 200);
    const offer = search.json.offers[0];
    assert.ok(offer.id);

    const { jar, csrf } = await fetchCsrf();
    await apiFetchWithCsrf("/api/auth/login", {
      method: "POST",
      jar,
      csrf,
      body: { email: "demo@korabi.test", password: "demo1234" },
    });

    const intent = await apiFetchWithCsrf("/api/payments/intent", {
      method: "POST",
      jar,
      csrf,
      body: {
        offer_id: offer.id,
        amount: offer.total_amount,
        currency: offer.total_currency || "USD",
      },
    });
    assert.equal(intent.res.status, 200);
    assert.equal(intent.json.mode, "demo");
    assert.equal(intent.json.payment_intent.status, "requires_payment_method");

    const confirm = await apiFetchWithCsrf(
      `/api/payments/intent/${intent.json.payment_intent.id}/confirm`,
      { method: "POST", jar, csrf, body: { card_last_four: "4242" } }
    );
    assert.equal(confirm.res.status, 200);
    assert.equal(confirm.json.payment_intent.status, "succeeded");

    const order = await apiFetchWithCsrf("/api/orders", {
      method: "POST",
      jar,
      csrf,
      body: {
        offer_id: offer.id,
        payment_intent_id: intent.json.payment_intent.id,
        total_amount: offer.total_amount,
        total_currency: offer.total_currency || "USD",
        passengers: [
          {
            id: "pax_a0",
            title: "mr",
            gender: "m",
            given_name: "Test",
            family_name: "Traveler",
            born_on: "1990-01-01",
            email: "test@example.com",
            phone_number: "+442080160508",
          },
        ],
      },
    });
    assert.equal(order.res.status, 200);
    assert.ok(order.json.order.booking_reference);
    assert.equal(order.json.demo, true);
    assert.ok(order.json.settlement);
    assert.ok(["R09_SANDBOX", "r09_direct", "arc_fallback", "skipped", "shteg_atomic_sandbox"].includes(order.json.settlement.path));
    assert.ok(order.json.booking.settlement_id);

    const cancel = await apiFetchWithCsrf(
      `/api/account/bookings/${order.json.booking.id}/cancel/confirm`,
      { method: "POST", jar, csrf }
    );
    assert.equal(cancel.res.status, 200);
    assert.equal(cancel.json.booking.status, "cancelled");
    assert.ok(cancel.json.settlement_refund);
    assert.equal(cancel.json.settlement_refund.ok, true);
  });
});
