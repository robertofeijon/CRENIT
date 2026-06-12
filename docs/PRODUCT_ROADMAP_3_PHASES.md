# CRENIT product build — 3 phases

**Owner:** Product + Engineering  
**Lead engineering reference:** this document + gap matrix in §4  
**Current position:** [`docs/PROJECT_STATUS.md`](PROJECT_STATUS.md)  
**Last aligned with codebase:** `main` @ `e5e728b` (June 2026)

---

## Context & framing

CRENIT is a rental credit scoring and data platform for the Namibian market. The architecture is sound and the commercial flywheel logic is validated. This document guides three sequential build phases. **Complete the prior phase before beginning the next.**

**Core product promise:** tenants build verifiable rental credit history; landlords confirm payments; lenders and property companies buy aggregated market data. Every feature must tighten this loop.

---

## Phase 1 — Core product trust (months 1–3)

**Goal:** Make the credit score feel like a real product, unblock the core data flow, and establish local trust signals. Nothing else ships until these land.

### 1.1 — Credit score communication overhaul

The score is calculated but not fully *communicated*. A raw number is forgettable.

- Replace the 0–100 number with a **named tier system** (e.g. Bronze → Silver → Gold → Platinum). Each tier: identity statement, what it unlocks, what the next tier requires.
- Add **"what's holding your score back"** — plain-English, actionable reasons (e.g. *"~8 points if your next 3 payments are on-time"*), not just factor weights.
- Build a **score simulator** — months of on-time payments → projected tier (simple slider, not a full financial calculator).
- Design a **shareable credit report PDF** — polished, not a data dump; tier badge, 12-month history, factors, verification QR/URL. Primary tenant value prop and cold landlord acquisition touchpoint.

*Why first:* If tenants don't understand or trust the score, nothing else matters.

### 1.2 — Auto-confirm window for EFT payments

Landlord confirmation is on the critical path: no confirm → no score update → no market data.

- **Configurable auto-confirm window** (default 48h): if no dispute, payment auto-confirms.
- **Push/SMS nudges** for pending confirmations (not email-only).
- **Mobile-first one-tap confirm** via signed token link (no full login required).
- **Landlord confirmation dashboard** — pending / confirmed / disputed with aging.

*Why second:* Manual EFT is the only production data source until a live gateway exists.

### 1.1 / 1.3 — Shareable credit PDF (detailed)

- **Server-side PDF** generation (not browser print).
- **Verification URL** (`verify.crenit.na/abc123` or `/verify/[reference]`) for third-party authenticity check.
- Sections: cover (name, tier, date), 12-month chart, factor breakdown, payment consistency, methodology disclaimer.
- Tenant-controlled **expiry** on shared reports (e.g. 30 days).

### 1.4 — Dispute resolution UX foundation

- **Real-time dispute timeline** for tenant + landlord (status, next step, ETA).
- **Standardised evidence templates** for damage, unpaid utilities, early exit (upload + checklist per type).
- **Outcome analytics table** — resolution time, outcome distribution, evidence types, escalation rate.

### 1.5 — Namibia-specific trust signals

- **POPIA compliance badge** in KYC wizard + landlord onboarding (link to plain-language summary).
- **Namibian bank reference formats** on EFT uploads (FNB NA, Bank Windhoek, Standard Bank NA).
- **Windhoek suburb names** in market/UI context (Kleine Kuppe, Eros, etc.) — never generic "suburb" only.

---

## Phase 2 — Growth flywheel (months 3–7)

**Goal:** Solve chicken-and-egg; onboard landlords; scale payment confirmation reliably.

### 2.1 — Landlord onboarding redesign

- **Readiness checklist** on dashboard — blocking steps + estimated review times.
- **Bulk unit CSV import** with template + validation (required for 5+ units).
- **Onboarding email sequence** (5–7 emails / 30 days) — educational, not transactional.
- **"Lite landlord" tier** (1–3 units) — reduced B2B consent burden, still confirms payments.

### 2.2 — Invite-only bootstrapping

- **Tenant waitlist** by suburb — notify when a landlord joins.
- **"Bring your landlord"** — tenant-triggered invite from their name.
- **Retrospective payment import** (CSV / bank statement) for instant score history.

### 2.3 — Payment confirmation UX hardening

- A/B auto-confirm window (24h / 48h / 72h) — dispute rate vs lag.
- **Landlord confirmation analytics** — avg time, dispute rate vs platform median.
- **Bulk confirm** for month-end payment batches.

### 2.4 — Dispute resolution maturation

- Admin structured outcomes (full / partial / no refund) + auto-notify + analytics log.
- **5-business-day appeal** to senior reviewer.
- **Dispute risk signals** on landlord dashboard.

---

## Phase 3 — Data monetisation (months 7–12)

**Goal:** Convert payment data into B2B revenue; make the data product believable before full API sales.

### 3.1 — Public market intelligence dashboard

