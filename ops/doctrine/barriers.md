# Barrier Catalog — why a product stays implemented

The findings catalog indexes the shapes that make correct code wrong. This catalog indexes the shapes that keep correct products from operating. Retrieve from it when a product has been `building` 14 days without a gate row moved, or `gated` 30 days without its event. Each entry: the shape, how it shows in the report, the unblocking move, and where it was measured.

Like the findings catalog, a barrier with no measured instance is parked, not adopted. All eight below were measured on the estate, Oct 2026.

---

## B-01 — The owner's queue

**Shape.** Every stop waits for one person. Products advance at the rate that person clears the queue, regardless of how many lanes are working. The queue is not prioritized by product, so a Track 2 merge on a parked product sits beside a money decision on the one that matters.

**In the report.** BLOCKED grows while SERVING does not change. YOU RUN lists items older than the last deploy. The same three items for three reports.

**Unblocking move.** Split the queue by `kind` (decision / execution) and by product state. Execution items become standing-approval candidates (B-03). Decision items on `parked` products are not on the queue — a parked product does not generate stops. The queue that remains is decisions on two products. Enforce the WIP limit so the queue cannot regrow.

**Measured.** Ninety commits behind production on the core repo; stops from at least four products interleaved; no `kind` field.

---

## B-02 — The unnamed event

**Shape.** A product is in `building` — lanes are spawned, PRs are landing — and no sentence exists that names the outside party who will first depend on it. Work proceeds toward "done" with no definition of done that includes anyone outside the company. Every closed row is real; none of them is the one that matters.

**In the report.** ESTATE line shows `event: UNNAMED`. Gate rows close but the product never reaches `gated`, because Tier A was never defined against an event. Status reports describe features, not parties.

**Unblocking move.** Write the sentence. Party, what they receive, proof. If it cannot be written, the product is `parked` with reopen `event named`. If it can, Tier A is regenerated as the rows between here and that sentence, and nothing else is a Tier A row.

**Measured.** Of twenty-odd products in Oct 2026, the event sentence could be written for perhaps five from existing material; none had it written.

---

## B-03 — The credential-only step

**Shape.** An action needs only the owner's credential or keystroke — the decision was already made, or there was never a decision — and it waits in the queue as if it were a judgment call. Merging a batch that meets every landing condition. Applying a plan already reviewed. Promoting a soaked digest. The owner's hands are the bottleneck, not the owner's mind.

**In the report.** YOU RUN carries copy-ready commands that are the same shape every time. `(kind: execution)` count is nonzero and not falling.

**Unblocking move.** A standing approval per class (`estate.md`, SA-01 through SA-03 as the minimum set): scope, mechanism, red proof, revoke. The mechanism is CI or LINT class or the approval is not live. The red proof is a real refusal. Until the approval is live, the item stays on BLOCKED with age — it does not quietly become a decision again.

**Measured.** Four execution-only items on the queue in the same week as two money decisions; none distinguished.

---

## B-04 — The counterparty gate

**Shape.** The event requires a party outside the company to act — a sponsor FI to designate, a vendor to enable a channel, an agency to accept a submission, a payer to contract — and the product waits in `building`, consuming a WIP slot, for a decision the fleet cannot influence.

**In the report.** `last_row_moved` ages past 14 days while the remaining Tier A rows are all tagged with the counterparty. BLOCKED carries the counterparty's name with no owner-side action.

**Unblocking move.** Two parts. First: the product yields its slot and parks with reopen = the counterparty's action; the fleet moves to the next ready product. Second: the relationship itself becomes an estate entry (`channel: true`) with its own event — the first customer or decision that comes through it — and its own owner-side actions (the next meeting, the document they asked for, the demo they will see), each with a `since` and a `due`. A counterparty gate is not idle time; it is a different product with a different gate, and it is tracked or it does not close.

**Measured.** Sponsor-FI designation outstanding since July; a channel relationship in progress since July; a bank demo pending since September. None on any list.

---

## B-05 — The window

