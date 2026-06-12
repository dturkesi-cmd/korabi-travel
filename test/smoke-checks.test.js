const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_BASE_URL,
  SMOKE_ENDPOINTS,
  normalizeBaseUrl,
  buildUrl,
  evaluateCheck,
  summarizeResults,
} = require("../src/lib/smoke-checks");

describe("smoke-checks", () => {
  it("normalizeBaseUrl strips trailing slashes", () => {
    assert.equal(normalizeBaseUrl("http://127.0.0.1:3847/"), "http://127.0.0.1:3847");
  });

  it("buildUrl joins base and path", () => {
    assert.equal(buildUrl(DEFAULT_BASE_URL, "/api/health"), "http://127.0.0.1:3847/api/health");
    assert.equal(buildUrl("http://localhost:3000", "api/health"), "http://localhost:3000/api/health");
  });

  it("evaluateCheck accepts matching JSON response", () => {
    const spec = SMOKE_ENDPOINTS.find((e) => e.path === "/api/health");
    const result = evaluateCheck(
      { status: 200, contentType: "application/json; charset=utf-8", bodyText: '{"ok":true}' },
      spec
    );
    assert.equal(result.ok, true);
    assert.deepEqual(result.errors, []);
  });

  it("evaluateCheck flags wrong status and invalid JSON", () => {
    const spec = SMOKE_ENDPOINTS.find((e) => e.path === "/api/suppliers");
    const result = evaluateCheck(
      { status: 500, contentType: "text/plain", bodyText: "error" },
      spec
    );
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("500")));
    assert.ok(result.errors.some((e) => e.includes("JSON")));
  });

  it("summarizeResults aggregates pass/fail", () => {
    const summary = summarizeResults([
      { path: "/a", ok: true, errors: [] },
      { path: "/b", ok: false, errors: ["bad"] },
    ]);
    assert.equal(summary.ok, false);
    assert.equal(summary.total, 2);
    assert.equal(summary.passed, 1);
    assert.equal(summary.failed, 1);
    assert.equal(summary.failures[0].path, "/b");
  });
});
