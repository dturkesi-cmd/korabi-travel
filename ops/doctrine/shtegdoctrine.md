<!-- Repo copy of the ShtegDoctrine skill, v2 (build loop + estate rules), written 2026-10-03.
     This file is the source of truth for this repo; the account-level skill mirrors it.
     Estate entry: korabi-travel · state: parked · event: A traveler who is not the owner completes and pays for a Duffel booking through korabitravel.com.
     Estate root: shte-ai/shtegmed ops/estate.json -->

---
name: "shtegdoctrine"
description: "Lippi's operating doctrine for building AND running every repo — core loop, four stops, two-track merges, fleet/swarm, the build loop (locked checks, score-gated keep/revert, auto-loop retrospective with wiki layer), efficiency E1–E9, operations rules OP-01–OP-16 with enforcement classes, the tiered go-live gate G-OP-1–20, the work-items grammar for deadlines, and the findings catalog. Use on any code, PR, brief, deploy, monitor, runbook, status report, deadline or BLOCKED list, continuous iteration on a feature, or when a task resembles a known failure shape."
---

# ShtegDoctrine

The Shteg platform is healthcare payments infrastructure: a clearinghouse, an RCM engine, and a settlement rail that moves practice money against attested clinical records. A month of adversarial audit found, repeatedly, that the platform's documentation was ahead of what ran — a WORM chain with zero entries, a vault that returned 200 and stored nothing, a three-way reconciliation comparing a number to itself, a "B5 done" that had never compiled. None of it was careless code. Each was correct code nothing had exercised, behind a document asserting it worked.

A month later the same shape was found one layer out: `main` ninety commits ahead of the image production served, a Terraform workflow that had only ever recorded `skipped`, a chain-anchor flag that was on when unset, a scheduled verifier whose first run died at authentication, and an audit that recorded central logging and alerting as *unknown*. Correct code, in the tree, that production was not running — and no signal that would have said so.

A third shape was measured one layer further out, on the estate rather than the repo (Oct 2026): twenty-odd products specified, most with code, several with patents, a doctrine, a fleet, a control plane — and none past Tier A of its own go-live gate. Not one product had an outside party who would notice if it stopped. The same defect at portfolio scale: everything implemented, nothing operating, and the report describing build velocity.

This doctrine exists to close all three gaps. It has six parts: how to prove something works, how continuous iteration proves it keeps working, what may not proceed without the owner, how the fleet stays efficient, what production must prove before it carries money, and what separates a product that is implemented from one that is operating. Read this file for the core loop, the build loop, and the estate rules. Read the references when you need the full rule or the catalog of shapes.

Three words are used precisely throughout, because conflating them is the defect every section describes. **Implemented** — the code exists and its tests pass. **Operating** — an outside party depends on it and would notice if it stopped. **Stop** — a decision only the owner can make; never a keystroke only the owner can type. Where a sentence could mean either, it means the stricter.

## The core loop — before any task

1. **Retrieve.** Before starting, find the three doctrine entries most similar to the work and the finding where each was learned. `ops/doctrine/findings-catalog.md` is the index. An agent that has the doctrine is not an agent that has read it; the guard-on-one-of-two-doors shape was rediscovered three times on one file.
2. **Enumerate before you create.** `git worktree list`, `git branch -a`, open PRs, who holds the file, and the deploy tooling. Existence and ownership are different questions. Two branches were stranded in one week — pushed, never opened as a PR, invisible to everyone. A branch that looked dead was one deploy-script run from arming a client that had never authenticated.
3. **Prove it red.** Nothing lands without a demonstration that it fails when it should — against the pre-fix code, with a cold restart (hot module reload gives false counterfactuals). A control that cannot fail is not a control; seven instances in one month passed on their failure path. This applies to pipelines, monitors, and drills exactly as it applies to tests.
4. **Verify which mechanism a passing assertion exercises.** The "NO DOUBLE-SPEND" test was passing because the fake rail was idempotent, not because the code was. Ask what a green result actually proves.
5. **Verify what landed, and into what.** `git log --stat` on the actual commit, on the branch it merged into. #406 showed MERGED and was not on main — it had merged into another PR's branch. A working tree is not a branch; a branch is not production; `main` is not the serving digest.
6. **Report with evidence.** A status claim carries its commit SHA, its compile, its test run under the runner CI uses, and — for anything that claims to be running — the serving digest. "Done" without those is a claim about intent.

