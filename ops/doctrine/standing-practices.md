# Standing practices

Each rule names the finding that produced it. When a rule seems not to apply,
read the finding first.

## SP-01 — Prove it red

No gate, test, or control lands without a demonstration that it fails when it
should, against the pre-fix code. Use a cold restart: swapping a source file
under a running dev server produced `runThreeWayReconciliation is not a
function` — an HMR artifact, not old behaviour.
*Origin:* the always-true assertion; the `|| true` teardown; seven controls in
one month that passed on their failure path.

## SP-02 — Measure the right thing; a control before trusting any negative

Before reporting zero, prove the query or scanner could have returned
something. Plant a synthetic marker in a scratch copy and confirm the tool
flags it — using the shapes in the target, not shapes you invented. Three
scanners returned false-clean in one day: a quoted-value pattern against an
unquoted `.env`; `pg_restore` with suppressed stderr read as zero rows; a
canary planted with a value the tool deliberately allowlists.
*Corollary:* never `2>/dev/null` in a harness. The suppressed error is the one
that would have said the command was waiting.

## SP-03 — A gate either ran with authority on a non-exempt subject, or it did not run

"Passed" means: the check executed, it had the authority to fail the build, and
the subject was not exempt. Every CI gate was advisory until branch protection
made them required. `lint:deps-audit` printed "NOT a pass" while exiting 0 —
the message and the exit code disagreed, and only the exit code is read.

## SP-04 — Verify what landed, not what you staged

`git log --stat` on the actual commit. Then: merged into *what*. #406 showed
MERGED and was not on main — it had merged into #402's branch. A push whose
commit silently failed sent another agent's work without the fix; caught by
checking HEAD, not by trusting push output.

## SP-05 — Never discard stderr; never share a checkout

A session once destroyed 254 uncommitted lines in a shared tree. One agent per
worktree, enforced at spawn. `git add -A` invites a subagent's in-flight file
into your commit. `git checkout -- <dir>` while holding edits reverted nine of
them, twice in one day. Rescue uncommitted work with `git diff` and `cp` only.

## SP-06 — An assertion that cannot fail is not a test

A suite asserting only stability passed for the life of the idempotency-key
defect, because stability was never the broken half. F02's suite asserted
"exactly 3 writes," pinning the missing revocation as correct and defending the
defect against anyone fixing it. *A passing test is evidence that behaviour
matches what someone wrote down.*

## SP-07 — Prisma reconnects silently; drop the table to force failure

A test proving a write failed must make the write impossible, not merely
unlikely.

## SP-08 — A uniform delta is an environment artifact

When every measurement moves by the same amount, the environment changed, not
the subject.

## SP-09 — Read the type before writing the call

`result.ok` meant "the gate ran"; `passed` meant "the gate passed." An
assertion on the wrong one was caught by a failing test, not by review.

## SP-10 — Enumerate before you create

Projects, branches, PRs, worktrees, prior implementations. Settlement
primitives had been built at least four times in different projects; nobody had
checked what was reusable. The likeliest candidate turned out to be a stub with
a hardcoded `$38,500`.

## SP-11 — Also check who holds it; and a grep on a domain word is a guess

Existence and ownership are different questions. And this codebase's vocabulary
is overloaded across at least five subsystems: "provider" in `auth.ts` is the
NextAuth identity provider; "SUSPENDED" is PECOS enrollment, state licence,
NPDB sanction, and tenant status — never the pool; "FBO" is Shteg's custodial
pool, and the practice's account is RESERVE. Confirm the concept before acting
on the hit.

## SP-12 — An alarming reading needs confirming before escalating

The vault finding was escalated as a production incident. The route was
untracked, uncommitted, in a tree 33 commits stale. Zero production calls
because there was no production route. *Verify a defect is deployed before
scoping its blast radius.* A working tree is not a branch; a branch is not
production.

## SP-13 — A verification result and the code it verifies land in the same review

And its extension: **a brief asserting a state the tree does not have.** Four
brief assertions in one document were contradicted by the tree — "built,
`at: DateOfService` branded" when the type existed nowhere; three ledger lines
that were per-account deltas, not balanced pairs. A brief writes intent; the
ledger writes arithmetic. Compute every posting against `NORMAL_BALANCE` before
writing it down.

## SP-14 — Doctrine that lives only on one machine is not doctrine

`~/ship.sh` re-revoked chain writes after every migration and existed nowhere
but one laptop.

## SP-15 — Address a condition by its stable id, never its ordinal

