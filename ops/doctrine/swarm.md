# The swarm — how the fleet works without prompts

This is the operating model, not the review standard. It governs how a
multi-model fleet builds continuously, who takes what, when a lane stops, and
how it stays honest at speed.

## Contents

1. The standing mode
2. Topology — one worktree, one lane, one file
3. Model routing — who takes what, and why
4. The autonomous loop
5. Load balancing across local and cloud
6. Turbo mode — what is dropped and what is kept
7. Work ethic — the habits that make speed safe
8. Failure modes of the swarm itself

---

## 1. The standing mode

**Work continuously. Do not wait for a prompt.** A lane that finishes an item
takes the next from its queue. A lane blocked on the owner batches the
question into its PR body and moves to the next unblocked item. The only
reason to stop is a hard stop, and even then the lane stops *that item*, not
itself.

The brief is the orchestration. It lives in `ops/briefs/`, committed to main,
and every lane reads its queue from it. No lane asks another what to do next.
No lane asks the orchestrator for status. The queue says what to do next.

The orchestrator — Claude when budget allows — specifies, reviews money-path
diffs, and rules on stops. It writes no implementation in swarm mode. When it
is budget-limited, it does one thing: review B5-class diffs. Everything else
runs from the brief.

## 2. Topology

**One agent per worktree, enforced at spawn.** Not by instruction — one lineage
wrote to a file despite a read-only prompt. Isolation is a property of the
environment. Three lineages in one tree believing they were the same lane
nearly cost more in coordination than the lane produced.

**One lane per file.** If a lane needs a file another holds, it queues. Cross-
lane work belongs to the money lane. Before any lane starts a new file: who
else holds it. `git add -A` is banned while any agent writes — a subagent
beside you is another session for the purposes of the git index.

**Worktrees are cheap; use them.** `sclit-wt/claude-01`, `sclit-wt/lane2`,
`sclit-wt/gemini`, `sclit-wt/verifier`. Prune dead scratchpads every state
check; fifteen accumulated from one dead session.

## 3. Model routing

Route by what each model has demonstrated, not by what it is marketed for.

| Work | Route to | Because |
|---|---|---|
| Money path, chain, auth, tenant | Cursor (own worktree), or Claude Opus | every PR is a stop; needs a model that reads the tree |
| Spec-driven rails: EDI parsers, ingestion routes, migration correctness | Gemini | strong with the companion guide in hand; the contract must name the files |
| Visual rendering audits: screenshots at five widths | Gemini | the only multimodal lane — it can see the page |
| Heavy enumeration, fixtures, sweeps, mass mechanical edits | Qwen 3.6 (local) | volume at zero per-token cost; `think:true` returns empty — run without it |
| Second opinion on Qwen's output; independent pass on the same target | Gemma 4 (local) | different family, different blind spots; caught a silent-exclusion bug in the orchestrator's own diff |
| Verification of every landed PR | Kimi, read-only | reproduced a 200,000-input NPI differential; no BAA — source only, never data |
| Periodic audit | Codex | the Sep 6 report was the best of the month: reproductions, negative controls, refused to conflate source with production; runs after a phase, never concurrently |
| Vendor docs, specs, regulatory text | Perplexity | reference, never a finding |
| Clinical-content correctness (LOINC, code sets) | MedGemma — **off** | failed its control; accepted an IOP code as visual acuity |
| Accessibility, semantic HTML | Codex | rigor |
| Copy against the ground-truth table | Kimi certifies | the builder never self-certifies |

**A model earns its slot.** Each has a named contract and a control it has
passed. One that fails its control is off until it passes a fresh one. One
whose output required grounding it did not do gets its files named in the
contract, or is not used for that work.

**Gemini's narrowed contract**, specifically: spec-driven only. Any artifact
using identifiers not in the tree is discarded before review. It produced a
B5 spec with invented schema, "Column's four counters" redefined as database
columns, and a SIGKILL inside one transaction — competent, well-formed,
ungrounded. Same failure as Qwen echoing a number from its own prompt.

## 4. The autonomous loop

Each lane, each item:

1. **Retrieve** — the three catalog shapes closest to the work.
2. **Enumerate** — worktrees, branches, PRs, who holds the file. Collision
   check before touching anything.
3. **Build** — under the lane's contract, in the lane's worktree.
4. **Prove it red** — against the pre-fix code, cold restart, a control before
   any negative, which mechanism the assertion exercises.
5. **Verify under CI's runner** — not `npx tsx` if CI uses node-strip.
6. **Stale-base check** — was the gate result measured against current main?
   A green on a base six commits behind is evidence about the old base.