## The four stops — batch these to the owner, keep building past them

These require a human decision before anything proceeds. When you hit one: open the PR, put the question and your recommendation in its body, add it to the batched list, take the next unblocked item. Do not idle. Do not poll.

1. **Money movement** — anything that sends, holds, or releases funds.
2. **Chain format or signing** — attest-core packet shape, hash inputs, KMS keys, signature layout.
3. **Tenant isolation semantics** — `clinicId` scoping, `getTenantContext`, anything that decides which tenant a row belongs to.
4. **Production writes, applied migrations, IAM or key material, and deploys** — `--create-only` and the owner applies; `--force-with-lease` has no lane-branch exception; until continuous deployment lands, every deploy is a stop with the digest before and after in the PR body.

Merging any PR is the owner's. Lanes open; the owner lands. A guard on one of several entry points is not a guard, and the merge gate is the entry point that has caught four money defects.

If unsure whether something is a stop, it is a stop.

### A stop is a decision, not a keystroke

The owner's queue is the estate's constraint — not fleet throughput, not scope. Every item on it is one of two things, and the doctrine treats them differently:

- **A decision stop** needs the owner's judgment: should this money move, is this the chain format, does this row belong to that tenant. These stay stops. Nothing here reduces them.
- **An execution stop** needs only the owner's credential or keystroke: the merge button on a Track 2 batch that already meets every condition, the `terraform apply` on a plan already reviewed, the sandbox deploy of a digest no one disputes. The owner's judgment is not being asked for — only their hands.

**Every execution stop is a finding.** It is converted into a mechanism under a **standing approval**, or it is carried on the BLOCKED list with its age until it is. A standing approval is written once by the owner in `ops/doctrine/standing-approvals.md`: the class of action, the conditions that bound it, the mechanism that enforces the bound, and the red proof that the mechanism refuses an action outside the class. Track 2 batches that meet all five landing conditions auto-land. Sandbox-tier deploys are not stops. A production deploy of a reviewed digest is a single pre-authorized promotion, not a review. The fuse stays armed by the owner; it is just not re-armed by hand each time.

**The first thing to operate in any repo is its deploy pipeline.** The doctrine already says every deploy is a stop until continuous deployment lands. Until it lands, the owner's queue is where products go to wait — ninety commits behind production was that queue, measured. Continuous deployment to sandbox, promotion to production as a standing approval over a reviewed digest, and the serving digest in every report: that is the pipeline, and it closes before the second feature opens.

## Two-track merges

**Track 1 — the owner reads the diff.** Anything touching `lib/settlement`, `lib/payment`, `lib/rcm`, `packages/attest-core`, `packages/hub-client`, `packages/shtegpay`, `lib/auth*`, `lib/session*`, `prisma/`, and the deploy tooling — `wire-vendor-env.sh`, `*.tfvars`, `.github/workflows/`, `terraform/`. The deploy tooling decides what is armed; it is read with the same care as the code it arms.

**Track 2 — batched.** Docs, tests, lints, fixtures, front end, tooling. Lands on: no Track 1 path touched, CI green against *current* main with the base SHA stated, Kimi-verified, no other open PR on the same file. Never pad a batch.

A `package.json` script-line conflict is always union-resolved. A take-one-side resolution once nearly deleted a CI gate silently.

## Reporting protocol

Every report ends with, and nothing after:

```
── NEXT ──
1) <recommended — the default if the owner says nothing>
2) <alternative>
3) <alternative>
   (or: nothing, continuing)
SERVING:  <digest> · <build SHA> · <N> commits behind main · <age> · Track 1 paths in gap: <list|none>
ESTATE:   operating <n> · gated <n> (oldest: <product>, <age>) · building <n>/<WIP> · parked <n> · event for this product: <sentence | UNNAMED>
REVIEW-ONLY: <rules with no mechanism yet> · oldest unexecuted runbook: <name, age>
YOU RUN:  <only what credentials or the classifier prevent — copy-ready> · of which execution-only: <n> (→ standing approval candidates)
BLOCKED:  <standing list, oldest first, with ages — deferred go-live rows included>
```

