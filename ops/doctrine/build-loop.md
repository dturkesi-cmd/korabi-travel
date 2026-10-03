# Build Loop — continuous iteration on locked checks

The build loop is the doctrine's mechanism for repeated autonomous iteration on a feature. An agent makes a change, a separate agent scores it against locked criteria, the score decides keep or revert, and a retrospective agent reads the history to update the method. This reference covers the full specification; the core rules are in the SKILL.md section "The build loop."

## Locked checks

Acceptance criteria for a feature live in `checks/<feature-slug>/`. The folder contains:

- `criteria.md` — the acceptance criteria in natural language, scored 0–100
- `score.sh` (optional) — a deterministic scoring script that supplements or replaces model-based scoring

The build agent cannot edit anything under a locked path. Enforcement:

1. `.shteg/loop-lock.json` lists every locked path as an array of glob patterns.
2. A pre-commit hook reads the manifest and rejects any commit that touches a locked path by the build agent's identity.
3. Only the owner (human) or the orchestrator can modify `.shteg/loop-lock.json` itself — it is a stop-class artifact.

Writing the checks is the design step. It happens before the loop starts, not during. The checks define what "done" means; the loop finds how to get there.

### What makes a good check

- **Scorable.** The criteria must produce a numeric score 0–100. "The page loads" is pass/fail; "the page loads in under 2s, renders all components, passes accessibility audit" is scorable.
- **Observable.** The scoring agent must be able to evaluate the criteria by reading the code, running the tests, or inspecting the output — without executing the build agent's intent.
- **Stable.** Criteria that change mid-loop invalidate the score history. If the criteria need changing, stop the loop, update the checks (owner action), reset the high-water mark, and restart.

## Score-gated keep/revert cycle

Each iteration follows this sequence:

```
1. Build agent reads program.md
2. Build agent makes a change (one commit)
3. Scoring agent runs checks/<feature-slug>/ against the working tree
4. Score returned as integer 0–100
5. If score > current high-water mark:
   - Keep the commit
   - Update results/<feature>/current-score.json
   - Append to results/<feature>/history.jsonl
6. If score <= current high-water mark:
   - git checkout . (revert)
   - Append to results/<feature>/history.jsonl with revert flag
7. If plateau detected (N consecutive non-improvements):
   - Trigger retrospective
   - Halt loop
```

### High-water mark

`results/<feature>/current-score.json`:
```json
{
  "feature": "<feature-slug>",
  "score": 73,
  "iteration": 12,
  "commit": "abc123f",
  "timestamp": "2026-10-03T14:22:00Z"
}
```

The ratchet is monotonic. The score only goes up. A revert restores the working tree to the state that produced the current high-water mark.

### Plateau detection

Default: 5 consecutive iterations with no score improvement. Configurable per feature in the checks folder as `plateau-threshold` in `criteria.md` metadata. On plateau:

1. The loop halts.
2. `LOOP:PLATEAU` event emitted on the control plane.
3. The retrospective agent is triggered.
4. After retrospective completes, the loop may resume with the updated `program.md` — or the owner decides the feature needs human attention.

### Acceptance threshold

When the score crosses the threshold defined in `criteria.md` (default: 90), the loop stops with `LOOP:DONE`. The feature is ready for human review. The PR opens automatically with the full iteration history linked.

## Three-layer memory

### Raw layer — `results/<feature>/history.jsonl`

One JSON line per iteration:

```json
{
  "iteration": 12,
  "timestamp": "2026-10-03T14:22:00Z",
  "score": 73,
  "previous_score": 68,
  "delta": 5,
  "kept": true,
  "commit": "abc123f",
  "diff_summary": "Added retry logic to payment processor",
  "scoring_output": "...",
  "tokens_used": 4200,
  "lane": "money",
  "model": "claude-opus-4-6"
}
```

Immutable, append-only. Never edited after write. This is the evidence base for the retrospective.

### Wiki layer — `wiki/<lane>/`

Per-lane structured knowledge. Two categories:

**Failure modes** — `wiki/<lane>/failures/<pattern-slug>.md`:
```markdown
# <Pattern name>

## Description
What goes wrong and why.

## Instances
- Feature X, iteration 5: <what happened>
- Feature Y, iteration 12: <what happened>

## Countermeasure
What the retrospective learned to do instead.

## Status
active | retired | superseded-by:<other-pattern>
```