- Public aggregate dashboard (`data.crenit.na`) — median rent by suburb, on-time rate, deposits, trends (n≥10 suppression).
- Shareable suburb pages for sales.
- **Request access** CTA = B2B lead gen.
- Monthly refresh — stale data hurts credibility.

### 3.2 — B2B self-serve demo layer

- Email-verified **data sample API key** — single suburb / period aggregate.
- **B2B sample PDF** — methodology, confidence, suppression, 3-suburb sample.
- Published API docs: n&lt;5 rule, confidence, freshness, depth.
- **Data tiers:** free public vs paid API vs enterprise feed.

### 3.3 — Namibian bank integration targets

- Named targets: FNB Namibia, Bank Windhoek, Standard Bank Namibia ("coming soon" in product).
- Early innovation / credit risk conversations.
- **Export format** designed to match bank ingestion specs.

### 3.4 — Dispute analytics and policy intelligence

- Quarterly dispute pattern review → update evidence templates.
- Optional arbitration partnership for binding resolution tier.

---

## Cross-cutting principles

1. **Tighten the loop:** payment → confirm → score → tenant value → landlord trust.
2. **Namibian context is a differentiator** — banks, suburbs, POPIA, reference formats.
3. **Data integrity over growth speed** — invite-only model stays; noisy data kills B2B.
4. **Admin tooling keeps pace** — no user flows that create admin black holes.
5. **Measure the flywheel** — confirmation lag, score update frequency, dispute resolution time, tenant retention — not just signups.

---

# Lead engineering annex

*How Phase 1 maps to `main` today, what to build, and in what order.*

## 4. Current baseline vs roadmap

*Updated after Phase 1 implementation (`e296c90`–`e5e728b`). Staging proof = ⬜ until smoke passes.*

| Roadmap item | Status on `main` | Remaining gap |
|--------------|------------------|---------------|
| **1.1 Named tiers** | ✅ Bronze–Platinum + progress (`tier-branding.ts`, home, credit-score) | Staging UX proof |
| **1.1 Score explainer** | ✅ `GET /credit-score/insights` | Tune copy from real data |
| **1.1 Simulator** | ✅ `POST /credit-score/simulate` + UI slider | — |
| **1.3 Shareable PDF** | ✅ `POST /reports/credit-score/share`, tier badge, QR, history | — |
| **1.3 Verification URL** | ✅ Expiry/revoke on verify; `brand_tier` in payload | Custom domain `verify.crenit.na` |
| **1.2 Auto-confirm** | ✅ `0036`, hourly cron + `cron-auto-confirm.yml`, `PAYMENT_AUTO_CONFIRM_HOURS` | Prove on staging |
| **1.2 SMS/WhatsApp nudge** | ⏸ Email + in-app only | SMS vendor (P1-S7) |
| **1.2 One-tap confirm link** | ✅ `/confirm-payment/[token]`, `public/payment-confirm` | — |
| **1.2 Confirmation dashboard** | ✅ `/landlords/payment-confirmations/pending`, bulk confirm | — |
| **1.4 Dispute timeline** | ✅ `dispute_events`, templates, tenant timeline UI | Landlord-side timeline UI |
| **1.4 Evidence templates** | ✅ `DAMAGE_CLAIM`, `UNPAID_UTILITIES`, `EARLY_EXIT` | — |
| **1.4 Outcome analytics** | Partial — `dispute_outcomes` table exists | Wire admin close → analytics charts |
| **1.5 POPIA badge** | ✅ KYC wizard + legal pages banner | Dedicated plain-language summary page |
| **1.5 NA bank refs** | Partial — hints on EFT UI | Server-side validation per bank |
| **1.5 Suburb names** | Partial — `namibia-locale.ts` | Surface in marketing/MI teaser UI |
| **Flywheel dashboard** | ✅ Admin system-health 30d metrics | MI capture rate metric (future) |

**Phase 2+:** not started (waitlist, BYOL, CSV bulk units, public `data.crenit.na`, sample API keys).

---

## 5. Phase 1 engineering sequence (recommended sprints)

Do **not** parallelise 1.2 and 1.1 completely — but **1.2 auto-confirm** should start immediately after tier copy (week 2) because it unblocks data velocity.