Never manufacture a decision to fill the block. Never more than three options. The blocked list is the only place a lane may remind the owner of anything. When the same item appears in three consecutive reports, say in one line that the queue behind it has stopped growing. The SERVING line is E9: a report that describes the fleet's velocity without saying what production runs is describing the wrong thing. The ESTATE line is E9 one layer out: a report that describes one repo's production without saying how many products anyone depends on is describing the wrong estate. `UNNAMED` on the event field is itself a finding (B-02) and is listed under BLOCKED with the product's age in `building`.

## The fleet

One lane per file. One agent per worktree, enforced at spawn — `git add -A` is banned while any agent writes in the tree; a subagent writing beside you is another session for the purposes of the git index. Cross-lane work belongs to the money lane.

| Lane | Owns | Constraint |
|---|---|---|
| Money (Cursor, or Claude Opus when budget allows) | settlement route, ledger, gate | every PR is a stop |
| Rails (Gemini) | EDI ingestion, migration correctness, ledger charts | spec-driven; the contract names the files to read; an artifact using identifiers not in the tree is discarded before review |
| Ops (Claude Code) | pipeline, deploy, monitors, runbooks, drills — the `operations.md` rows | every deploy is a stop; every monitor proven red and green; every drill chained |
| Mechanical (Qwen, Gemma chained) | enumerations, fixtures, sweeps | bounded contracts; a hit is a path and a description, never an interpretation; Gemma reproduces every Qwen finding before it becomes a task |
| Verifier (Kimi, read-only) | re-runs every landed PR's claims | zero PHI — no BAA on Moonshot |
| Audit (Codex) | one pass per ~20 merges | reproductions, negative controls, refuses to conflate source with production |
| Research (Perplexity) | vendor docs into `ops/reference/` | reference, never a finding |

A model that fails its control is off until it passes a fresh one. MedGemma is off.

## The swarm runs without prompts

Work continuously. A lane that finishes an item takes the next from its queue. A lane blocked on the owner batches the question into its PR body and takes the next unblocked item. The only reason to stop is a hard stop, and even then the lane stops that item, not itself. The orchestrator specifies, reviews money diffs, and rules — it writes no implementation in swarm mode. Local models carry volume; cloud models carry judgment and grounding; nothing is routed to a model that cannot see what it needs.

Full operating model, model routing, turbo mode, and the work ethic: `ops/doctrine/swarm.md`.

## The build loop — continuous iteration on locked checks

The core loop (steps 1–6) proves what a single change does. The build loop proves what repeated autonomous iteration on a feature does. It wraps the same discipline around continuous, unattended work: an agent makes a change, a separate agent scores it against locked criteria, the score decides keep or revert, and a retrospective agent reads the history to update the method. The core loop's step 3 — prove it red — is the seed; the build loop is the plant.

**Locked checks.** Acceptance criteria for a feature live in `checks/<feature-slug>/criteria.md`. The build agent — the lane doing the implementation — literally cannot edit them; a pre-commit hook reads `.shteg/loop-lock.json` and rejects any commit that touches a locked path. This is the separation that makes the loop honest: the agent that writes the code never writes the test. Seven controls in one month passed on their failure path because nothing enforced that separation at iteration scale.

**Score-gated keep/revert.** After each iteration the scoring agent (Kimi — already read-only, already operates on claims-vs-evidence) runs the checks and returns a numeric score 0–100. If the score improves, the change is kept and the high-water mark in `results/<feature>/current-score.json` is updated. If the score drops or holds, `git checkout .` reverts the working tree. The ratchet is monotonic: the score only goes up. Plateau detection (N rounds with no improvement, configurable, default 5) triggers the retrospective and halts the loop. This is step 4 — verify which mechanism — applied continuously.

**Three-layer memory.** Iteration traces are structured in three layers. Memory wants to be exhaustive; a production prompt wants to be lean. Conflating the two is how method files grow until the agent cannot follow them.

