# CRENIT — System Overview

**Last updated:** June 2026 · **Codebase:** `main` @ `e5e728b`

This document describes what CRENIT is, what it does, and how it works.  
**For current position (phase, staging gates, what’s done):** see **[`docs/PROJECT_STATUS.md`](PROJECT_STATUS.md)**.

---

## 1. What CRENIT is

**CRENIT** (also referred to as **RentCredit** in early docs) is a Namibian fintech platform that turns **verified rent payments** into **rental credit identity** and **aggregated market intelligence**.

### Mission

Help tenants build a credible credit profile from on-time rent, give landlords portfolio tools and verified tenant data, and supply banks, lenders, and developers with **anonymised, transaction-backed** rental market data — not listing scrapes or self-reported prices.

### Commercial flywheel

```
Verified landlords
  → verified tenants (invite-only onboarding)
  → verified payment records (EFT + landlord confirmation)
  → accurate credit scores + market data
  → B2B licensing revenue
  → more landlord partnerships
  → more data volume and quality
```

Every major feature (KYC, partner approval, in-platform payments, credit scoring) exists to make data **accurate, auditable, and commercially valuable**. Features that weaken data integrity are out of scope.

### Data integrity principles

1. **Rigorous KYC** — government ID, selfie, income proof, address proof; admin review before pay access.
2. **Verified landlords** — partner approval and KYC before inviting tenants or adding properties.
3. **Defensible credit scores** — calculated from verified payments; admin overrides require audit notes.
4. **No PII in market exports** — aggregated signals only; minimum sample rules (e.g. n&lt;5 suppression).
5. **Traceable sources** — reports show transaction counts and date ranges, not estimates.

---

## 2. Who uses the platform

| Role | Primary goals |
|------|----------------|
| **Tenant** | Pay rent, build credit score, manage deposit, download reports, complete KYC |
| **Landlord** | Manage properties/units, invite tenants, confirm payments, handle deposits/disputes, view portfolio and optional market-data consent |
| **Admin** | KYC queue, partner approvals, payments oversight, disputes, credit audit, GDPR tools, system health |
| **B2B client** (API) | Licensed access to anonymised rental market intelligence (reports, webhooks) |

Tenants **cannot self-enrol onto a property** — they join via **landlord invite** (`/join/[token]`).

---

## 3. Technology architecture

### Monorepo layout

| Path | Stack | Purpose |
|------|--------|---------|
| `apps/api` | **NestJS** (Node 20) | REST API, schedulers, email, B2B integrations |
| `apps/web` | **Next.js** (App Router), Tailwind, Recharts | Marketing site + tenant/landlord/admin dashboards |
| `supabase/migrations` | **PostgreSQL** (Supabase) | Schema, RLS, storage buckets |

### Runtime topology (staging / production)

| Service | Host | Notes |
|---------|------|--------|
| Web | **Vercel** (`apps/web`) | Public UI; `NEXT_PUBLIC_*` env vars only |
| API | **Render** (repo root build) | Service-role Supabase access; never expose secrets to web |
| Database & Auth | **Supabase** | Postgres + Auth + private storage buckets |
| Schedulers | API in-process **+** GitHub Actions | External cron POSTs `/internal/cron/:job` with `CRON_SECRET` |
| Errors (optional) | **Sentry** | `SENTRY_DSN` (API), `NEXT_PUBLIC_SENTRY_DSN` (web) |

### Auth model

- **Supabase Auth** issues JWTs; API validates Bearer tokens.
- **Roles** on `profiles`: `TENANT`, `LANDLORD`, `ADMIN` (`ADMIN` also gated by `ADMIN_EMAILS`).
- **TOTP 2FA** for admins/landlords when enabled; optional mandatory admin 2FA (`ADMIN_REQUIRE_2FA=true`).
- Marketing routes load **without** `AuthProvider` (performance); session routes use `AuthScopeLayout`.

### API modules (high level)

`auth` · `tenants` · `landlords` · `properties` · `kyc` · `payments` · `deposits` · `credit-score` · `reports` · `notifications` · `admin` · `market-intelligence` · `market-data` · `settings` · `public` · `ops` (cron)

---

## 4. How the platform works (end-to-end)

### 4.1 Landlord onboarding