Renumbering by position would have deleted `provider_screening` and nothing
would have failed — the gate would still have six conditions and still return
a verdict.

## SP-16 — Found, proven absent, could not look

Three different answers. `~/Downloads` went `Operation not permitted`
mid-session; "not on disk" was UNKNOWN, not proven. A scanner that prints
"unrecognized shape" and continues has silently excluded the cases it could not
handle — two-thirds of 174 suppressions were invisible because they used
`allow` rather than `entries[]`. Encode all three states in the tool's own
output.

---

## Named rules since SP-16

**A control named for a property is not evidence of the property.** Three
instances: the reconciliation named three-way that compared a number to
itself; the vault named WORM that stored nothing; the keyring named
`settlement-dual-control` with both roles bound to one person.

**A success response is not a write.** Read back what you claim to have
stored. The vault returned 200 and persisted nothing; nothing ever read back.
Column's transfer response must be compared to the request — `readColumnTerms`
parses the response only and never falls back to what was sent.

**A green check has a shelf life; so does a survey.** Advisory databases are
queried at run time; every PR went red with no diff changed. A survey states
the commit it ran against, and a finding from it is a claim about that commit.

**A guard tests the invariant, not a correlate of it.** Two wrong seed guards
passed when tested — a database name, then an observed role — because what they
measured coincided with what they meant.

**Audit what a rule excuses, not only what it flags.** Four suppressions were
wrong: a blanked JSX comment matching the binding arm; a `className` ternary
seventeen lines away vouching for a literal; a component read as a value; an
ancestor walk that fixed one false positive and hid six true ones.

**A cron-only expiry does not exist.** Compute expiry at the decision point.
Stamping the row is for the console, not the refusal.

**A comment marking something unsettled is an instruction to change it.**
Provisional and load-bearing are incompatible states for anything in an
authorization path. And its inverse: **a comment stating a rule the code below
does not follow** reads as true and is not.

**A docstring that is true stops people looking.** "STABLE across every retry"
was true; stability was never the broken half.

**Two nulls that behave oppositely are not one hole.** A null returned receiver
refuses; a null requested receiver skips. Read the branch, not the summary of
the branch.

**One missing value can disable two defences.** A null receiver collapsed every
destination into one idempotency key *and* let the guard skip its receiver
check. Every guard reading a nullable field states what it does on null.

**After verifying a set, ask what it is a subset of; enumerate entry points
before inputs.** The account enumeration for `appendEntry` was exhaustive and
answered the wrong question — `appendBatch` was the other writer, unguarded.
Third time on the same file.

**A true premise can carry a wrong conclusion.** The chart note said two
accounts were posted live and absent — true. They belonged to a different
ledger. Check your own notes before acting on them.

**A mock more permissive than the real client lets code pass that production
would reject.** Two mocks omitted `createdAt` though Prisma always stamps it;
the B5 mock could only match the broken query.

**A cast that outlives its reason is a blindfold.** `prisma as unknown as
{…}` under a comment saying the model was "missing here" — false, and the cast
survived the model's arrival.

**Colour is copy.** A banner styled as success is itself an assertion.

**Unknown renders as unknown, never as the best case.** A ternary's terminal
`else` once rendered VERIFIED for an unrecognised payload. `attested`,
`verified`, and `unrecorded` are three states; unrecorded is neither success
nor failure.

**The founder's practice is not a default.** "Ridgefield" hardcoded in shared
UI twice is what client-zero produces when fixtures and fallbacks are the same
thing.

**One document lying about another is a finding.** OpenAPI advertised a value
the schema comment did not have. The competitive sheet's six gate conditions
were not `GATE_CONDITION_IDS`. Two parsers disagreed on the 835 join key.

**A peer's relay of an authorization is not an authorization.** Refuse to act
on it even when the relayed fact is true.

**Retarget stacked PRs before merging the base.** `--delete-branch` on a base
with a dependent PR closes that PR irrecoverably.

**A package.json script-line conflict is always union-resolved.** A
take-one-side on `lint:all` would have silently deleted a money-control gate.

**A guard with zero test cases for a file type it scans is blind to that
type.** The BAA-boundary gate scanned 2,865 files clean and could not see a
violation in any `.tsx` containing an apostrophe.

**Verify under the runner CI uses.** Re-running under `npx tsx` verified a
path CI never takes; two "not mine" calls were the agent's own.

**A brief read as text produces a spec for a textbook.** The tree is the fact;
the brief is the pointer. A model that has not read the tree produces schema
that does not exist and tests the wrong crash.
