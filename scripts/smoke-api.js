#!/usr/bin/env node
/**
 * Smoke-test key public API routes against a running Korabi server.
 *
 * Usage:
 *   npm start &          # in another terminal
 *   node scripts/smoke-api.js
 *   BASE_URL=http://127.0.0.1:3848 node scripts/smoke-api.js
 */
const {
  DEFAULT_BASE_URL,
  SMOKE_ENDPOINTS,
  buildUrl,
  evaluateCheck,
  summarizeResults,
} = require("../src/lib/smoke-checks");

const baseUrl = process.env.BASE_URL || DEFAULT_BASE_URL;

async function fetchCheck(spec) {
  const url = buildUrl(baseUrl, spec.path);
  let res;
  try {
    res = await fetch(url, { method: spec.method, redirect: "follow" });
  } catch (err) {
    return {
      path: spec.path,
      ok: false,
      errors: [`fetch failed: ${err.message}`],
    };
  }
  const bodyText = await res.text();
  const verdict = evaluateCheck(
    { status: res.status, contentType: res.headers.get("content-type"), bodyText },
    spec
  );
  return { path: spec.path, ...verdict };
}

async function main() {
  console.log(`[smoke] BASE_URL=${baseUrl}`);
  const results = [];
  for (const spec of SMOKE_ENDPOINTS) {
    const result = await fetchCheck(spec);
    results.push(result);
    const mark = result.ok ? "ok" : "FAIL";
    console.log(`[smoke] ${mark} ${spec.method} ${spec.path}`);
    if (!result.ok) {
      for (const e of result.errors) console.log(`       - ${e}`);
    }
  }
  const summary = summarizeResults(results);
  if (summary.ok) {
    console.log(`[smoke] ${summary.passed}/${summary.total} passed`);
    process.exit(0);
  }
  console.error(`[smoke] ${summary.failed}/${summary.total} failed`);
  process.exit(1);
}

main().catch((err) => {
  console.error(`[smoke] fatal: ${err.message}`);
  process.exit(1);
});