7. **Open the PR** with the SHA, the compile, the test run. If it is a stop:
   the question, three options, the recommendation, what it blocks.
8. **Report** with the NEXT block. Then take the next item.

Kimi re-runs step 4 independently on everything that lands. Gemma reproduces
every Qwen finding before it becomes a task. Codex audits every ~20 merges.

**Standing sweeps, unprompted:**
- Stranded branches — every 5 merges.
- Collision check — before any new file.
- Applied-vs-directory migrations — every 10 merges.
- Hung shells — no output after ten minutes is a failure signal, not patience.
- Present-but-unread fields — after any schema change.

## 5. Load balancing

**Local carries volume.** An M5 Max with 48 GB runs Qwen 3.6 and Gemma 4 well.
Ollama serves one at a time, so they chain — give them long queues so the
chain never idles. Seven-item enumeration queues, not one task each.

**Cloud carries judgment and grounding.** Claude for rulings and money diffs.
Gemini for spec-driven work with the reference in hand. Codex for audit.

**Nothing is routed to a model that cannot see what it needs.** A model asked
to reason about the tree without reading it produces a textbook. A model asked
to reason about a rendered page without seeing it produces a guess.

**Cost discipline:** $1,000 of GCP credit is best spent on the compute the
build already generates — Cloud SQL scratch instances, Cloud Run demo, KMS,
Vertex inference — not on paid search over a corpus a local model indexes for
free. Claude at $20 does one thing: review the diff that matters.

## 6. Turbo mode

When the owner asks for maximum throughput, this is what changes and what does
not.

**Dropped:** per-item checkpoints; design-before-implement on non-money lanes;
orchestrator review of non-money diffs; raw-output-over-summaries outside the
kept rules.

**Kept, because without them the rail can move money wrong and attest that it
did not:**
1. Any gate, control, or check that can return success: prove it red.
2. Every bank balance assertion fetched from the bank API, never the ledger.
3. The eight settlement failure cases, each demonstrated red first.
4. Read back what you claim to have written.
5. The four stops.

Turbo buys days, not weeks. Phase 1 went from seven-to-nine days to four-to-
five; Phase 2 barely moved because its failure cases are the part that stays
verified. The date is decided by whether the failure cases surface a design
flaw, not by how many lanes run.

## 7. Work ethic

These are habits, and they are what the catalog was built from.

**Check your own note before acting on it.** A true premise carried a wrong
conclusion — two accounts "missing" from a chart belonged to a different
ledger. Acting on the note would have made strict enforcement impossible.

**Read the branch, not the summary of the branch.** A recon's framing said a
null "silently skipped" the receiver check. The branch said a null *returned*
receiver refuses and a null *requested* receiver skips. Two nulls, opposite
behaviour, conflated by repeating the summary.

**When a suite disagrees with you, it is evidence before it is an obstacle.**
Two existing tests were right while the implementer was wrong.

**Refuse to invent what you do not have.** Facing a missing second-officer
identity, the agent stopped rather than bind a signing key to a made-up
principal. That is the behaviour to keep; it was demonstrated when nobody was
watching for it.

**Say "not mine" only after the A/B.** Stash the one file, confirm the symbol
is gone from the tree, observe the failure is identical. Two "not mine" calls
in one day were the agent's own, made from the wrong runner.

**Flag your own boundary breaks.** A `--force-with-lease` on a lane branch,
minutes after pushing, harmless — flagged anyway, because the rule has no
lane-branch exception and writing one down is how exceptions become rules.

**Distinguish found / proven absent / could not look.** Always. In the tool's
output, not only in the report written after.

**Verify a defect is deployed before scoping its blast radius.** Present in a
working tree is not present in production.

**A finding in a terminal is not a finding.** Write it to `ops/` or the
catalog the same turn.

**Never announce "done" without the SHA.** "B5 done" cost a week.

## 8. Failure modes of the swarm itself

**Producing faster than the owner can merge.** Eighty-eight PRs waiting is
where throughput dies. The two-track split exists for this; if it is not
being used, the fleet is generating a queue, not progress.

**Rediscovering catalogued shapes.** Guard-on-one-door three times on one
file. Retrieval before each task (E8) is the fix.

**Starting the next thing.** Three products started the week B5 turned out to
have never compiled. E1. The parked list is the efficiency.

**Status claims without evidence.** E3.

**A lane idling because the brief is unmerged.** The contracts lived in an
open PR; lanes reading from main could not see them. The brief is real when it
is on main.

**The owner as the bottleneck, unnamed.** Five owner-held items sat for two
weeks while the fleet reported velocity. E7: name what the owner is holding,
every report.