**Shape, first form.** The event has a calendar — an enrollment season, a contracting cycle — and the window closes before the event lands. The product missed.

**Shape, second form (the worse one).** The window closed and the product stays in `building`, consuming a WIP slot, finishing a thing nobody can use until the next window. The slot a ready product needed is held by one that cannot operate for nine months.

**In the report.** `window.due` is past and `state` is still `building`. Or: `window.due` is inside 30 days and Tier A is less than half closed.

**Unblocking move.** The window is written as `(due:)` on the estate line the day the product opens. On the due date, if the event has not landed, the product parks automatically with reopen = next window open minus the measured lead time. If, at any point, Tier A cannot close inside the window without skipping rows, the product parks that day. The lead time measured this cycle is recorded so the next cycle opens early enough.

**Measured.** An enrollment product opened Oct 2 against a season already underway, with the lead time unmeasured.

---

## B-06 — Scaffold counted as progress

**Shape.** A demo shell, a scaffolded frontend, a PRD, an architecture document, or a working prototype is reported in language that reads as a state transition — "the engine is built," "the platform is complete," "the frontend is scaffolded." None of these moves a gate row. All of them feel like movement.

**In the report.** Commit counts and PR counts rise; `tier_a_closed` does not. The product's description in the report is longer than its event.

**Unblocking move.** Scaffolds, demos, and documents are listed as evidence toward a named gate row or they are not listed. A report line about a product names the row that moved, or it says "no row moved." The build loop's locked checks score the event, never the scaffold (`build-loop.md`, "Point the loop at the product's event").

**Measured.** At least three products described as having a "demo," "shell," or "scaffold" as their most recent progress; all three at 0 Tier A rows.

---

## B-07 — Substrate ahead of the event

**Shape.** The platform layer — ledger, attestation core, control plane, orchestrator, federated-training layer, de-identification boundary — is extended because it is interesting and because it will be needed, while the product whose event would use it does not advance. Each substrate addition is correct and reusable. None of it is operating, because the thing that would depend on it is still `building`.

**In the report.** Several repos show activity; none shows a Tier A row moved. New estate entries appear whose event, when written, turns out to be another product's event.

**Unblocking move.** Substrate has no event of its own; it inherits the event of the first product that uses it, and is scheduled only as a gate row on that product. A substrate layer with no product in `building` that needs it is `parked` with reopen = that product reaches the row that needs it. The build loop's locked checks make this mechanical: substrate work scores only through the event it moves.

**Measured.** In one week of Oct 2026: a federated-training layer, an attestation-gated KMS design, a renewal-case builder, and a clinical-extraction tier were all opened; the clearinghouse's first real 835 had not landed.

---

## B-08 — Document as milestone

**Shape.** A provisional patent, a SOC 2 report, a signed NDA, a LinkedIn connection, a conference conversation, or an approved PRD is treated as a milestone — announced, celebrated, used as the "since" date for the next phase. Each is real and some are prerequisites. None of them is received by an outside party as a product.

**In the report.** The product's most recent "progress" line names a document. `since` dates cluster around filing and signing dates rather than around rows.

**Unblocking move.** A document is evidence toward a gate row (a SOC 2 report toward a G-OP row; a patent toward nothing on the gate, but toward a parked product's reopen condition if a counterparty requires it). It is listed as such and not otherwise. The report names the row it moves or does not mention it.

**Measured.** Two provisional filings and a SOC 2 completion each reported as progress on products at 0 Tier A rows.

---

## Retrieval

When a product is `building` 14 days with no row moved, or `gated` 30 days: name the barrier on its estate line in the next report, with the unblocking move as the NEXT recommendation. If no barrier fits, write the new shape here with the product and the date, the same way a new finding enters the findings catalog.

The eight above compound. B-07 produces B-02 (substrate has no event). B-02 produces B-06 (with no event, scaffolds are all there is to report). B-04 unmanaged produces B-01 (the counterparty's silence sits on the owner's queue). B-03 unresolved is B-01's floor. Resolving B-02 first — writing the sentence — makes most of the others visible.