1. Landlord registers / logs in.
2. Completes **landlord KYC** (identity + property verification wizard).
3. **Admin partner approval** unlocks sensitive actions (`assertPartnerApproved`).
4. Landlord adds **properties** and **units** (rent, due dates).
5. Landlord **invites tenant** by email + unit → system sends invite link.

### 4.2 Tenant onboarding (invite-only)

1. Tenant opens `/join/[token]` → preview invite.
2. **Accept invite** → Supabase account + `profiles` row + **active lease** (if unit valid).
3. System may seed **first pending EFT payment** on the lease.
4. Tenant completes **3-step KYC wizard** (personal, residence, documents).
5. **Admin approves KYC** → `assertKycApproved` allows payments.
6. Tenant pays via **EFT** (upload proof optional) → landlord **confirms receipt**.
7. Payment marked **PAID** → credit score recalculates; optional **market data capture** if consented.

### 4.3 Rent payment lifecycle

```
PENDING → (tenant initiates / schedule generates)
       → PROCESSING (EFT proof uploaded)
       → PAID (landlord confirm or auto-pay job)
       → OVERDUE (scheduler if past due)
```

- **Commission:** ~1% on gross rent (configurable per payment row).
- **Card / mobile money:** initiated in UI but **simulated** until a live merchant is integrated (accepted deferral).
- **EFT:** production path — proof stored in private `payment-proofs` bucket.

### 4.4 Credit score engine

Current CRENIT model (0–100 internal, displayed tier to user):

| Factor | Weight | Based on |
|--------|--------|----------|
| Payment history | **50%** | On-time vs total payments |
| Amount defaulted | **30%** | Overdue/default amounts |
| History length | **20%** | Months of active tenancy/payments |

Tenant home and `/tenant/credit-score` show **streak**, **12-month on-time rate**, tier, and history. Admins can audit and override with notes at `/admin/credit-scores`.

### 4.5 Lease renewals

1. Landlord proposes renewal from `/landlord/leases` (`POST /landlords/leases/:id/renewals`).
2. Tenant sees proposal on home + notification bell.
3. Tenant **approves / rejects / counter-offers**.
4. On approval, lease terms update (`end_date`, `monthly_rent`).

### 4.6 Deposits & disputes

- Deposits held in escrow per lease/tenant.
- Tenant or landlord can open **disputes** with evidence.
- Admin arbitrates; funds released per outcome.
- Surfaces on landlord, tenant, and admin dispute UIs.

### 4.7 Notifications

- In-app **notification bell** on all dashboard shells (tenant, landlord, admin).
- **Realtime** via Supabase (`0035_notifications_realtime.sql`).
- Email hooks: invites, KYC outcomes, rent reminders, overdue, renewals, contact form.
- User preferences in settings / migration `0014`.

### 4.8 Background jobs (Namibia-oriented)

| Job | Typical purpose |
|-----|-----------------|
| `payments-autopay` | Simulated auto-pay where configured |
| `notifications-rent-reminder` | Upcoming due rent emails |
| `payments-overdue` | Mark overdue + notify |
| `credit-score-recalc` | Batch score updates |
| `notifications-kyc-renewal` | KYC expiry / renewal prompts |
| `mi-snapshot-rollup` | Market intelligence aggregates |
| `mi-licensable-webhooks` | B2B webhook delivery |
| `mi-webhook-retry` | Retry failed webhooks (every 15 min) |

Jobs run **in-process** when the API is up, and via **GitHub Actions** hitting `POST /internal/cron/:job` with header `X-Cron-Secret` so they survive API restarts.

### 4.9 Market intelligence (B2B)

On each **PAID** payment (with consent):

1. `MarketIntelligenceCaptureService` writes anonymised row to `market_intelligence.market_data_records`.
2. Aggregations power suburb reports, landlord dashboards, and **B2B API keys**.
3. Webhooks notify integrators; retries via cron.
4. No tenant names or street addresses in licensed exports.

See `docs/MARKET_INTELLIGENCE.md` and `docs/B2B_INTEGRATOR_GUIDE.md` for detail.

---

## 5. Features by surface

### 5.1 Marketing & public (`apps/web`)