1. **Raw layer** — `results/<feature>/history.jsonl`. Every iteration: what was tried, the score, the diff, the scoring output. Immutable, append-only. This is the evidence base.
2. **Wiki layer** — `wiki/<lane>/failures/<pattern>.md` and `wiki/<lane>/strategies/<pattern>.md`. Structured pages cataloging recurring failure modes and successful strategies, with an evolution log (`wiki/<lane>/evolution-log.jsonl`). The wiki stays out of the build agent's prompt — it is read by the retrospective agent, not the builder.
3. **Skill layer** — `program.md` at repo root. Compact, executable method instructions the build agent reads before every iteration. Updated only by the retrospective agent, only when a proposed change passes the method validation gate.

**The retrospective agent.** On plateau or loop completion, the retrospective agent (Codex — reads evidence, finds patterns, refuses to conflate source with production) reads `results/<feature>/history.jsonl` and the wiki layer, identifies what worked and what failed, and proposes updates to `program.md`. Tactical method goes in `program.md`; structural shapes — the kind that appear in the findings catalog — go there. The retrospective never touches checks or doctrine; those are the invariants.

**Method validation gate.** A proposed `program.md` change is not persisted on faith. The retrospective re-runs the updated method against 3–5 past features' check suites. Only if the average score improves (or holds, with the median improving) does the change land. A method that helps one feature and hurts three is not an improvement. Results are logged in `wiki/<lane>/skill-impact.jsonl`.

**Cross-model skill transfer.** `program.md` is shared across fleet lanes. The wiki layer is per-lane, because different models fail differently — Qwen's failure modes are not Opus's. When the retrospective updates `program.md`, every lane benefits: patterns discovered by expensive models reduce iteration count for cheap ones. The wiki tracks which lane discovered which pattern.

**Token budget gating.** The build loop consumes tokens without human review at each step. `results/budget-calibration.jsonl` tracks tokens-per-score-point by feature type. A feature whose tokens-per-point exceeds 3× the calibrated median triggers an automatic pause and a report to the owner. The loop never runs open-ended — this is E1 applied to iteration cost.

**Fleet lane roles in the loop.**

| Role | Lane | Why |
|---|---|---|
| Builder | The lane that owns the feature | writes the implementation |
| Scorer | Kimi (Verifier) | read-only, zero PHI, already operates on claims-vs-evidence |
| Retrospective | Codex (Audit) | reads evidence, finds patterns, refuses to conflate source with production |

**Control-plane integration.** Loop events are PRIVMSG frames on the mIRC/Redis bus: `LOOP:START`, `LOOP:SCORE` (with score and delta), `LOOP:REVERT`, `LOOP:PLATEAU`, `LOOP:RETRO`, `LOOP:DONE`. The build agent's worktree is leased via DLM — the agent holds the lease for one iteration, and a crashed agent's lease expires. Scoring output over the frame-size limit uses the Claim Check pattern. Every event is hash-chained in the tamper-evident log.

**Sandbox vs production tier.** The build loop operates in sandbox tier: unattended, automated scoring, no deploy. When the score crosses the acceptance threshold defined in the checks, the loop stops, the PR opens, and the feature enters the normal doctrine flow — four stops, two-track merge, the owner lands. The loop accelerates iteration; it does not bypass the gate.

**The operating loop — the same shape, one tier up.** The build loop ends at a PR. The operating loop begins at a serving digest and runs the same ratchet against production. Its locked checks are the go-live gate rows for that product — `checks/operate-<product>/criteria.md` is generated from `operations.md` and locked the same way. Its scorer is the monitor estate: OP-05 monitors proven red and green are the `score.sh`. Its score is weighted rows closed, Tier A rows weighted so that no Tier B row can lift the score past the Tier A threshold. Its revert is OP-10: a row that opens after closing pins the previous digest and pages. Its retrospective reads production evidence — the hash-chained log, the drill records — and writes to the same `program.md` and wiki, because what the fleet learned shipping a product is what it needs to know running it. The loop that proves code works and the loop that proves production runs are one mechanism pointed at two tiers; a repo that has the first and not the second has built a faster way to arrive at "implemented."

**Point the loop at the product's event, not at the substrate.** A locked check that scores platform completeness — ledger coverage, module count, abstraction depth — will be satisfied by a platform nothing depends on. The first `checks/` folder in any product scores the dependency event (below): the claim that came back, the application that was submitted, the transaction a stranger saw itemized. Substrate work earns its score only through the event it moves.

