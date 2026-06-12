/**
 * Pure helpers for scripts/smoke-api.js — testable without a live server.
 */

const DEFAULT_BASE_URL = "http://127.0.0.1:3847";

/** Public endpoints that should respond without auth. */
const SMOKE_ENDPOINTS = [
  { method: "GET", path: "/api/health", expectStatus: 200, expectJson: true },
  { method: "GET", path: "/api/suppliers", expectStatus: 200, expectJson: true },
  { method: "GET", path: "/api/marketplace/airlines", expectStatus: 200, expectJson: true },
  { method: "GET", path: "/api/marketplace/listings", expectStatus: 200, expectJson: true },
  { method: "GET", path: "/api/webhooks/recent", expectStatus: 200, expectJson: true },
  { method: "GET", path: "/api/openapi.json", expectStatus: 200, expectJson: true },
  { method: "GET", path: "/", expectStatus: 200, expectJson: false },
];

function normalizeBaseUrl(base) {
  const trimmed = String(base || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error(`Invalid BASE_URL: ${base}`);
  }
  return trimmed;
}

function buildUrl(baseUrl, path) {
  const base = normalizeBaseUrl(baseUrl);
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

function evaluateCheck({ status, contentType, bodyText }, spec) {
  const errors = [];
  if (status !== spec.expectStatus) {
    errors.push(`expected HTTP ${spec.expectStatus}, got ${status}`);
  }
  if (spec.expectJson) {
    const ct = (contentType || "").toLowerCase();
    if (!ct.includes("application/json")) {
      errors.push(`expected JSON content-type, got ${contentType || "(none)"}`);
    }
    try {
      JSON.parse(bodyText);
    } catch {
      errors.push("response body is not valid JSON");
    }
  }
  return { ok: errors.length === 0, errors };
}

function summarizeResults(results) {
  const failed = results.filter((r) => !r.ok);
  return {
    ok: failed.length === 0,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    failures: failed.map((r) => ({ path: r.path, errors: r.errors })),
  };
}

module.exports = {
  DEFAULT_BASE_URL,
  SMOKE_ENDPOINTS,
  normalizeBaseUrl,
  buildUrl,
  evaluateCheck,
  summarizeResults,
};