| Sprint | Focus | Deliverables | Migrations / API |
|--------|--------|--------------|------------------|
| **P1-S1** | Score communication v1 | Tier rebrand (Bronze–Platinum), copy, next-tier card, home + credit-score refresh | `tier_definitions` config or constants; optional `score_insights` API |
| **P1-S2** | Score insights + simulator | `GET /credit-score/insights`, `POST /credit-score/simulate`; actionable strings from factor math | Pure service layer on existing `credit-score.service.ts` |
| **P1-S3** | Shareable PDF v2 | Redesigned PDF template, share token + expiry, QR in PDF | `report_shares` table; extend `reports.service.ts` |
| **P1-S4** | Verification hardening | Rich verify page, expiry enforcement, public metadata | Extend `reports/verify/:ref` |
| **P1-S5** | Auto-confirm core | `payments.auto_confirm_at`, cron `payments-auto-confirm`, admin config env | Migration `0036_payment_auto_confirm.sql`; cron job |
| **P1-S6** | Confirm UX | Landlord pending dashboard, signed one-tap links, email nudge templates | `POST /payments/confirm-token/:token`; notification events |
| **P1-S7** | SMS nudges (if provider ready) | Twilio/africa's talking hooks for 24h reminder | `SMS_*` env; defer if no vendor |
| **P1-S8** | Dispute foundation | Timeline UI both sides, 3 dispute type templates | `dispute_events` timeline table; extend `deposits.service.ts` |
| **P1-S9** | Dispute analytics + trust | Outcome analytics admin; POPIA badge; suburb display pass | `dispute_analytics` views; content page |
| **P1-S10** | NA bank reference hints | EFT upload helper text + optional validation | Client + light server validation |

**Exit criteria for Phase 1:**

- [ ] Median landlord confirmation lag p50 &lt; 36h (track on `/admin/system-health` → Flywheel).
- [ ] Auto-confirm rate ≥ 40% of EFT confirms (`confirmed_via = AUTO`).
- [ ] Tenant PDF shares increasing (`report_verifications` 30d count).
- [ ] Dispute "where is my case" contacts down vs baseline.
- [x] Flywheel metrics dashboard (internal) — shipped `e5e728b`; MI capture rate TBD.

---

## 6. Technical notes (lead dev)

### 6.1 Tier system

- Keep **internal score math** (0–100 / display score) stable for audit; add **presentation tier** mapping in one module (`apps/api/src/credit-score/tier-branding.ts` + shared types in web).
- Do not break admin overrides or `credit_scores.tier` history — migrate labels, don't rewrite scores.

### 6.2 Score simulator

- Project using **same weights** as production (50/30/20) with assumed on-time payments; cap projections and show "estimate" disclaimer.
- No ML — deterministic projection from `payments` + hypothetical streak.

### 6.3 Auto-confirm

- On landlord confirm OR auto-confirm: reuse existing `confirmPayment` path so MI capture + score recalc stay single code path.
- Dispute within window **blocks** auto-confirm (status `DISPUTED` or flag on payment).
- Log `confirmed_via: MANUAL | AUTO | TOKEN_LINK` for analytics.

### 6.4 One-tap confirm tokens

- HMAC/JWT with `payment_id`, `landlord_id`, `exp`; single-use or short TTL.
- Rate-limit public confirm endpoint; audit in `admin_audit_log`.

### 6.5 PDF + verification

- PDFKit already used in API — extend template, don't add client-side print.
- Share records: `reference`, `tenant_id`, `expires_at`, `revoked_at`, content hash for verify.

### 6.6 Disputes

- Append-only `dispute_events` for timeline (status changes, messages, evidence uploaded).
- Templates as enum `DISPUTE_TYPE` + JSON schema for required fields.

### 6.7 Dependencies outside code

- **SMS/WhatsApp vendor** (Phase 1.2) — pick before P1-S7.
- **Legal** — POPIA badge copy counsel-approved (`docs/legal/POPIA_COMPLIANCE_PACK.md`).
- **`verify.crenit.na`** — DNS + Vercel subdomain or path on main site.

---

## 7. What we explicitly defer (Phase 1)

- Live payment gateway (merchant) — stays simulated for card/mobile.
- Public `data.crenit.na` dashboard — Phase 3.
- Tenant waitlist / BYOL — Phase 2.
- Lite landlord tier — Phase 2 (needs partner-approval rule changes).
- Bank score export integrations — Phase 3.

---

## 8. Flywheel metrics (instrument from Phase 1)

| Metric | Source | Target (staging → prod) |
|--------|--------|------------------------|
| Confirmation lag (hours) | `payments.confirmed_at - paid_at` | p50 &lt; 36h |
| Auto-confirm rate | `confirmed_via = AUTO` | &gt;40% of EFT confirms |
| Score refresh after PAID | time to new `credit_scores` row | &lt; 5 min |
| MI capture rate | PAID with consent / PAID total | track baseline |
| PDF shares / month | `report_shares` count | growing |
| Dispute median resolution days | `dispute_outcomes` | &lt; 14 days |

---

## 9. Related docs

| Doc | Use |
|-----|-----|
| `docs/SYSTEM_OVERVIEW.md` | What exists today |
| `docs/CRITICAL_GAPS.md` | Launch gates |
| `docs/MARKET_INTELLIGENCE.md` | Phase 3 data product |
| `docs/legal/POPIA_COMPLIANCE_PACK.md` | Phase 1.5 legal |

---

*Phase 1 code is on `main`. Complete staging validation (see [`PROJECT_STATUS.md`](PROJECT_STATUS.md)) before Phase 2.*