Full file tree, wiring details, and the wiki layer specification: `ops/doctrine/build-loop.md`.

## The estate — a product is operating when someone else would notice it stopped

The repo rules keep one product honest. The estate rules keep the portfolio honest, and they are the same rules with the product as the unit. Measured Oct 2026: twenty-odd products, most implemented, two patents, none operating. The fleet was not slow; the estate had no WIP limit and no product had named the moment it would start to matter to someone outside.

**Every product is in exactly one of four states, and the report says which.**

| State | Means | Leaves it when |
|---|---|---|
| `parked` | not now; has a named reopen condition | a WIP slot is free **and** its dependency event is written |
| `building` | holds a WIP slot; lanes may spawn | Tier A of its go-live gate closes → `gated`; or 14 days with no gate row moved → yields the slot, back to `parked` with the reason |
| `gated` | past Tier A; nobody outside depends on it yet | the dependency event is evidenced (E3) → `operating`; 30 days gated is reported with age every time |
| `operating` | an outside party depends on it and would notice if it stopped | never demoted silently; losing its dependent is a P1 with a finding |

**The dependency event.** One sentence per product, written before building opens, naming the first moment an outside party relies on it: *an 835 returns from a real payer against a claim submitted under Shteg's NPI, the advance funded and reconciled.* *One enrollment application is received by a state agency from a SightBridge eligibility result.* *A bank customer who is not the owner sees a transaction itemized.* The test for the sentence: name the party, name what they receive, and ask who notices when it stops. If the answer is the owner, it is not an event — it is a demo. A product without the sentence is `parked` by definition, whatever its commit count. Patents, scaffolds, demo shells, PRDs, and substrate layers are not events; they are listed as evidence toward one or they are not listed.

**WIP limit: two.** At most two products in `building` at once across the whole estate, because the constraint is the owner's queue and it does not scale with lanes. The two are named in `ops/estate.json` with their events and their `since` dates. A third product does not open until one of the two reaches `gated` or yields. The fleet keeps working — on the two. E1 says finish before starting; the WIP limit is the mechanism that makes the fleet obey it when the owner would not.

**Windows.** A product whose event has a calendar — an enrollment season, a payer's contracting cycle, a conference — carries the window as `(due:)` on its estate line. If the event cannot land inside the window, the product is parked on that date with a reopen set to the next window, never carried half-built through the off-season consuming a WIP slot. Missing a window is a finding (B-05) with a date; carrying through it is a worse one.

**The barrier catalog.** Products stall for a short list of reasons, and each has a known unblocking move: the owner's queue (B-01), an unnamed event (B-02), a credential-only step (B-03), a vendor or counterparty gate (B-04), a window (B-05), scaffold counted as progress (B-06), substrate built ahead of the event (B-07), a patent or document treated as a milestone (B-08). `ops/doctrine/barriers.md` is the index. A product `gated` for 30 days or `building` for 14 without a row moved is retrieved against the catalog in its next report — the same retrieval step as the findings catalog, one layer out.

**Channel is a product, on its own limit.** A distribution relationship — a vendor's install base, a bank's practice portfolio, a sponsor FI — has an event too (the first customer who came through it) and is reported in the same four states. Channels hold a separate limit of two in `building`, not a product slot, because channel work is paced by the owner's calendar rather than the owner's queue and does not compete with lanes for the fleet. The estate measured Oct 2026 had several relationships in progress and none on any list; relationships that are not on the list do not get finished.

Full state machine, `estate.json` schema, promotion proofs, and the estate roll-up: `ops/doctrine/estate.md`.

## Efficiency — the rules that determine the date

The fleet's throughput is not the constraint. Scope, merges, and deploys are. See `ops/doctrine/efficiency.md` for E1–E9; the three that matter most:

**E1 — Finish before starting.** Nothing new opens until the current stop clears. Every audit sweep found real things, and every sweep was a day the route did not move.

**E3 — A status claim carries its evidence.** "B5 done" cost nothing to say and a week to discover false.

**E9 — The report describes production, not `main`.** A fleet that lands ninety commits nobody deploys has the same throughput as a fleet that lands none.

## The rail runs — operations

