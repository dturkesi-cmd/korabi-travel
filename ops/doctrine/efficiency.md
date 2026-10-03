# Efficiency — E1 through E8

These are rules for the owner as much as for the fleet. They were written after
a month in which the platform's central path never ran and the audits that
delayed it were each individually correct. Throughput was never the
constraint. Scope and merges were, and both belong to the owner.

## E1 — Finish before starting

Nothing new opens until the current stop clears. A parked item stays parked
until the gate it waits behind is met. The parked list exists because
attention leaving the rail produced the empty tables, the vault that stored
nothing, and a B5 reported done that had never compiled. The rules are the
efficiency; removing them is not speed.

When the owner raises a parked item mid-stream, the fleet says the gate is not
met — once, in one line — and continues.

## E2 — Two-track merges, always

Track 1 (money, chain, auth, session, tenant, schema) stops for the owner's
read. Track 2 (docs, tests, lints, fixtures, front end, tooling) lands on
Kimi-verified plus green on current main, batched. Eighty-eight PRs waiting on
one reader is where throughput dies, and the split removes nothing from the
paths where the gate has caught real defects.

## E3 — A status claim carries its evidence

"Done" means: the commit SHA on main, the compile, the test run under the
runner CI uses. A report that says done without those is a claim about intent
and is rejected at report time — not discovered a week later.

## E4 — A model earns its slot

Every model has a named contract and a control it has passed. A model that
fails its control is off until it passes a fresh one. A model whose output
required grounding it did not do gets the files named in its contract or is
not used for that work. Seven models is coordination overhead; the number that
count is the number producing findings that reproduce.

## E5 — The owner's items are answered the day they arrive

Counsel, credentials, migrations, IAM checks — each gates something, none
takes more than an hour, each has sat for days. The blocked list is the only
reminder permitted. When the same item appears in three consecutive reports,
the fleet stops adding to the queue behind it and says so in one line.

## E6 — Enumerate the stranded

Every five merges: every remote branch with commits not on main and no open
PR. A stranded branch is indistinguishable from no work.

## E7 — The bottleneck is named, every report

A report describing the fleet's velocity without naming what the owner is
holding is describing the wrong thing.

## E8 — The fleet retrieves doctrine before it acts

The standing practices, the findings catalog, and every PR body that recorded
a red proof are the corpus. Before a task, retrieve the three entries most
similar to the work and the finding where each was learned. The
guard-on-one-of-two-doors shape was rediscovered three times on one file; the
mock-that-defends-the-defect shape in F02, B5, and #683.

- E8.1 — Findings enter the corpus the same turn they are caught.
- E8.2 — Every entry carries provenance: commit SHA and PR. An entry whose
  source commit is no longer an ancestor of main is STALE on retrieval.
- E8.3 — The verifier's outcomes go in tagged reproduced / not-reproduced.
  A false positive is as useful as a true one.
- E8.4 — Retrieval returns the counterexample with the rule.
- E8.5 — Retrieval proposes; it never disposes. "This resembles #68" — never a
  diff.
- E8.6 — Scope is the estate's own corpus. Not the codebase as a whole, not
  literature, not vendor docs, never PHI.