**Strategies** — `wiki/<lane>/strategies/<pattern-slug>.md`:
Same structure, documenting what works rather than what fails.

**Evolution log** — `wiki/<lane>/evolution-log.jsonl`:
```json
{
  "timestamp": "2026-10-03T15:00:00Z",
  "action": "create|update|retire",
  "page": "failures/off-by-one-in-batch-loops",
  "reason": "Seen 3 times across features X, Y, Z",
  "feature": "<feature-slug>"
}
```

**Skill impact tracker** — `wiki/<lane>/skill-impact.jsonl`:
```json
{
  "timestamp": "2026-10-03T15:05:00Z",
  "proposed_change": "Add 'check batch boundary conditions before submit' to program.md",
  "validation_features": ["feature-a", "feature-b", "feature-c"],
  "scores_before": [82, 75, 90],
  "scores_after": [84, 78, 89],
  "average_delta": 1.3,
  "median_delta": 3.0,
  "accepted": true
}
```

The wiki layer stays out of inference. The build agent never reads it. The retrospective reads it to avoid rediscovering known patterns. This is the separation: memory is exhaustive, the prompt is lean.

### Skill layer — `program.md`

Compact method instructions. Read by the build agent before every iteration. Updated only by the retrospective agent, only after passing the method validation gate. Example structure:

```markdown
# Method

## Before each iteration
- Check batch boundary conditions before submitting
- Verify retry logic handles partial failures
- Test with empty input, single item, and boundary-size batch

## Known patterns to avoid
- Off-by-one in loop bounds when processing paginated results
- Swallowing errors in catch blocks instead of propagating

## Approach preferences
- Prefer explicit error types over generic catches
- Use guard clauses early rather than deep nesting
```

`program.md` is shared across all fleet lanes. It is the cross-model transfer mechanism: what Opus discovers, Qwen benefits from.

## Method validation gate

A proposed change to `program.md` is validated before it persists:

1. Retrospective proposes a change to `program.md`.
2. The proposed version is tested against 3–5 past features' check suites.
3. Acceptance criteria:
   - Average score across test features improves, OR
   - Average holds and median improves (the change helps more features than it hurts).
4. If accepted: `program.md` is updated, result logged to `skill-impact.jsonl`.
5. If rejected: proposal is logged with rejection reason, `program.md` unchanged.

A method that helps one feature and hurts three is not an improvement. The gate prevents method drift — the gradual accumulation of instructions that helped once and now harm.

## Token budget gating

`results/budget-calibration.jsonl` tracks tokens-per-score-point by feature type:

```json
{
  "feature": "<feature-slug>",
  "feature_type": "api-endpoint|ui-component|data-pipeline|...",
  "total_tokens": 84000,
  "total_score_gain": 45,
  "tokens_per_point": 1867,
  "iterations": 18,
  "timestamp": "2026-10-03T16:00:00Z"
}
```

Thresholds:
- **Pause**: tokens-per-point > 3× calibrated median for this feature type.
- **Alert**: tokens-per-point > 2× calibrated median.
- **Report**: included in every `LOOP:DONE` event.

On pause, the loop halts and the owner is notified with the budget report. The loop never runs open-ended.

## Control-plane integration

Loop events are PRIVMSG frames on the mIRC/Redis bus:

| Event | Payload | When |
|---|---|---|
| `LOOP:START` | feature, lane, model, checks hash | Loop begins |
| `LOOP:SCORE` | feature, iteration, score, delta, kept | After each scoring |
| `LOOP:REVERT` | feature, iteration, score | On revert |
| `LOOP:PLATEAU` | feature, iteration, streak length | Plateau detected |
| `LOOP:RETRO` | feature, program.md delta, accepted | Retrospective result |
| `LOOP:BUDGET` | feature, tokens-per-point, median, ratio | Budget threshold crossed |
| `LOOP:DONE` | feature, final score, iterations, total tokens | Loop complete |

**DLM leases.** The build agent's worktree is leased via the Redis DLM (atomic Lua CAS). The agent holds the lease for one iteration at a time. A crashed agent's lease expires after the configured TTL. No two agents iterate on the same feature concurrently.

