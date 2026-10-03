# The Estate — product states, the dependency event, WIP, standing approvals

The repo rules keep one product honest. These rules keep the portfolio honest. The unit is the product, the states are four, the limit is two, and the question that governs everything is: who, outside this company, would notice if it stopped?

## Finding

Measured Oct 2026 across the estate: twenty-odd products specified; most with code; two provisional patents; a doctrine, a fleet of seven lanes, a control plane, a build loop. Zero products past Tier A of their own go-live gate. Zero products with an outside party dependent on them. Several distribution relationships in progress, none tracked. The fleet's throughput was not the constraint. Two things were: the owner's queue, where every stop waited; and the absence of any rule that said how many things could be in flight.

The repo doctrine had already named the shape — "correct code, in the tree, that production was not running." The estate had the same shape with the product as the unit: correct products, in the estate, that nobody was running.

## The four states

| State | Definition | Enters on | Leaves on |
|---|---|---|---|
| `parked` | Not now. Has a written dependency event and a named reopen condition. | Any new idea opens here. A `building` product that yields its slot returns here with the reason. A windowed product whose window closed returns here with the next window as reopen. | A WIP slot is free **and** the event is written **and** the reopen condition is met. |
| `building` | Holds one of the two WIP slots. Lanes may spawn. Gate rows are being closed. | Promotion from `parked`, recorded in `estate.json` with `since`. | Tier A rows all closed with evidence → `gated`. **Or** 14 consecutive days with no gate row moved from open to closed → yields the slot, back to `parked`, reason logged. |
| `gated` | Past Tier A. Code is deployable and the controls are operating. No outside party depends on it yet. | Tier A closed. | Dependency event evidenced per E3 → `operating`. A product gated 30 days is listed with its age in every report under BLOCKED with the barrier it is retrieved against. |
| `operating` | An outside party depends on it and would notice if it stopped. | Event evidenced. | Never silently. Losing the dependent party (churn, revocation, a window that closed on an operating product) is a P1 with a finding in the catalog. |

Nothing is in two states. Nothing is in no state. A product not in `estate.json` is `parked` with `event: UNNAMED` and is reported as such the first time any lane touches its repo.

### What does not move the state

Commits. PRs merged. Lines of code. A demo shell. A PRD. A scaffold. A provisional patent. A LinkedIn connection. An architecture document. A substrate layer complete. A model trained. A SOC 2 report. Each of these can be *evidence toward* a gate row and is listed as such; none of them is a state transition. B-06 and B-08 in the barrier catalog are what it looks like when one is treated as if it were.

## The dependency event

