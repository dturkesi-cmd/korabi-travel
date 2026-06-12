# Korabi Travel — full-stack flight platform

A travel platform with a polished storefront + AI planner, a modular backend on the
official **Duffel SDK**, a **multi-supplier "stacking" layer** (Duffel now; Sky Bird +
VAX seams ready), **Expedia/Orbitz-style merchandising**, user accounts with a loyalty
currency, an admin view, a verified Duffel webhook receiver, and security hardening.
**Zero native dependencies** — runs anywhere Node 18.16+ does.

```
public/   index.html (search·results·booking·add-ons·AI planner) · login · account · admin
src/
  server.js         bootstrap: security headers · CSRF · rate limits · static · routes
  config.js         env (Duffel · Gemini · suppliers · merchandising · loyalty)
  db/store.js       JSON store: users · sessions · bookings · events  (+ Korabi Cash)
      store.pg.js   Postgres scaffold (same API; not wired at boot yet)
  lib/   duffel.js  Duffel SDK wrapper      gemini.js  planner agent
         webhooks.js HMAC verify            merchandising.js  badges · member price · loyalty
  suppliers/        types · duffel.adapter · skybird.adapter* · vax.adapter* · registry · aggregator
  middleware/       auth · csrf · security (headers + rate limit) · errors
  routes/           flights · orders · agent · auth · account · admin · webhooks
                                              (* = typed B2B stubs, see below)
```

## Quick start

```bash
cp .env.example .env        # add DUFFEL_ACCESS_TOKEN, DUFFEL_WEBHOOK_SECRET, GEMINI_API_KEY
npm install                 # express · @duffel/api · bcryptjs · dotenv  (no native builds)
npm start                   # → http://127.0.0.1:3847  (see .env PORT)
```

Use **`127.0.0.1:3847`** in the browser, not `localhost` — on many Mac setups another
app already binds `localhost` on common ports and the Korabi server will look unreachable.

```bash
npm run smoke               # hit /api/health, /api/suppliers, … against a running server
```

With no keys it still runs end-to-end in **demo** mode (clearly labelled sample fares).
Flip `SUPPLIER_SKYBIRD_ENABLED` / `SUPPLIER_VAX_ENABLED=true` to stack labelled **DEMO**
consolidator/package fares alongside Duffel (no B2B credentials required for the stub).

## Supplier stacking — Duffel + Sky Bird + VAX

The honest picture on the two accounts you have:

| Source | Role | Integration reality |
|---|---|---|
| **Duffel** | Retail NDC/GDS flights, instant booking | Public API — wired and default |
| **Sky Bird** | Consolidator **net fares** (100+ airlines) + hotels/cars/tours | **Gated B2B** (skyAPI/WINGS). Needs agency accreditation + credentials; docs not public. **Net fares are restricted from public display** — must be marked up and sold as your own published price |
| **VAX** | Vacation **packages** (flight+hotel bundles), hotels, cruise, car | **Gated B2B** (Quick Connect XML, built for supplier→VAX distribution). ALG disclaims third-party integrations; needs a negotiated distributor relationship |

So neither is a plug-and-play API like Duffel — but both are great **complementary content** once you're accredited. The platform is built to "stack" them:

- `src/suppliers/` defines one **adapter interface** (`types.js`). Each source implements
  `search()` returning a **normalized, supplier-tagged offer**.
- `aggregator.js` queries every **enabled** source in parallel, **isolates failures**
  per-supplier, applies each supplier's **markup** (e.g. net-fare uplift), merges, sorts,
  and decorates with merchandising. `/api/search` already runs through it.
- `skybird.adapter.js` / `vax.adapter.js` are **typed stubs** with the real call sites
  marked. With `SUPPLIER_SKYBIRD_ENABLED` / `SUPPLIER_VAX_ENABLED=true` they return
  **clearly-labelled DEMO offers** (no credentials needed) so you can see stacking,
  markup, and the *Net fare* badge in the UI. Drop in B2B credentials, map their schema
  → `NormalizedOffer`, and the same adapters switch to live content. Booking
  dispatch-by-supplier is the next seam (net fares typically book via PNR/ticketing
  queue, not instant order).

**Recommended path:** keep Duffel as the instant-booking retail default; add **Sky Bird**
for cheaper international/net fares (more airlines, commission); add **VAX** to power the
**"add a hotel & save" bundle** upsell. Talk to each about API access for your account
tier and confirm net-fare display terms before showing those fares publicly.

## Smart pitching (Expedia/Orbitz-style merchandising)

Grounded in real data — no fabricated scarcity:

- **Badges** computed across the result set: *Cheapest · Fastest · Nonstop · Best value*
  (price/duration/stops scoring) — plus a *Net fare* tag when a consolidator fare stacks in.
- **Member pricing + loyalty:** signed-in travelers earn **Korabi Cash** (`LOYALTY_EARN_PCT`,
  like Orbucks/One Key Cash), shown on every offer and accrued to their account on booking.
  An optional **member discount** applies to **margin only** (never below the airline fare).
  Logged-out users see a "Sign in to earn / unlock member price" nudge.