The build doctrine proves what the code does. The operations rules — `ops/doctrine/operations.md`, OP-01 through OP-16 — prove what production runs, that someone is told when it stops, and that it comes back. Each names its finding and its **enforcement class** (CI, LINT, REPORT, DRILL, or REVIEW); a rule that is REVIEW-only is the weakest in the estate and is listed as such in every report. A rule with no finding behind it is parked, not adopted. The ones to hold in mind on every task:

**OP-01 — The serving digest is the product; `main` is a claim.** Five numbers in every report: digest, build SHA, commits behind `main`, age, and which Track 1 paths sit in the gap. Ninety docs commits is hygiene; one undeployed settlement commit is P1.

**OP-02 — The deploy tooling is the fuse.** A commented arming line in deploy tooling is a loaded round: deleted, or given a stated arming condition. CI actions pinned by SHA.

**OP-03 — `skipped` is not `passed`.** A workflow that has only ever skipped has proven nothing. Identity bindings are printed by a script and pasted into the proof, never assumed.

**OP-04 — Unset fails closed, everywhere.** `!== 'false'` is inverted on sight; a lint with a planted probe enforces it; a startup assertion refuses to run without a Track 1 variable; staging-vs-production differences are declared in a matrix or the diff job fails.

**OP-05 — A monitor is sequenced after its subject exists.** Red by design trains everyone to ignore red. First green is an event; every red after it is brought untouched. Teardown proven on the red path. VACUOUS is failure.

**OP-07 — An alert is a signal, a threshold, an owner, and a page — or it is a dashboard.** And the pager is monitored by the pager: an external heartbeat that pages on silence, because the estate's failure mode is not a red alert but perfect silence read as health.

**OP-08 / OP-09 — A runbook is executed before it is trusted; a backup is a hope until restored.** Run by someone other than its author. Quarterly restore drills on every datastore including Terraform state, Secret Manager, and the anchor keys — the three that make a database restore useless if missing.

**OP-10 — Rollback is a revision, not a revert.** Code rolls back by pinning a digest, rehearsed and timed. The ledger never rolls back; it is compensated. `ops/irreversible.md` lists everything that cannot be undone.

**OP-14 / OP-15 / OP-16 — A single owner is a finding; money jobs are idempotent and singly scheduled; a vendor's failure mode is part of the design.** No vendor client is armed in production until it has authenticated read-only against production, recorded.

**Four states, reported as four: specified, implemented, gated, operating.** "In place" is not a state; "closed at design" is not a state; "deployed" is not a state. The go-live gate accepts only the third; only an outside party's dependence confers the fourth. A control, like a product, is operating when someone other than its author would notice it stopped — for a monitor that is the pager; for a product it is the dependency event.

**Severity attaches when a gate row closes, not before.** An unbuilt control is BLOCKED with an age; it does not page. A severity ladder applied to an unbuilt estate is the red-by-design check at scale.

**The go-live gate** — G-OP-1 through G-OP-20, stable ids, in `operations.md`, in two tiers. **Tier A** (fourteen rows) is the first real dollar at the pilot practice: every row maps to money moving wrongly or invisibly. **Tier B** is the second practice or any outside money. Deferral is one mechanism — owner, in writing, with a compensating control and a reopen date — and a deferral past its date is itself a trigger. Numbers marked `[placeholder]` were chosen for shape, not measured, and are replaced by PR before their row closes.

## Work items — a deadline is written once

A deadline lives on the line where it was decided, as a field, and nowhere else: `(due: YYYY-MM-DD)`, one field per pair of parentheses. `This-week.md` is regenerated from those lines and is never edited. Measured on shtegmed before the rule was written: 22 future dates in the tree and none machine-readable, one compliance deadline restated in eleven places, a deferrals table whose age column was kept by hand, and a ticket ledger 84 days stale with nothing showing it.

| Field | Value | Meaning |
|---|---|---|
| `due` | real `YYYY-MM-DD` | when it is owed |
| `since` | real `YYYY-MM-DD` | when it was raised — every age is computed from this |
| `stop` | `money` · `chain` · `tenant` · `prod` | which of the four stops makes it the owner's decision |
| `kind` | `decision` · `execution` | on a stop line: whether the owner's judgment or only their keystroke is needed — `execution` lines are standing-approval candidates and are counted in the report |
| `state` | `parked` · `building` · `gated` · `operating` | on a product's estate line: which of the four estate states it is in |
| `event` | one sentence | on a product's estate line: its dependency event — the party, what they receive |
| `owner`, `id`, `after`, `gate`, `evidence`, `status`, `updated` | text | detail on an item |

