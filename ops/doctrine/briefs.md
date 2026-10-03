# Writing a fleet brief

A brief is the orchestration. The fleet does not run from uncommitted docs — a
brief cited as governing but living on an open branch is a claim about doctrine
made from a branch. Commit to `ops/briefs/` first; then the lanes read it from
main.

## Structure

```
# <title> — one line saying what this brief governs

Commit to ops/briefs/ first. <what it supersedes; what still stands>

**Blocked on the owner, do not touch:** <the standing list>

## Lanes
| Lane | Model | Owns | Contract |

## Queues — each lane works its own without asking
**<Lane>.** <ordered items> → <next> → <next>

## Rules that apply to this brief specifically
## Stops — batch, keep building past them
## Parked — do not start, scope, or investigate
```

## A lane contract

Every lane needs four things, or it will drift:

1. **What it owns**, by directory. Isolation is structural — a lane that needs
   a file another lane holds queues; it does not race.
2. **What it never touches.** For non-money lanes: `lib/settlement`,
   `lib/payment`, `lib/rcm`, `packages/attest-core`, `packages/hub-client`,
   `packages/shtegpay`, `lib/auth*`, `lib/session*`, `prisma/`, `scripts/lint-*`.
3. **The files to read first**, for any model that has not read the tree. A
   brief read as text produces a spec for a textbook. "Every assertion names
   which of Column's four counters" became "database columns named Column::"
   because the model never looked at what Column is. Say: "Column's API
   returns `available`, `pending`, `holding`, `locked` — see
   `ops/reference/modern-treasury-and-column.md` §B."
4. **The proof standard.** Prove it red against the pre-fix code. A control
   before any negative. Which mechanism the passing assertion exercises.

## A stop, written down

When a lane hits a stop, the PR body carries:

```
STOP: <which of the four>
Question: <one line — what the owner decides>
Options: 1) <recommended, with the single reason>  2) <alt>  3) <alt>
Blocks: <what cannot proceed until ruled>
```

Then the lane takes the next unblocked item. It does not idle, poll, or ask
for status.

## The parked list

Everything not on the critical path, in phases, each gated on the last:

- **Phase A** — prove the rail is repeatable: the replay, day-0, cutover,
  Ed25519.
- **Phase B** — make it sellable: admin surfaces, the payer conversation with
  numbers, out-of-network claims, ShtegComm.
- **Phase C** — extend the domain: ShtegEdu, surgical Scribe, the document
  toolkit, DicomOS, the NEI challenge.
- **Phase D** — new surfaces: ShtegDNA and its verticals, ShtegIRC, the
  hackathon.

A phase does not start because it is interesting. Anything arriving mid-phase
gets written to the list, not started. If a later item turns out to block an
earlier phase, it moves up and the move is recorded with the reason.

## Model contracts as they stand

| Model | Good for | Not for |
|---|---|---|
| Claude | spec, review, rulings on stops, money-path diffs | volume, when budget-limited |
| Cursor | money-path implementation in its own worktree | merging its own PRs |
| Gemini | spec-driven rails work with the reference in hand; visual rendering audits | anything requiring knowledge of the tree it has not been handed |
| Qwen 3.6 | heavy enumeration, fixtures, scaffolding, mass mechanical edits | naming, interpretation, vendor identification (has invented vendors); `think:true` returns empty |
| Gemma 4 | second family on the same target; reproduces Qwen's findings | primary authoring |
| Kimi | read-only verification; copy certification | anything with PHI (no BAA) |
| Codex | periodic audit, Sep 6 standard | concurrent audit of a moving tree |
| Perplexity | vendor and spec docs into `ops/reference/` | findings |
| MedGemma | off — failed its control (accepted an IOP code as visual acuity and a fabricated LOINC) | anything, until it passes a fresh control |

## The reporting protocol

Every report ends with the NEXT block and nothing after it. Option 1 is the
recommendation and the default. Three options maximum, each answerable with a
digit. YOU RUN is only what credentials or the classifier prevent. BLOCKED is
the standing list with ages, oldest first, and is the only place a lane may
remind the owner.