**Claim Check.** Scoring output that exceeds the PRIVMSG frame-size limit is stored as a claim check (reference in the frame, payload in Redis with TTL).

**Hash chain.** Every loop event is hash-chained in the tamper-evident Ed25519 DSSE log alongside all other control-plane events.

## File tree the loop adds

```
checks/
  <feature-slug>/
    criteria.md            # locked acceptance criteria (scored 0–100)
    score.sh               # optional deterministic scoring script
results/
  <feature-slug>/
    history.jsonl          # per-iteration log (raw layer)
    current-score.json     # high-water mark
  retrospective-log.jsonl  # per-feature retrospective summaries
  budget-calibration.jsonl # tokens-per-score-point by feature type
wiki/
  <lane>/
    failures/
      <pattern-slug>.md    # recurring failure-mode page (wiki layer)
    strategies/
      <pattern-slug>.md    # successful strategy page (wiki layer)
    evolution-log.jsonl    # wiki page create/update/retire events
    skill-impact.jsonl     # proposed program.md changes + validation results
.shteg/
  loop-lock.json           # manifest of locked check folders
program.md                 # shared method file (skill layer)
```

## What the checks must score

The first `checks/` folder in any product scores the product's **dependency event** (`estate.md`) — the moment an outside party first depends on it — or the gate rows that lie between here and that event. It does not score platform completeness, module coverage, abstraction quality, or substrate depth. A locked check that scores the substrate will be satisfied by a substrate nothing uses (barrier B-07), and the ratchet will climb toward a product that is implemented and not operating.

Writing the criteria: start from the event sentence, list the gate rows between the current state and the event, and weight them so that the acceptance threshold is unreachable without the rows that touch the outside party. A check suite that can reach 90 with the 835 still unreturned is mis-weighted.

## The operating loop

The build loop ends at a PR. The operating loop begins at a serving digest and runs the same ratchet against production, one tier up.

| Build loop | Operating loop |
|---|---|
| `checks/<feature>/criteria.md` — acceptance criteria | `checks/operate-<product>/criteria.md` — generated from the product's go-live gate rows in `operations.md`, locked the same way |
| Scorer: Kimi runs the checks | Scorer: the monitor estate — OP-05 monitors proven red and green are the `score.sh`; Kimi reads their output and the hash-chained log, never the code |
| Score: 0–100 on the criteria | Score: weighted rows closed; Tier A rows weighted so no combination of Tier B rows reaches the Tier A threshold |
| Revert: `git checkout .` | Revert: OP-10 — a row that opens after closing pins the previous digest and pages; the ledger is compensated, never rolled back |
| Plateau → retrospective | Plateau (no row closed in N days) → retrospective **and** barrier retrieval (`barriers.md`) |
| Retrospective reads `history.jsonl` | Retrospective reads production evidence: the log, drill records, monitor history |
| Writes `program.md`, wiki | Writes the **same** `program.md` and wiki — what the fleet learned shipping the product is what it needs to know running it |
| Ends: PR opens | Ends: event evidenced → product `operating` |

The two loops share the memory layers. A failure mode discovered in production (a monitor that went red on a path the build loop never scored) becomes a wiki page the build loop's retrospective can read, and the next feature's checks score that path. A strategy discovered in the build loop (a test shape that caught a class of defect) becomes a monitor shape in the operating loop.

Events on the control plane carry a tier field: `LOOP:SCORE tier=build` or `tier=operate`. The DLM lease for the operating loop is on the product's production environment, not a worktree — one operating-loop run per product at a time, and a crashed run's lease expires before the next monitor cycle.

A repo that has the build loop and not the operating loop has built a faster way to arrive at "implemented."

## Sandbox vs production tier

The build loop operates exclusively in **sandbox tier**:

- Automated scoring, no human in the loop per iteration.
- No deploy capability. The loop writes code and tests; it never arms, migrates, or serves.
- DLM-leased worktrees, isolated from production branches.

When a feature completes the loop (score crosses acceptance threshold), it transitions to the normal doctrine flow:

1. PR opens with the accumulated changes and linked iteration history.
2. Four stops apply as usual.
3. Two-track merge rules apply — the loop's output is reviewed like any other code.
4. The owner lands.

The loop accelerates iteration; it does not bypass the gate.