| Area | Routes / features |
|------|-------------------|
| Homepage | SSR marketing, product teasers |
| Products / Solutions | Rent payments, credit score, deposits, market data |
| Company | About, how it works, contact, **blog** |
| Legal | `/company/privacy`, `/company/terms` (draft — counsel review banner) |
| Auth | Login, register, forgot/reset password, 2FA verify |
| Join | `/join/[token]` invite acceptance |

### 5.2 Tenant dashboard (`/tenant/*`)

| Module | What it does |
|--------|----------------|
| **Home** | Rent due, score tier, streak, renewals, notifications |
| **Payments** | Pay rent (EFT/card/mobile UI), history, receipts, auto-pay |
| **Deposit** | Escrow balance, timeline, dispute filing |
| **Credit score** | Gauge, factors, history chart |
| **Reports** | PDF rent credit report |
| **KYC** | Wizard + resubmit |
| **Settings** | Profile, security, notification prefs |

### 5.3 Landlord dashboard (`/landlord/*`)

| Module | What it does |
|--------|----------------|
| **Overview** | Portfolio stats, CTAs, empty states |
| **Properties** | Add/edit properties and units |
| **Tenants** | Directory, KYC status, scores |
| **Leases** | Active leases, **propose renewal** |
| **Payments** | Incoming log, confirm EFT, commission view |
| **Deposits** | Escrow per tenant |
| **Reports** | Portfolio + per-tenant PDFs |
| **Market data** | Consent-based insights |
| **Attachments** | Document uploads |
| **Settings** | Profile, 2FA, bank details |

### 5.4 Admin portal (`/admin/*`)

| Module | What it does |
|--------|----------------|
| **Overview** | Platform pulse, attention queue, **health link** |
| **Users** | Search, suspend, roles |
| **KYC queue** | Approve/reject tenant & landlord KYC |
| **Partner approvals** | Landlord onboarding gate |
| **Service requests** | Assisted document reviews |
| **Payments** | Volume, settlement oversight |
| **Disputes** | Escrow arbitration |
| **Credit scores** | Audit, anomalies, overrides |
| **Data intelligence** | B2B clients, API usage |
| **Compliance** | GDPR export & anonymise |
| **Audit log** | Admin action history |
| **KYC compliance** | Consent & verification audit |
| **Security** | Mandatory 2FA setup gate |
| **System health** | DB probes, scheduler heartbeats, smoke tests, **Sentry/cron flags** |

---

## 6. Database & security

### Schema

- **36 migrations** (`0001`–`0035`), including KYC wizard, market intelligence, 2FA, EFT proofs, realtime notifications.
- Core entities: `profiles`, `properties`, `units`, `leases`, `payments`, `deposits`, `credit_scores`, `notifications`, `lease_renewals`, `kyc_documents`, `admin_audit_log`, `gdpr_events`, market intelligence schema.

### Row-level security (RLS)

- Policies in `0012_rls_policies.sql` for tenant/landlord-scoped reads.
- API uses **service role** for trusted server operations; validate RLS with `npm run validate:rls` on staging.

### Storage

- Private buckets: **KYC documents**, **payment proofs**, attachments — signed URLs only, no public buckets for sensitive files.

### Hardening

- Rate limiting (`RATE_LIMIT_*`)
- Security headers on web (`vercel.json`)
- Standardised API errors `{ error, code, statusCode }`
- Startup env validation for required keys

---

## 7. Testing, CI, and observability

### Automated tests

| Layer | Tool | Scope |
|-------|------|--------|
| Unit | Vitest | Payment metrics, API utilities |
| E2E | Playwright | Public pages, auth, dashboard shells, optional tenant login |
| API smoke | `scripts/smoke-staging-e2e.mjs` | Full lifecycle: invite → KYC → pay → score; renewals; cron probe |
| Lifecycle E2E | `e2e/staging-lifecycle.spec.ts` | Staging renewal + tenant home |

CI: `.github/workflows/ci.yml` (lint, build, tests).

### Observability

- **Admin:** `/admin/system-health` — probes, alerts, smoke, observability strip.
- **Sentry:** optional on Render + Vercel (`docs/OBSERVABILITY.md`).
- **Cron:** `.github/workflows/cron.yml`, `cron-webhook-retry.yml`.
- **Deploy gates:** `npm run verify:deploy-gates`.