- **Real urgency:** a live **"Price held mm:ss"** countdown from each offer's actual
  `expires_at`; fare flexibility comes from Duffel's conditions, not invented stock counts.
- **Rewards strip + bundle teaser** above results ("add a hotel & save"), tied to the
  VAX/Stays roadmap.

`lib/merchandising.js` decorates the API response; the storefront also computes the same
badges client-side so the demo path matches. Loyalty accrual is enforced **server-side**.

## Security hardening

- **Headers:** CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS (in production) via `middleware/security.js`.
- **Rate limiting:** per-IP limits on `/api/auth`, `/api/search`, `/api/agent`.
- **CSRF:** double-submit cookie (`korabi_csrf`) enforced on state-changing,
  cookie-authenticated routes (`/api/orders`, `/api/account/bookings`, `/api/auth/logout`);
  the frontend echoes it via `window.korabiFetch`.
- **Auth:** bcrypt passwords, httpOnly session cookie, `Secure` in production.
- Body size capped; `x-powered-by` disabled; `trust proxy` set for correct client IPs.

(Core logic — merchandising scoring, aggregator merge/markup, CSRF, rate limiter, and the
webhook verifier — is unit-tested.)

## Routes

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/auth/register · login · logout` · `GET me` | — / CSRF on logout | Accounts |
| `POST /api/search` | — | **Stacked** multi-supplier flight search + merchandising |
| `GET /api/suppliers` | — | Which sources are enabled |
| `GET /api/offers/:id · /api/seat-maps/:id · /api/ancillaries/:id` | — | Re-price, seats, bags |
| `POST /api/orders` | CSRF (+user) | Book; persists + awards Korabi Cash |
| `POST /api/agent` | — | Gemini planner orchestration |
| `GET/POST /api/account/bookings` | user (+CSRF) | My trips + balance |
| `GET /api/admin/overview` | admin | Stats · bookings · events · suppliers |
| `POST /webhooks/duffel` · `GET /api/webhooks/recent` | HMAC | Events |
| `GET /api/health` | — | Config, suppliers, loyalty |

## Seat resale marketplace ("sell your seat")

`/marketplace` — a Ticketmaster-style resale market, built on the only model that is
actually lawful for air travel:

> **Airline tickets are not transferable like event tickets.** They're tied to the
> passenger's name + government ID, and most major carriers (AA, Delta, United, BA,
> Emirates…) **prohibit name transfers** in their contracts of carriage. Resale
> therefore works **only on airlines that permit paid name changes** (Ryanair, easyJet,
> Wizz, Vueling, Frontier, Spirit, Volaris…), with the change executed through the
> airline — here, by the platform's **ARC-certified desk**.

**Flow:** seller lists (eligibility checked against `lib/transferability.js`) → buyer
pays into **escrow** with the new traveler's name → the transfer queues on the **ARC
desk** in `/admin` → desk performs the airline name change → *complete* releases the
payout (minus `MARKETPLACE_COMMISSION_PCT`) and stores the new e-ticket for the buyer;
*fail* refunds the buyer automatically. Status history is tracked per listing.

**Cutoff:** sales close `MARKETPLACE_CUTOFF_HOURS` (default **6h**) before departure —
tightened automatically where an airline requires more lead time (e.g. Frontier/Spirit
24h). Eligibility is re-checked **at purchase time**, not just at listing.

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/marketplace/airlines` · `GET /policy/:iata` | — | Sellable carriers + per-airline rules |
| `GET /api/marketplace/listings` | — | Browse (PII masked, cutoff-filtered) |
| `POST /api/marketplace/listings` · `/:id/cancel` | user+CSRF | List / remove a seat |
| `POST /api/marketplace/listings/:id/buy` | user+CSRF | Escrow + queue transfer |
| `GET /api/marketplace/mine` | user | My selling/buying activity |
| `GET /api/admin/transfers` · `POST /:id/complete` · `/:id/fail` | admin+CSRF | ARC transfer desk |

The eligibility engine and the full list→escrow→complete/fail lifecycle are unit-tested.
Fee notes in the policy table are indicative — the desk must **verify current fare
rules** before completing each transfer (flagged per listing).

## Escrow ledger, verification & notifications (v2.3)

- **Payments abstraction** (`lib/payments.js`): marketplace money now flows through a
  provider interface — `hold → release/refund` — backed by a persisted **ledger** with
  full state history. The admin dashboard shows held escrow, payouts sent, commission
  earned, and refunds. The **Stripe Connect seam is documented in the module**
  (manual-capture PaymentIntents on buy, capture + transfer on release, cancel/refund on
  fail, Express onboarding for seller KYC, webhook reconciliation). Until a PSP is wired,
  the UI keeps saying escrow is simulated.
- **Ticket verification**: listings created from a Korabi booking (`orderId`) auto-verify
  against the Duffel order and the seller's own booking history → **✓ verified ticket**
  badge. External tickets show *verification pending* and appear in the admin
  **"Listings awaiting verification"** queue for the ARC desk to confirm the PNR.
