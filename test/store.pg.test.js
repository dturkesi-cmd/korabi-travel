const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

describe("store.pg scaffold", () => {
  let originalUrl;

  beforeEach(() => {
    originalUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    delete require.cache[require.resolve("../src/db/store.pg")];
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    delete require.cache[require.resolve("../src/db/store.pg")];
  });

  it("exports same surface as JSON store", () => {
    const pg = require("../src/db/store.pg");
    const json = require("../src/db/store");
    const keys = [
      "load", "save", "id", "users", "sessions", "bookings", "events",
      "listings", "payments", "checkoutIntents", "notifications", "requests", "offerCache",
    ];
    for (const key of keys) {
      assert.ok(key in pg, `missing export: ${key}`);
      assert.equal(typeof pg[key], typeof json[key], `type mismatch: ${key}`);
    }
  });

  it("throws StoreNotConfiguredError when DATABASE_URL unset", () => {
    const pg = require("../src/db/store.pg");
    assert.equal(pg.isConfigured(), false);
    assert.throws(() => pg.users.all(), (err) => err.code === "STORE_NOT_CONFIGURED");
    assert.throws(() => pg.offerCache.get("x"), (err) => err.code === "STORE_NOT_CONFIGURED");
  });

  it("documents schema aligned to JSON collections", () => {
    const pg = require("../src/db/store.pg");
    assert.match(pg.SCHEMA, /CREATE TABLE IF NOT EXISTS users/);
    assert.match(pg.SCHEMA, /CREATE TABLE IF NOT EXISTS offer_cache/);
    assert.match(pg.SCHEMA, /JSONB/);
  });
});