One sentence per product. Written before `building` opens. Structure: **the party** (outside this company, not the owner, not the owner's own practice acting as the owner), **what they receive** (the artifact or outcome), **the proof** (what evidence shows it happened).

Examples that pass the test:

- *Shteg clearinghouse:* an 835 returns from a payer against a claim submitted under Shteg's Type 2 NPI, the advance funded from the FBO and reconciled to the remittance. Party: the payer, and the practice whose cash arrived. Proof: the 835, the ledger entry, the bank record.
- *Shteg Enroll:* one enrollment application is received by a state Medicaid agency or CMS, originated from a SightBridge eligibility result. Party: the agency, and the patient. Proof: the agency's receipt.
- *Itemizit (bank-facing):* a bank customer who is not the owner expands a card transaction and sees its line items. Party: the bank's customer. Proof: the bank's logs or the customer's confirmation.
- *Nextech channel:* one practice from Nextech's install base submits a claim through Shteg. Party: that practice. Proof: the claim.
- *FedNow truth-token verifier:* one counterparty accepts a Shteg penny-transfer attestation as verification in a credentialing or contracting decision. Party: the counterparty. Proof: their written acceptance.

Examples that fail the test and why:

- "Ridgefield Eye runs on ShtegMed." — the owner's own practice, operated by the owner. It is the pilot, and the pilot is evidence toward Tier A, not the event. The event is the first practice that is not the owner's.
- "The auction engine processes an Advance." — the single standing bidder is Shteg. Party is the company itself. Event is the first outside bidder or the first practice funded by it.
- "The provisional is filed." — nobody receives anything.
- "The ledger is complete." — substrate. See B-07.

**The test, applied every time:** who notices when it stops? If the honest answer is the owner, or a lane, or nobody, it is not an event. It is a demo, a layer, or a document.

## The WIP limit

Two products in `building` at once, estate-wide. Not two per lane, not two per repo. Two.

Why two and not one: a single product in `building` leaves the fleet idle whenever that product is at a decision stop, and the fleet should never idle. Why two and not three: the owner's queue was measured carrying three products' stops and clearing none of them. Two is the number at which one product's stop can wait while the other moves.

The two are named in `ops/estate.json`. A lane spawning on a product not in `building` is refused by the orchestrator — this is CI class on the orchestrator, REVIEW class in a repo without it, and reported as such.

**Yielding.** A `building` product that has not moved a gate row in 14 days yields its slot automatically. The reason is logged — usually a barrier from the catalog — and the product returns to `parked` with a reopen condition that names the barrier's unblocking move. Yielding is not failure; carrying a stalled product in a WIP slot while a ready one waits is.

**Channels are counted separately.** A distribution relationship being actively worked — Nextech, a sponsor FI, a bank's practice portfolio — is an estate entry with `channel: true`, in the same four states, with its event being the first customer or decision that arrives through it. Channels hold their own limit of two in `building` (`wip_limit.channels`), not a product slot: channel work is paced by the owner's calendar (the next meeting, the document the counterparty asked for) rather than by the owner's merge queue, and it does not compete with lanes for the fleet. What it shares with products is the rule that it is on the list with a `since`, a `due` on its next owner-side action, and a barrier named when it stalls. Relationships off the list do not get finished; the estate had several in Oct 2026 and none on any list.

## Windows

A product whose event has a calendar — Medicare enrollment season, a payer's contracting cycle, a conference, a grant deadline — carries the window as `(due: YYYY-MM-DD)` on its estate line.

- If the event lands inside the window: `operating`.
- If, on the window's close date, the event has not landed: the product is parked that day with `reopen` set to the next window's open date minus the lead time measured this cycle. Not carried. Not "almost."
- Carrying a windowed product past its window in a WIP slot is a finding (B-05, second form). Missing the window is B-05 first form, with a date, and is the lesser defect.

A window is not an excuse to skip the gate. A product that would reach its window only by skipping Tier A rows is parked at the moment that becomes clear, not at the window's close.

## Standing approvals — the decision / execution split

Every item on the owner's queue is one of two kinds, carried as `(kind: decision)` or `(kind: execution)` on its stop line.

**Decision** — the owner's judgment is required. Money moves or does not. This is the chain format or it is not. The row belongs to this tenant or that one. Nothing in the doctrine reduces these. They are the four stops as written.

**Execution** — only the owner's credential or keystroke is required; the judgment was already made or was never in question. Merging a Track 2 batch that meets all five landing conditions. Applying a Terraform plan already reviewed in the PR. Promoting a sandbox digest nobody disputes. Rotating a key on schedule. Each of these sat on the queue in Oct 2026 beside real decisions, and the queue did not distinguish them.

**Every execution stop is a finding (B-03).** The report counts them. Each is resolved one way: a **standing approval** — or it stays on BLOCKED with its age until it is.

### Writing a standing approval

`ops/doctrine/standing-approvals.md`, one entry per class:

```
## SA-NN — <class of action>
since: YYYY-MM-DD
scope: <exactly which actions; paths, environments, conditions>
mechanism: <what enforces the scope — the CI job, the hook, the IAM binding>
red proof: <the PR or run where the mechanism refused an action outside scope>
revoke: <how the owner turns it off in one step>
```

Conditions for an entry to be live: the mechanism exists and is CI or LINT class, not REVIEW; the red proof is a real refusal, not a description of one; the revoke step is tested. A standing approval with a REVIEW-class mechanism is written but listed as REVIEW-ONLY in every report, like any other rule without teeth.

Standing approvals that every repo should have before its second feature:

- **SA-01 Track 2 auto-land.** All five conditions (no Track 1 path, CI green on current main with base SHA stated, Kimi-verified, no other open PR on the file, batch not padded) checked by a job; merge is automatic; the owner reads the batch after it lands.
- **SA-02 Sandbox deploy.** Any green main digest deploys to sandbox tier without a stop. Sandbox has no production credentials and no outside party; it is where the operating loop's monitors are proven red before they are armed in production.
- **SA-03 Production promotion.** A digest that has run in sandbox for the stated soak, with every Tier A monitor green, promotes to production on a single owner keystroke — the owner is approving *that this digest is the one*, not re-reviewing it. The before/after digest lands in the log automatically.

The fuse stays armed by the owner. Standing approvals mean it is not re-armed by hand for every round. OP-02 is unchanged: the arming line is in the tooling, pinned, with its condition stated — the standing approval *is* the stated condition.

## `ops/estate.json`

```json
{
  "owner": "lippi",
  "timezone": "America/New_York",
  "exclude": ["node_modules/", ".claude/", ".git/", "ops/reference/", "ops/research/", "ops/fixtures/"],
  "repos": [ { "project": "shtegmed", "path": "." } ],
  "wip_limit": { "products": 2, "channels": 2 },
  "products": [
    {
      "id": "shteg-clearinghouse",
      "state": "building",
      "since": "2026-10-03",
      "event": "An 835 returns from a payer against a claim submitted under Shteg's Type 2 NPI; the advance is funded from the FBO and reconciled to the remittance.",
      "event_party": "payer; the practice whose cash arrived",
      "gate": "ops/doctrine/operations.md#tier-a",
      "tier_a_closed": 9,
      "tier_a_total": 14,
      "last_row_moved": "2026-10-01",
      "window": null,
      "repo": "shtegmed",
      "channel": false
    },
    {
      "id": "shteg-enroll",
      "state": "building",
      "since": "2026-10-02",
      "event": "One enrollment application is received by a state Medicaid agency or CMS, originated from a SightBridge eligibility result.",
      "event_party": "the agency; the patient",
      "window": { "due": "2026-12-07", "reopen": "2027-09-15" },
      "repo": "coverage-enroll",
      "channel": false
    },
    {
      "id": "nextech-channel",
      "state": "parked",
      "event": "One practice from Nextech's install base submits a claim through Shteg.",
      "reopen": "shteg-clearinghouse reaches gated",
      "channel": true
    },
    {
      "id": "fedpay-marketplace",
      "state": "parked",
      "event": "A bidder that is not Shteg wins an auction session and funds a practice.",
      "reopen": "shteg-clearinghouse operating AND sponsor-FI designation received",
      "channel": false
    }
  ]
}
```

The file is the same `ops/estate.json` the work-items roll-up already reads (`owner`, `timezone`, `exclude`, `repos` are its keys and are unchanged); `wip_limit` and `products` are added beside them so one file describes the estate. `event` is required on every entry. `since` is required on `building`, `gated`, `operating`. `reopen` is required on `parked`. The lint (`scripts/lint-estate.mjs`, ES-01…ES-08) fails on a missing event, a third product or a third channel in `building`, a `building` with no `since`, a `parked` with no `reopen`, and a windowed product past its `due` not in `parked`. In a tree without the script, the estate is REVIEW class and the report says so.

## The estate roll-up

Generated, never edited, alongside `This-week.md`:

```
ESTATE as of YYYY-MM-DD
operating  0
gated      0
building   2/2   shteg-clearinghouse (since 2026-10-03, 9/14 Tier A, last row 2d)
                 shteg-enroll        (since 2026-10-02, window 2026-12-07, 0/9 Tier A)
parked    18     oldest: korabitravel (since 2026-08-19, reopen: UNNAMED) ← B-02
execution stops open: 4  → standing-approval candidates: SA-01, SA-02 not yet live
channels: nextech (parked, reopen: clearinghouse gated) · m-t-sponsor-fi (parked, reopen: UNNAMED) ← B-02
```

Every `UNNAMED` is a B-02 finding and appears under BLOCKED. Every product past 14 days without a row moved is retrieved against `barriers.md` and the barrier named on its line.

## Promotion proofs

Each transition is a claim and carries evidence per E3:

- `parked → building`: the estate.json diff showing the WIP count before and after, and the event sentence.
- `building → gated`: the Tier A rows, each with its evidence link, and the serving digest.
- `gated → operating`: the event's proof artifact — the 835, the agency receipt, the counterparty's acceptance — linked from the estate line. A screenshot of a dashboard is not the proof; the artifact the outside party produced is.
- `building → parked` (yield): the 14-day row history and the barrier retrieved.
- `operating → anything`: a finding in the catalog, with the party that was lost and why.

## What this does to the fleet

Nothing slows. The fleet works on two products instead of twenty, and the owner's queue holds decisions instead of keystrokes. The lanes that would have spawned on the other eighteen spawn on the two — on their gate rows, their monitors, their operating-loop checks, and their standing-approval mechanisms. The swarm model is unchanged. What changes is that the swarm is pointed at the events, and the report says how far each is from the party who will notice.