- **Notifications** (`lib/notify.js` + `/api/notifications`): in-app notification center
  (bell + unread badge in the header on every page) with mark-all-read, fed by booking
  confirmations and every marketplace event — sold, purchase received, ticket ready,
  payout released, refund issued, transfer failed, listing verified. Each notification
  also goes to an **email stub** (console log) with a one-function seam for
  SES/SendGrid/SMTP.
- **Marketplace UX**: browse filters (origin / destination / airline), sort by soonest /
  cheapest / newest, and trust badges on every card.

## Post-booking servicing (v2.4)

**My trips** now handles the after-sale, the part most demo storefronts skip:

- **Cancel trip** — two-step, the way airlines actually work: the traveler first sees a
  **refund quote** (live bookings create a pending Duffel order cancellation and show the
  airline's real `refund_amount` + quote expiry; demo bookings show a clearly-labelled
  simulated 80% quote), then explicitly confirms. Status flips to *cancelled*, the refund
  is recorded on the booking, and a notification + email-stub fires. Ownership is enforced
  and double-cancels are rejected.
- **Request change** — honest scoping: flight changes depend on fare rules, so instead of
  pretending to be self-serve they create a **change request** for the ARC desk. The
  traveler describes what they want; the desk sees it in `/admin` ("Change requests",
  with the note and contact), resolves it with a message, and the traveler is notified —
  the request history (your note + the desk's resolution) shows on My trips.

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/account/bookings/:id/cancel/quote` | user+CSRF | Refund quote (Duffel pending cancellation) |
| `POST /api/account/bookings/:id/cancel/confirm` | user+CSRF | Confirm; record refund; notify |
| `POST /api/account/bookings/:id/change-request` | user+CSRF | Open a desk request |
| `GET /api/account/requests` | user | My requests + resolutions |
| `POST /api/admin/requests/:id/resolve` | admin+CSRF | Resolve + notify traveler |

## Postgres path (v2.4)

`db/schema.sql` is a complete, indexed PostgreSQL schema mirroring the repository layer
1:1 (users, sessions, bookings, events, listings, payments, notifications, requests),
including the escrow ledger states and marketplace status machine.

**Honest status:** `src/db/store.pg.js` is a **partial scaffold** — it exports the same
repository surface as `store.js`, documents the aligned schema, and implements
`init()`/`withPg()` async bindings when `DATABASE_URL` is set (optional `pg` peer). It is
**not wired into `server.js` yet** and has **not been integration-tested against a live
Postgres instance** in this environment. Unit tests cover the export shape and the
"not configured" guard only. Before production: run `init()` at boot, swap the store
require, exercise migrations against `schema.sql`, and add integration tests.

## Operations: reporting, payouts & merchandised homepage (v2.5)

- **Reports & exports** (`lib/reports.js` + `/admin`): date-range summaries (bookings
  count/gross/cancellations, Korabi Cash issued, seats sold, marketplace GMV, commission
  earned, escrow held/refunded) plus three CSV downloads — **bookings**, **marketplace**,
  and the full **escrow ledger** — with proper CSV escaping and per-row currency, built
  for ARC reconciliation. Summary tiles sum across currencies numerically (and say so);
  the CSVs are the source of truth per currency.
- **Seller payouts** (`/api/account/payouts` + My trips): payout history with totals,
  escrow-pending amounts, and a payout-method profile. **Privacy by design: the full
  bank/IBAN number is never persisted — only holder + last 4** (verified by test); live
  payouts should onboard sellers through the PSP (Stripe Connect Express) which holds
  details and KYC itself.
- **Homepage merchandising**: the storefront now features the three cheapest live
  marketplace listings ("Seats other travelers can't use") with savings tags, linking to
  the marketplace — the strip hides itself when there are no listings.

## Honest production checklist (still open)

This is a strong foundation, **not** a finished production OTA. Before real traffic:

- **Payments/PCI:** checkout now requires a confirmed **payment intent** before `/api/orders` (`lib/booking-payments.js` — demo simulated card or Duffel Payment Intents). Live Duffel orders still settle via balance after card capture; wire full Duffel Payments UI in production and remove demo confirm path.
- **Marketplace escrow is simulated** (a ledger, not money movement): wire a PSP with
  delayed capture/Connect-style payouts, add seller KYC, and have counsel review resale
  T&Cs per market before going live.
- **Accreditation & contracts:** ARC/IATA (or host agency) for consolidator/GDS content;
  signed Sky Bird / VAX agreements; confirm net-fare display terms.
- **Data:** wire `store.pg.js` into `server.js` (or keep JSON for dev); add backups,
  migrations, and a session store like Redis for multi-instance.
- **Ops:** real insurer for the partner insurance add-on; nonce-based CSP; logging,
  monitoring, and load testing; bump `DUFFEL_COMPONENTS_VERSION` for seats/bags.

## Tech

Node + Express · `@duffel/api` · `@duffel/components` (CDN) · Gemini `generateContent` ·
`bcryptjs` · vanilla-JS storefront with the Korabi design system.
