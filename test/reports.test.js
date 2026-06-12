const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { csvEscape, parseRange } = require("../src/lib/reports");

describe("reports", () => {
  it("escapes CSV special characters", () => {
    assert.equal(csvEscape('hello, "world"'), '"hello, ""world"""');
    assert.equal(csvEscape(null), "");
  });

  it("parses date range query", () => {
    const r = parseRange({ from: "2026-01-01", to: "2026-01-31" });
    assert.ok(r.from);
    assert.ok(r.to);
    assert.ok(r.to > r.from);
  });
});