- **`due`, `since`, `stop` and `state` make a line a work item.** The other fields are read only on a line that already has one of those; `(owner: Lippi)` in a sentence stays a sentence.
- **Three carriers.** A field inline on any line — bullet, checkbox, heading, table cell. `<!-- work-items: table field=Column … -->` on the line above a table, mapping its columns; a row of dashes is a placeholder, so an empty table reads as a real zero. `<!-- work-items: checkboxes owner=… -->` to opt a file's checkboxes in, `<!-- work-items: off -->` to end it.
- **Fenced code, inline code and HTML comments are inert.** Quote an example in a fence.
- **Never copy a deadline into a second file.** Link to the line. Never edit the roll-up. Tick a checkbox only with `(evidence: …)` — E3.
- **A stop raised in a document carries `(stop: …) (since: …)`.** That is what puts it on the owner's list with a computed age. Take BLOCKED ages from the roll-up, not from memory: an age that was typed is an age that was true once.
- **Regenerate:** `npm run week` in shtegmed, which reads every repo listed in its `ops/estate.json`. A repo needs nothing installed to take part — fields in its Markdown and a line in that file. A repo the machine does not have is printed as COULD NOT LOOK, never as empty.
- **The gate is `scripts/lint-work-items.mjs`** (WI-01…WI-11): a mistyped key, an impossible date or a second value fails; a future date written in prose only warns. **In a tree that does not have that script, nothing enforces the grammar there — report it as REVIEW class, not as checked.** The roll-up is REPORT class everywhere: it tells whoever opens it and pages no one.

Full grammar, codes, enforcement classes and red proofs: `ops/doctrine/work-items.md` in shtegmed.

## Applying this to any project

The doctrine was paid for on Shteg. It is not about Shteg. Every rule generalizes; only the file paths are local. On a new or different repo:

**The four stops translate directly.** Money movement is any code that charges, refunds, transfers, or holds funds — Itemizit's split orchestration, Korabi's Duffel bookings, FedPay's auction settlement. Chain format or signing is any hash chain, ledger, or cryptographic commitment. Tenant isolation is any boundary between one customer's data and another's. Production writes, migrations, IAM, key material, and deploys are the same everywhere.

**Track 1 paths are whatever holds money, auth, isolation, schema, or the deploy fuse in that repo.** Name them in the repo's own `ops/doctrine/` on day one, before the first PR. A repo without a named Track 1 has no merge gate, and a merge gate is the entry point that has caught every money defect so far.

**The catalog shapes are universal.** A guard on one of two doors, a mock more permissive than the real client, a docstring that is true and stops people looking, a control named for a property that is not evidence of the property, a grep gate a comment satisfies, a workflow that only ever skipped, a flag that is on when unset — none of these are healthcare shapes. Retrieve from the catalog before every task regardless of repo; when a new shape is found, it goes into the catalog with the repo and PR named.

**The go-live gate translates directly.** Every project that will take a real user's money or data has the gate rows in two tiers — first real dollar, then outside money — with the numbers (drift threshold, restore cadence, load multiple) set for that project in its `ops/doctrine/`. A project with no go-live gate has no definition of live.

**The swarm model is the same.** One agent per worktree. Lane contracts naming the files to read. Local models on volume, cloud on judgment. Kimi verifies, Codex audits, the builder never self-certifies. A model that fails its control is off.

**The build loop translates directly.** Any feature with acceptance criteria that can be scored numerically — test pass rate, lint score, benchmark, compliance checklist — can run under the loop. Create `checks/<feature-slug>/` with the criteria, lock the folder in `.shteg/loop-lock.json`, and let the assigned lane iterate. The three-layer memory structure (`results/`, `wiki/`, `program.md`) is repo-level, not Shteg-specific. On a repo without Kimi, any read-only model or deterministic script can score; on a repo without Codex, any model that reads evidence without conflating it with source can run the retrospective. The constraint is separation, not the model name.

