/**
 * JSON file store — users, sessions, bookings, events, listings, payments,
 * notifications, change requests. Swap for Postgres via store.pg.js in production.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.dirname(process.env.KORABI_DATA_FILE || path.join(__dirname, "../../data/store.json"));
const FILE = process.env.KORABI_DATA_FILE || path.join(__dirname, "../../data/store.json");

const empty = () => ({
  users: [],
  sessions: [],
  bookings: [],
  events: [],
  listings: [],
  payments: [],
  checkoutIntents: [],
  notifications: [],
  requests: [],
  offerCache: {},
});

let cache = null;

function load() {
  if (cache) return cache;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) {
    cache = empty();
    save();
    return cache;
  }
  try {
    cache = { ...empty(), ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
  } catch {
    cache = empty();
  }
  return cache;
}

function save() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
}

function id(prefix) {
  return prefix + "_" + crypto.randomBytes(8).toString("hex");
}

function repo(key) {
  return {
    all: () => load()[key],
    find: (pred) => load()[key].find(pred),
    filter: (pred) => load()[key].filter(pred),
    create: (row) => {
      const db = load();
      db[key].push(row);
      save();
      return row;
    },
    update: (pred, patch) => {
      const db = load();
      const i = db[key].findIndex(pred);
      if (i < 0) return null;
      db[key][i] = { ...db[key][i], ...patch };
      save();
      return db[key][i];
    },
    remove: (pred) => {
      const db = load();
      const before = db[key].length;
      db[key] = db[key].filter((x) => !pred(x));
      save();
      return before - db[key].length;
    },
  };
}

const users = {
  ...repo("users"),
  findByEmail: (email) => load().users.find((u) => u.email.toLowerCase() === email.toLowerCase()),
  findById: (uid) => load().users.find((u) => u.id === uid),
  setPayoutMethod: (uid, method) => users.update((u) => u.id === uid, { payout_method: method }),
  addKorabiCash: (uid, amount) => {
    const u = users.findById(uid);
    if (!u) return null;
    const next = Math.round((Number(u.korabi_cash || 0) + Number(amount)) * 100) / 100;
    return users.update((x) => x.id === uid, { korabi_cash: next });
  },
};

const sessions = {
  ...repo("sessions"),
  findByToken: (token) => load().sessions.find((s) => s.token === token && new Date(s.expires_at) > new Date()),
  purgeExpired: () => {
    const now = Date.now();
    const db = load();
    db.sessions = db.sessions.filter((s) => new Date(s.expires_at).getTime() > now);
    save();
  },
};

const bookings = repo("bookings");
const events = repo("events");
const listings = repo("listings");
const payments = repo("payments");
const checkoutIntents = repo("checkoutIntents");
const notifications = repo("notifications");
const requests = repo("requests");

const offerCache = {
  get: (oid) => load().offerCache[oid] || null,
  set: (oid, offer) => {
    const db = load();
    db.offerCache[oid] = offer;
    save();
  },
};

module.exports = {
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
