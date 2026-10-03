# Findings catalog — shapes this estate has already found

This is the retrieval index. Before starting a task, find the shapes closest to
the work. Each entry: the shape, where it was found, what it looked like from
the outside, and the control that catches it.

## Contents

1. Controls that cannot fail
2. Documented but not wired
3. Two sources of truth
4. Silent failure on a success path
5. Identity and vocabulary
6. Guards on one door
7. Tests that defend defects
8. Money-specific shapes
9. Fleet and process shapes

---

## 1. Controls that cannot fail

**The reconciliation mirror.** Three-way tie-out's bank leg was
`availableBalanceCents + holdingBalanceCents`; the first was set from the same
`getBalance()` the ledger side used, the second was `@default(0)` with no
writer. Variance structurally zero. BALANCED reported on every run. A
settlement gate condition that had never been capable of firing.
*From outside:* a control that always passes. *Catch:* every balance
assertion names an external source; the verdict is UNVERIFIED until it does.

**The deps-audit gate exiting 0 on outage.** Printed "NOT a pass" while
returning 0; text and exit code disagreed; only the exit code is read.
*Catch:* a `--selftest` that runs the tooling-failure branch in CI.

**The grep gate a comment satisfied.** #667 grepped for control names;
explanatory comments moved into the file it grepped; from that commit deleting
both real assignments left the gate green. *Catch:* `strip-non-code` before
any grep; a planted probe where the string exists only in a comment must fail.

**The BAA-boundary gate blind to apostrophes.** `<p>Don't share</p>` opened a
string that stayed open, inverted parity, and a real `fetch(` landed in code
position where `//` blanked it. 2,865 files "clean." `strip-non-code` had zero
JSX test cases. *Catch:* a planted-probe suite per file type the gate claims
to cover, with a control proving the probe fires.

**The docstring that stops people looking.** "STABLE across every retry" —
true. Stability was never the broken half. *Catch:* assert both halves of any
property; ask which half a green test actually exercises.

## 2. Documented but not wired

**The evidence vault.** `fallbackClient` passed unconditionally; `save: async
() => {}`; `@google-cloud/storage` not installed; no Terraform bucket. Every
"stored" document discarded, 200 returned. *Turned out:* the route was
untracked in a stale tree, never deployed. Zero production calls because zero
production route. *Catch:* read-back proof against real storage; verify a
defect is deployed before scoping its blast radius.

**Dormant controls with no writer.** `SmartClient.disabled` checked by three
OAuth routes, written by nothing — a leaked partner credential had no kill
switch. `Organization.mfaRequired` enforced at login, set nowhere.
`PrivilegedActionRequest.status = 'EXPIRED'` had no writer — a dual-control
approval never expired. `Provider.active`, `Clinic.active`, `Enrollment.state
= 'revoked'`, `ReserveAccrual.status = 'RELEASED'`: filters that could never be
false. *Catch:* the present-but-unread sweep — every field written somewhere
and read nowhere, or read somewhere and written nowhere, with a control proving
the classifier finds known writers.

**`isValidNpi` existed and was never called.** Three malformed NPIs in
production. *Catch:* every validator has a caller enumeration.

**The ack route swallowing reconciliation failure.** `catch → console.error →
threeWay: null`, response still `200 {ok:true}`. A caller cannot distinguish
reconciled from crashed. *Catch:* a throw on a money path is visible in the
response, the audit metadata, and the metric — all three channels.

**The audit entry before the ledger post.** `createAuditEntry` ran 26 lines
before `postEntry`; when the post threw, AuditLog said `success:true` and the
ledger had no row. Header read "THE BOOKS GAP, CLOSED." *Catch:* the audit
record is written after the thing it records, in the same transaction.

**Four operator scripts never runnable.** A PHI re-encryption tool imported a
file that had never existed in git history. Proven by running them.

## 3. Two sources of truth

**999 vs 277CA sharing letters.** `A` is a valid 999 code meaning Accepted and
the first character of every 277CA category code including rejecting ones. One
`.charAt(0)` turned `A3` (rejected) into `A` (accepted). One switch over both
code sets cannot be correct. *Catch:* `decodeAckOutcome(raw, space)` with the
space required; a control asserting `A3` and bare `A` decode differently per
space.

**The 835 join key swapped with a bank account number.** `era835-parser` put
BPR15 into `eftTraceNumber` and the real TRN02 into `checkNumber`;
`reconciliation-core` had it right. A join on a bank account number succeeds
and matches every remittance from that payer. *Catch:* a test asserting the
two parsers agree on the join key for every fixture.

**Enum in schema comment, in TypeScript, and in OpenAPI — none in the
database.** `AdvancePool.status` was a String with values in a comment;
OpenAPI advertised `INACTIVE`, absent from the comment. *Catch:* a CHECK
constraint; the database is the source.

**Hand-copied unions.** `GateDecisionKind` spelled by hand three times; each
stopped expressing real outcomes when a kind was added. The dashboard rendered
DEFERRED as "GATE FAILED" in red. *Catch:* import the enum; never restate it.

**`NORMAL_BALANCE` calling itself complete.** It was — for its rail. Two
accounts that looked missing belonged to a different ledger. *Catch:* check
your own note before acting; a true premise can carry a wrong conclusion.

## 4. Silent failure on a success path

**Fabricated identifiers.** `id: data?.id || tr_${Math.random()}` minted a
receipt for a transfer nobody could find. `Idempotency-Key: mt-${Math.random()}`
made every retry a fresh payment. `REM-${Date.now()}` on an unjoinable 835
posted it under a key corresponding to nothing, and a replay a second later
posted it again. *Catch:* missing is not passing; an identifier absent from the
response is a refusal.