**The estate rules translate directly — and they are the ones most likely to be skipped.** A new idea does not open as `building`; it opens as `parked` with its dependency event written and its reopen condition named, and it waits for a WIP slot like everything else. Enthusiasm is how the estate reached twenty products and zero operating. The one question that admits a product to `building`: who, outside this company, receives what, and would they notice if it stopped?

**Starting a new project, the first seven things:**
0. The dependency event, one sentence, in `ops/estate.json` — and the estate's WIP count checked. If both slots are held, the project is `parked` here, with everything below deferred to its reopen date.
1. `ops/doctrine/` with the Track 1 paths for this repo, including its deploy tooling, copied from the skill's references.
2. The parked list — everything not on the critical path, with its gate.
3. One milestone that is the whole point, stated in one sentence. For Shteg it was one real claim end to end. Nothing on the parked list opens until it is met.
4. The go-live gate, with this project's numbers filled in, before the first deploy.
5. The stops, in the brief, before the first lane spawns.
6. `checks/` with locked acceptance criteria for the first feature — scoring the dependency event, not the substrate — `program.md` seeded empty, and `.shteg/loop-lock.json` listing the locked paths, before the first build loop runs.
7. The deploy pipeline, operating: continuous deployment to sandbox, promotion as a standing approval, serving digest in the first report. Before the second feature opens.

**What does not carry over:** Shteg's specific file paths in this file and the references, and the Shteg-specific findings in the catalog (the 835 join key, the reserve tiers, Column's idempotency, the WIF provider bound to `shte-ai/statmd`). Read those as examples of the shape, not as rules about the repo you are in.

## References

- `ops/doctrine/swarm.md` — the operating model: autonomous loop, topology, model routing by demonstrated ability, load balancing across local and cloud, turbo mode, the work ethic, and the swarm's own failure modes. **Read when running, resuming, or re-planning the fleet.**
- `ops/doctrine/standing-practices.md` — SP-01 through SP-20 and every named rule since, each with the finding that earned it. Read before a review or when a rule is cited by number.
- `ops/doctrine/findings-catalog.md` — the shapes this estate has found, by pattern, with the PR where each was caught; section 10 is the deployment and environment shapes and doubles as the findings → rules registry for operations (rule, gate, state per entry). **Read before starting any task**; this is the retrieval step.
- `ops/doctrine/operations.md` — definitions and enforcement classes, OP-01 through OP-16, the trigger table, the tiered go-live gate G-OP-1 through G-OP-20, deferrals, open questions, and the parked list. **Read before any deploy, monitor, runbook, drill, or claim about what production runs.**
- `ops/doctrine/efficiency.md` — E1 through E9, the owner-facing rules.
- `ops/doctrine/work-items.md` (in the shtegmed repo) — the `(due: …)` grammar, the table and checkbox directives, the WI lint codes, and how `This-week.md` is regenerated. Read before writing a date something is owed by, a deferral row, or a BLOCKED list.
- `ops/doctrine/briefs.md` — how to write a fleet brief: what a lane contract needs, what a stop looks like written down, the parked list and its gate.
- `ops/doctrine/build-loop.md` — the build loop: locked checks, score-gated keep/revert, three-layer memory (raw → wiki → skill), the retrospective agent, method validation gate, cross-model skill transfer, token budget gating, control-plane integration, the operating loop, and the full file tree the loop adds to a repo. **Read before running continuous iteration on a feature, writing checks, or configuring `program.md`.**
- `ops/doctrine/estate.md` — the four product states and their promotion proofs, the dependency event and its test, the WIP limit, windows, standing approvals and the decision/execution split, `ops/estate.json`, and the estate roll-up. **Read before opening a new product, spawning a lane on one, or writing the ESTATE line.**
- `ops/doctrine/barriers.md` — B-01 through B-08: the shapes that hold a product at `building` or `gated`, how each shows in the report, and the unblocking move. **Read when a product has not moved a gate row in 14 days or has been gated 30.**

## What this doctrine is not

It is not a style guide, it is not caution for its own sake, and it is not a maturity model. Every rule here was paid for by a specific defect on a platform that moves patient money, and the reference files name the defect. When a rule seems to slow something down, read the finding that produced it before deciding it does not apply.