---

## 8. Current stage (June 2026)

> **Canonical status:** [`docs/PROJECT_STATUS.md`](PROJECT_STATUS.md) — phase, commits, staging checklist, Phase 2/3 queue.

### Summary

- **Phase 1 (Core product trust)** — implemented on `main` (`e296c90`–`e5e728b`): Bronze–Platinum tiers, score insights/simulator, shareable PDF + verify expiry, EFT **auto-confirm** (48h), one-tap landlord confirm, dispute templates/timeline, flywheel metrics on admin health.
- **Staging validation** — apply migrations **`0035`** + **`0036`**, redeploy, run smoke; prove confirm lag and auto-confirm rate.
- **Phase 2 / 3** — not started (waitlist, BYOL, public data dashboard).
- **Production** — not signed off (P0 gates, legal counsel, live payment gateway deferred).

### P0 release gates (before production)

1. Apply Supabase migrations through **`0036`** on staging then prod (`supabase/scripts/staging_apply_reference.sql`).
2. Run `npm run validate:rls` and `npm run smoke:staging` against staging API.
3. Configure secrets: `JWT_SECRET`, `ADMIN_EMAILS`, `CORS_ORIGIN`, `WEB_URL`, email, `CRON_SECRET`, optional Sentry.
4. Redeploy Vercel + Render from latest `main`.
5. Legal counsel sign-off on privacy/terms (`docs/legal/POPIA_COMPLIANCE_PACK.md`).

Full checklist: `docs/STAGING_RELEASE_CHECKLIST.md`, `docs/CRITICAL_GAPS.md`, `docs/MIGRATION_RUNBOOK.md`.

---

## 9. Local development (quick start)

```bash
# From repo root
cp .env.example .env          # API secrets
cp apps/web/.env.local.example apps/web/.env.local
npm install
npm run seed:demo             # demo users (admin/landlord/tenant)
npm run dev                   # API :3001 + web :3002
```

**Demo accounts** (after seed): see `README.md` — e.g. `tenant@rentcredit.demo`, `landlord@rentcredit.demo`, `admin@rentcredit.demo`.

**Useful scripts:**

| Command | Purpose |
|---------|---------|
| `npm run smoke:local` | Local API smoke |
| `npm run smoke:staging` | Staging E2E (set `API_URL`) |
| `npm run verify:deploy-gates` | Pre-deploy artifact check |
| `npm run configure:sentry-env` | Add Sentry placeholders to `.env` |
| `npm run test:e2e` | Playwright (from web workspace) |

---

## 10. Related documentation

| Document | Contents |
|----------|----------|
| `README.md` | Setup, demo users, module tables |
| `docs/CRITICAL_GAPS.md` | P0–P3 launch gate audit |
| `IMPLEMENTATION_STATUS.md` | Sprint-level implementation log |
| `DEPLOYMENT.md` | Vercel + Render env vars |
| `docs/MIGRATION_RUNBOOK.md` | DB migration order |
| `docs/STAGING_RELEASE_CHECKLIST.md` | Manual staging sign-off |
| `docs/OBSERVABILITY.md` | Sentry, cron, health dashboard |
| `docs/MARKET_INTELLIGENCE.md` | B2B data product deep dive |
| `docs/legal/POPIA_COMPLIANCE_PACK.md` | Legal backlog tracker |
| `RENT.MD` | Original product spec (V6) |
| `docs/PROJECT_STATUS.md` | **Where we are now** — phase, staging gates, sprint checklist |
| `docs/PRODUCT_ROADMAP_3_PHASES.md` | 3-phase product build + engineering sprint plan |

---

## 11. Glossary

| Term | Meaning |
|------|---------|
| **CRENIT / RentCredit** | Product names used interchangeably in repo history |
| **Partner approval** | Admin gate before landlord can invite tenants |
| **CRENIT score** | Rental credit score from verified platform payments |
| **Market intelligence** | Anonymised, consent-based rental data for B2B clients |
| **POPIA** | Namibia Protection of Personal Information Act |
| **Service role** | Supabase server key — API only, never in browser |

---

*This overview is maintained alongside `docs/CRITICAL_GAPS.md`. Update it when major features ship or production status changes.*