**`z.coerce.boolean()` on `"false"` → `true`.** `?dryRun=false` silently ran
dry. *Catch:* refuse a non-boolean payload; never coerce a query-string bool.

**`'00'` passing `/^\d+$/` → threshold 0 → dual control "enabled".** Stamped
into the audit record on a disbursement with none. *Catch:* enabled requires
threshold > 0.

**The reserve balance that was gross flow.** `amountCents` filtered on one
account of a double-entry table, credits never subtracted. That number sized
the draw. *Catch:* `getBalance()`; a red proof on a fixture with credits where
gross flow and balance differ.

## 5. Identity and vocabulary

**Fabricated identity on rendered surfaces.** A surgery-center page hardcoded
"Dr. Ridgefield," patient IDs, laterality, and IOL serial numbers with no data
call, under a badge saying the timeout was verified. "Ridgefield Surgery
Center" as the active facility for every tenant. *Catch:* R7 — any literal with
the shape of an identity traces to a binding or is in a fixture the page
cannot reach.

**Fabricated status.** "MERKLE PROVENANCE: VERIFIED," "100% Valid," "GCP
us-east4 · Active" — fifty strings on public pages asserting states nothing
computed. *Catch:* R6, substring and body text, not exact-match badges.

**The name collisions.** provider / mfaRequired / SUSPENDED / INACTIVE / FBO —
each meaning different things in different subsystems. *Catch:* confirm the
concept from context before acting on any grep hit.

## 6. Guards on one door

**`appendEntry` guarded, `appendBatch` not.** The unknown-account check and
Guardrail 10b were on the single-leg path; the atomic path — the one a day-0
draw must use — had neither. Live callers existed. Third finding on the same
file by the same method: enumerate inputs to one door, never ask about other
doors. *Catch:* extract the guard so both paths share one implementation;
enumerate entry points before inputs.

**The guard comparing against scope rather than the wire.** Expected receiver
read from a variable; `counterparty_id` only placed in the body on the rtp
branch. An ACH was refused for not echoing an id never sent. *Catch:* compare
against the body that goes on the wire.

**The sniffed addressing field.** `readColumnTerms` read
`receiver_bank_account_id` unconditionally; the other client used
`receiver_account_number_id`. Same account, two names, compared across
namespaces, `RECEIVER_MISMATCH` with a false message. *Catch:* the lens is
passed in, never sniffed; unknown addressing throws.

## 7. Tests that defend defects

**"Exactly 3 writes."** F02's suite pinned the missing revocation as correct.

**`a !== b` on an idempotency key.** The property that made the function wrong
was the property the test demanded. Deleted, not repaired.

**The mock that only matched the broken query.** Six B5 tests failed the
moment the reader was correct.

**The runner that ignored `--list`.** Ran its whole suite, printed a path per
file, exited 0 — indistinguishable from a listing. *Catch:* a sentinel line the
runner prints only when it took the `--list` branch; a timeout in seconds.

## 8. Money-specific shapes

**Idempotency that identifies intent but not terms.** Key = clinic + claim;
Column retains 30 days; a changed amount re-settled to a 200 that moved the
old amount. Stedi returns 422 on same-key-different-body; Stripe compares
bodies; Column returns the first transfer. *Identical shape, three safety
properties, one documented.* *Catch:* read back amount and receiver after every
create; widen the key to include terms.

**The three ledger lines that did not balance.** Per-account deltas written as
if they were postings; short by exactly one `expected`. *Catch:* compute
against `NORMAL_BALANCE` before writing; a contra memo pair for the receivable.

**Front-door rejection producing no signal.** `EdiEnvelope` enumerated `837P |
835 | 270 | 271`; a 277CA rejection left the claim alive and drawable.
*Catch:* CLEARED / DEAD_AT_FRONT_DOOR / UNDETERMINED as a gate precondition;
`partially_accepted` is UNDETERMINED.

**Dual control keyed and not operational.** Two keys, both roles bound to one
person. *Catch:* record the gap; bind the second key to nothing until a second
officer exists.

## 9. Fleet and process shapes

**Context fed into a prompt returned as a finding.** Qwen echoed "14
permission-drift warnings" from its own prompt. 694 and 196 computed once and
cited as five confirmations. *Catch:* attribution to a fleet member is not
evidence; show the command.

**A spec for a textbook.** Gemini produced a B5 spec with schema that does not
exist, "Column's four counters" redefined as database columns, and a SIGKILL
inside one transaction. *Catch:* identifiers not in the tree → discard before
review; the contract names the files.

**Stranded branches.** Pushed, never opened as a PR. 2,269 lines on main in
the primary checkout; the audit brief itself. *Catch:* every five merges,
every remote branch with commits not on main and no open PR.

**Three lineages in one worktree.** Coordination overhead nearly exceeded the
value. *Catch:* isolation as a property of the environment, enforced at spawn.

**"B5 done" that had never compiled.** Five type errors committed. *Catch:*
E3 — a status claim carries its SHA, compile, and test run under CI's runner.

**The hung heredoc.** `cat > "$X/tmp/mut.sh" 2>/dev/null` with no input; five
hours, no output. *Catch:* a shell with no output after ten minutes is a
failure signal, not patience.

**The duplicate paste.** A read-only KMS check pasted twice; the second run
continued into creating a key. Harmless; understood. *Catch:* the agent stopped
before binding an identity it did not have — that is the behaviour to keep.
