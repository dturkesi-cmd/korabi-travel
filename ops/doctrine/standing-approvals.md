# Standing approvals

A stop is a decision, not a keystroke (`shtegdoctrine.md`, "A stop is a decision, not a keystroke"; `estate.md`, "Standing approvals"). Every item on the owner's queue that needs only the owner's credential or keystroke — not their judgment — is an **execution stop**, and every execution stop is a finding (B-03) resolved here or carried on BLOCKED with its age.

An entry is **live** only when its mechanism is CI or LINT class, its red proof is a real refusal, and its revoke step has been run once. Until then it is **written, not live**, and the report lists it under REVIEW-ONLY.

None of the entries below is live as of 2026-10-03. The owner's first keystroke on this file is choosing which to arm first; the recommended order is SA-02, SA-01, SA-03.

---

## SA-01 — Track 2 auto-land
since: 2026-10-03
status: **written, not live**
scope: merge of a PR where ALL hold — (1) no Track 1 path touched (per `ops/doctrine/track1-paths.md` or this repo's equivalent), (2) CI green against *current* default branch with the base SHA stated in the PR body, (3) Verifier (Kimi) lane has re-run the claims and posted its verdict, (4) no other open PR touches the same file, (5) the batch is not padded (every commit in it was independently Track 2).
mechanism: `[placeholder]` — a required CI job (`track2-autoland`) that evaluates the five conditions and merges on success; absent, the owner merges by hand and the item is counted as an execution stop.
red proof: `[placeholder]` — a PR touching one Track 1 path must be refused by the job, recorded by run URL.
revoke: delete the job's `merge` step; one commit.

## SA-02 — Sandbox deploy
since: 2026-10-03
status: **written, not live**
scope: any green default-branch digest deploys to the sandbox tier without a stop. Sandbox holds no production credentials, serves no outside party, and is where OP-05 monitors are proven red before they are armed in production.
mechanism: `[placeholder]` — the deploy workflow's sandbox job runs on every green default-branch build with no manual gate.
red proof: `[placeholder]` — a build that fails CI must not reach sandbox; a sandbox job that reads a production secret name must fail at plan time.
revoke: set the workflow's sandbox job `if: false`; one commit.

## SA-03 — Production promotion of a soaked digest
since: 2026-10-03
status: **written, not live**
scope: a digest that has run in sandbox for the stated soak (`[placeholder]` hours) with every Tier A monitor green promotes to production on a single owner keystroke. The owner approves *that this digest is the one*, not the diff — the diff was reviewed at merge.
mechanism: `[placeholder]` — a promotion job that takes a digest as its only input, verifies soak and monitor state from the log, writes before/after digests to the hash-chained log, and refuses any digest not already in sandbox.
red proof: `[placeholder]` — a digest never deployed to sandbox must be refused; a digest with a red Tier A monitor must be refused.
revoke: remove the job's production environment binding; one commit.

---

## How an execution stop becomes an entry

1. It appears in a report under `YOU RUN` with `(kind: execution)`.
2. A lane writes the entry here with scope, mechanism, red proof and revoke — mechanism and red proof as `[placeholder]` until built.
3. The Ops lane builds the mechanism and records the red proof.
4. The owner arms it (one commit removing `written, not live`).
5. The report's execution-stop count falls by one and stays down.
