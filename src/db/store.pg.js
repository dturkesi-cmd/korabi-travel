/**
 * Postgres store adapter — mirrors src/db/store.js API.
 *
 * Set DATABASE_URL to enable. Install optional peer: npm install pg
 * Swap require("./store") → require("./store.pg") in server.js when ready.
 *
 * Schema aligns with JSON store collections (row bodies stored as JSONB).
 */
const crypto = require("crypto");

const DATABASE_URL = process.env.DATABASE_URL || "";

/** @type {import("pg").Pool | null} */
let pool = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users (lower(email));

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  data JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions ((data->>'expires_at'));

CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS listings (id TEXT PRIMARY KEY, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS checkout_intents (id TEXT PRIMARY KEY, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, data JSONB NOT NULL);

CREATE TABLE IF NOT EXISTS offer_cache (
  offer_id TEXT PRIMARY KEY,
  data JSONB NOT NULL
);
`;

class StoreNotConfiguredError extends Error {
  constructor() {
    super(
      "Postgres store not configured: set DATABASE_URL and install pg (npm install pg). " +
        "Until then, use src/db/store.js (JSON file store)."
    );
    this.code = "STORE_NOT_CONFIGURED";
    this.name = "StoreNotConfiguredError";
  }
}

function isConfigured() {
  return Boolean(DATABASE_URL);
}

function requireConfigured() {
  if (!isConfigured()) throw new StoreNotConfiguredError();
}

function getPool() {
  requireConfigured();
  if (pool) return pool;
  let Client;
  try {
    ({ Pool: Client } = require("pg"));
  } catch {
    throw new Error(
      "pg package not installed. Run: npm install pg — or unset DATABASE_URL to use JSON store."
    );
  }
  pool = new Client({ connectionString: DATABASE_URL });
  return pool;
}

async function ensureSchema() {
  const p = getPool();
  await p.query(SCHEMA);
}

function id(prefix) {
  return prefix + "_" + crypto.randomBytes(8).toString("hex");
}

function rowId(row) {
  return row.id || row.token || row.offer_id;
}

function syncRepo(table, { idField = "id", indexedEmail = false } = {}) {
  const notReady = () => {
    throw new StoreNotConfiguredError();
  };

  return {
    all: () => notReady(),
    find: () => notReady(),
    filter: () => notReady(),
    create: () => notReady(),
    update: () => notReady(),
    remove: () => notReady(),
    _table: table,
    _idField: idField,
    _indexedEmail: indexedEmail,
  };
}

/** Async implementations used when pg is active (call via withPg). */
function asyncRepo(table, { idField = "id" } = {}) {
  return {
    async all() {
      const { rows } = await getPool().query(`SELECT data FROM ${table}`);
      return rows.map((r) => r.data);
    },
    async find(pred) {
      const rows = await this.all();
      return rows.find(pred) || null;
    },
    async filter(pred) {
      const rows = await this.all();
      return rows.filter(pred);
    },
    async create(row) {
      const key = rowId(row);
      if (!key) throw new Error(`${table}: row missing id`);
      if (table === "users") {
        await getPool().query(
          `INSERT INTO ${table} (id, email, data) VALUES ($1, $2, $3)`,
          [key, row.email, row]
        );
      } else if (table === "sessions") {
        await getPool().query(`INSERT INTO ${table} (token, data) VALUES ($1, $2)`, [key, row]);
      } else {
        await getPool().query(`INSERT INTO ${table} (id, data) VALUES ($1, $2)`, [key, row]);
      }
      return row;
    },
    async update(pred, patch) {
      const rows = await this.all();
      const i = rows.findIndex(pred);
      if (i < 0) return null;
      const next = { ...rows[i], ...patch };
      const key = rowId(next);
      if (table === "sessions") {
        await getPool().query(`UPDATE ${table} SET data = $2 WHERE token = $1`, [key, next]);
      } else {
        await getPool().query(`UPDATE ${table} SET data = $2 WHERE id = $1`, [key, next]);
      }
      return next;
    },
    async remove(pred) {
      const rows = await this.all();
      const toDrop = rows.filter(pred);
      for (const row of toDrop) {
        const key = rowId(row);
        const col = table === "sessions" ? "token" : "id";
        await getPool().query(`DELETE FROM ${table} WHERE ${col} = $1`, [key]);
      }
      return toDrop.length;
    },
    _table: table,
    _idField: idField,
  };
}

const users = {
  ...syncRepo("users", { indexedEmail: true }),
  findByEmail: () => {
    throw new StoreNotConfiguredError();
  },
  findById: () => {
    throw new StoreNotConfiguredError();
  },
  setPayoutMethod: () => {
    throw new StoreNotConfiguredError();
  },
  addKorabiCash: () => {
    throw new StoreNotConfiguredError();
  },
};

const sessions = {
  ...syncRepo("sessions", { idField: "token" }),
  findByToken: () => {
    throw new StoreNotConfiguredError();
  },
  purgeExpired: () => {
    throw new StoreNotConfiguredError();
  },
};

const bookings = syncRepo("bookings");
const events = syncRepo("events");
const listings = syncRepo("listings");
const payments = syncRepo("payments");
const checkoutIntents = syncRepo("checkout_intents");
const notifications = syncRepo("notifications");
const requests = syncRepo("requests");

const offerCache = {
  get: () => {
    throw new StoreNotConfiguredError();
  },
  set: () => {
    throw new StoreNotConfiguredError();
  },
};

function load() {
  requireConfigured();
  throw new Error(
    "store.pg load() is async — call store.pg.init() at boot, then use repo methods via withPg()."
  );
}

function save() {
  requireConfigured();
  // No-op: Postgres persists per operation.
}

/**
 * Bootstrap schema and return async repo bindings. Wire this at server start when
 * migrating from JSON store.
 */
async function init() {
  await ensureSchema();
  const u = asyncRepo("users");
  const s = asyncRepo("sessions");
  return {
    users: {
      ...u,
      findByEmail: async (email) => {
        const { rows } = await getPool().query(
          `SELECT data FROM users WHERE lower(email) = lower($1) LIMIT 1`,
          [email]
        );
        return rows[0]?.data || null;
      },
      findById: async (uid) => u.find((x) => x.id === uid),
      setPayoutMethod: async (uid, method) => u.update((x) => x.id === uid, { payout_method: method }),
      addKorabiCash: async (uid, amount) => {
        const row = await u.find((x) => x.id === uid);
        if (!row) return null;
        const next = Math.round((Number(row.korabi_cash || 0) + Number(amount)) * 100) / 100;
        return u.update((x) => x.id === uid, { korabi_cash: next });
      },
    },
    sessions: {
      ...s,
      findByToken: async (token) => {
        const row = await s.find((x) => x.token === token);
        if (!row || new Date(row.expires_at) <= new Date()) return null;
        return row;
      },
      purgeExpired: async () => {
        await getPool().query(
          `DELETE FROM sessions WHERE (data->>'expires_at')::timestamptz <= NOW()`
        );
      },
    },
    bookings: asyncRepo("bookings"),
    events: asyncRepo("events"),
    listings: asyncRepo("listings"),
    payments: asyncRepo("payments"),
    checkoutIntents: asyncRepo("checkout_intents"),
    notifications: asyncRepo("notifications"),
    requests: asyncRepo("requests"),
    offerCache: {
      get: async (oid) => {
        const { rows } = await getPool().query(`SELECT data FROM offer_cache WHERE offer_id = $1`, [oid]);
        return rows[0]?.data || null;
      },
      set: async (oid, offer) => {
        await getPool().query(
          `INSERT INTO offer_cache (offer_id, data) VALUES ($1, $2)
           ON CONFLICT (offer_id) DO UPDATE SET data = EXCLUDED.data`,
          [oid, offer]
        );
      },
    },
  };
}

module.exports = {
  SCHEMA,
  StoreNotConfiguredError,
  isConfigured,
  init,
  load,
  save,
  id,
  users,
  sessions,
  bookings,
  events,
  listings,
  payments,
  checkoutIntents,
  notifications,
  requests,
  offerCache,
};
