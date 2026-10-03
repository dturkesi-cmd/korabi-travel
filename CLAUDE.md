# korabi-travel

<!-- shtegdoctrine:v2 -->
## ShtegDoctrine v2 — read first

`ops/doctrine/shtegdoctrine.md` governs this repo: the core loop, the four stops (a stop is a decision, not a keystroke), two-track merges, the **build loop** (locked `checks/`, score-gated keep/revert, `program.md`), and the **estate rules** (a product is operating when someone outside would notice it stopped; WIP limit two).

- Estate entry: **korabi-travel** · state: **parked** · event: *A traveler who is not the owner completes and pays for a Duffel booking through korabitravel.com.* · reopen: owner rules it into a slot
- Estate root: `shte-ai/shtegmed` → `ops/estate.json`. A `parked` product does not spawn lanes; a lane here is on a gate row of a `building` product's event or it is parked work.
- Standing approvals: `ops/doctrine/standing-approvals.md` (none live yet; every execution-only stop is counted in the report).
- Before any task: retrieve from `ops/doctrine/findings-catalog.md` and, if this product has not moved a gate row in 14 days, from `ops/doctrine/barriers.md`.
- Every report ends with the NEXT block including the `ESTATE:` line.
<!-- /shtegdoctrine:v2 -->
