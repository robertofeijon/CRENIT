# CRENIT — Project status (where we are)

**Single source of truth for current position.**  
**Last updated:** June 2026 · **`main` @ `e5e728b`**

---

## At a glance

| Dimension | Status |
|-----------|--------|
| **Product phase** | **Phase 1 (Core product trust)** — code largely complete; **staging validation in progress** |
| **Phase 2 (Growth flywheel)** | Not started |
| **Phase 3 (Data monetisation)** | Not started |
| **Production launch** | **Not signed off** — P0 gates + legal counsel pending |
| **Branch** | `main` (pushed to GitHub) |
| **Hosting** | Web → Vercel · API → Render · DB → Supabase |

---

## Recent releases on `main`

| Commit | Summary |
|--------|---------|
| `e5e728b` | Flywheel metrics on admin system health; tenant home Bronze–Platinum tier; staging ref 0035/0036 |
| `e296c90` | **Phase 1 trust:** score tiers, insights, simulator, auto-confirm EFT, shareable PDF, dispute UX, migration `0036` |
| `1492404` | `SYSTEM_OVERVIEW.md` + `PRODUCT_ROADMAP_3_PHASES.md` |
| `4871ee5` | Observability, external cron, staging E2E lifecycle, legal polish |
| `2ab6ace` | Auth scoped to session routes; legacy `/dashboard` removed; deploy gates |

---

## Phase 1 — sprint status

Roadmap detail: [`docs/PRODUCT_ROADMAP_3_PHASES.md`](PRODUCT_ROADMAP_3_PHASES.md)

| Sprint | Feature | Code | Staging proven |
|--------|---------|------|----------------|
| **P1-S1** | Bronze→Platinum tiers, progress on credit-score + home | ✅ | ⬜ |
| **P1-S2** | `GET /credit-score/insights`, `POST /credit-score/simulate` | ✅ | ⬜ |
| **P1-S3** | Shareable credit PDF (`POST /reports/credit-score/share`) | ✅ | ⬜ |
| **P1-S4** | Verify page + expiry/revocation on `report_verifications` | ✅ | ⬜ |
| **P1-S5** | Auto-confirm (`0036`, cron `payments-auto-confirm`, 48h default) | ✅ | ⬜ |
| **P1-S6** | One-tap `/confirm-payment/[token]`, landlord pending + bulk confirm | ✅ | ⬜ |
| **P1-S7** | SMS/WhatsApp nudges | ⏸ Deferred | — |
| **P1-S8** | Dispute types, templates, `dispute_events` timeline | ✅ | ⬜ |
| **P1-S9** | POPIA badge (KYC), flywheel panel; admin dispute outcome charts | **Partial** | ⬜ |
| **P1-S10** | NA bank reference hints on EFT UI | ✅ (hints only) | ⬜ |

**Phase 1 exit criteria** (measure after staging traffic):

- [ ] Confirm lag p50 &lt; 36h (`/admin/system-health` → Flywheel metrics)
- [ ] Auto-confirm rate ≥ 40% of EFT confirms
- [ ] Tenants sharing PDFs (track `report_verifications` count)
- [ ] Dispute “where is my case?” volume down (baseline TBD)

---

## What you must do on staging (manual)

These are **not** automatic when code merges.

### 1. Supabase migrations

Apply in order (reference: [`supabase/scripts/staging_apply_reference.sql`](../supabase/scripts/staging_apply_reference.sql)):

```
0026 … 0033  (KYC, MI, 2FA — if not already applied)
0034         payment EFT proofs
0035         notifications realtime
0036         Phase 1 trust (auto_confirm_at, confirmed_via, dispute_events, report expiry)
```

Verify `0036`:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'payments'
  AND column_name IN ('auto_confirm_at', 'confirmed_via', 'confirmation_disputed_at');
```

### 2. Redeploy

- **Vercel** — `apps/web` from latest `main`
- **Render** — API from latest `main`

### 3. GitHub secrets (for external cron)

| Secret | Purpose |
|--------|---------|
| `CRON_SECRET` | Same as Render `CRON_SECRET` |
| `API_URL` | Render API base URL |

Workflows: `cron.yml`, `cron-webhook-retry.yml`, **`cron-auto-confirm.yml`**

### 4. Optional observability

| Env (Render) | Env (Vercel) |
|--------------|----------------|
| `SENTRY_DSN` | `NEXT_PUBLIC_SENTRY_DSN` |
| `PAYMENT_AUTO_CONFIRM_HOURS=48` | `NEXT_PUBLIC_SENTRY_PROJECT_URL` |

### 5. Smoke tests

```bash
npm run validate:rls
API_URL=https://your-api CRON_SECRET=... npm run smoke:staging
npm run verify:deploy-gates
```

Manual UI path: [`docs/STAGING_RELEASE_CHECKLIST.md`](STAGING_RELEASE_CHECKLIST.md) §2 + §10 (bell, renewals, **one-tap confirm**, **share PDF**).

---

## Platform capabilities today (code on `main`)

### Core loop

```
Landlord invite → Tenant KYC → EFT pay → Landlord confirm (or auto-confirm) → Score → optional PDF share → MI capture
```

### Notable Phase 1 surfaces

| Who | Where | What |
|-----|-------|------|
| Tenant | `/tenant/credit-score` | Tier, insights, simulator |
| Tenant | `/tenant/reports` | Shareable PDF + expiry days |
| Tenant | `/tenant/kyc` | POPIA trust badge |
| Tenant | `/tenant/deposit` | Typed dispute + timeline |
| Landlord | `/landlord/payments` | Pending confirmations, bulk confirm, one-tap links |
| Landlord | `/confirm-payment/[token]` | Public confirm/dispute (no login) |
| Admin | `/admin/system-health` | Observability + **flywheel metrics (30d)** |
| Public | `/verify/[reference]` | PDF authenticity + expiry |

### Still simulated / deferred

- Card & mobile money payments (no live merchant)
- SMS confirmation nudges (email + in-app only)
- Legal sign-off on privacy/terms ([`docs/legal/POPIA_COMPLIANCE_PACK.md`](legal/POPIA_COMPLIANCE_PACK.md))
- Production payment gateway integration

---

## Phase 2 — next product work (not started)

When Phase 1 exit criteria are met on staging:

1. **2.1** Landlord readiness checklist + review-time estimates  
2. **2.2** Tenant waitlist + “bring your landlord” flow  
3. **2.3** Bulk CSV unit import  
4. **2.4** Dispute admin outcomes + appeal window  

---

## Phase 3 — data monetisation (not started)

- Public `data.crenit.na` market dashboard  
- B2B self-serve sample API + sales PDF  
- Bank integration targets (FNB NA, Bank Windhoek, Standard Bank NA)  

---

## Gap audit summary

| Priority | Open items |
|----------|------------|
| **P0** | Migrations **0035/0036** on staging/prod; RLS smoke; prod secrets; live gateway **deferred**; email verify in prod |
| **P1** | Legal counsel on privacy/terms; `dispute_outcomes` admin wiring |
| **P2** | SMS 2FA; SMS confirm nudges; `verify.crenit.na` custom domain |
| **P3** | Mobile apps, Open Banking, full POPIA pack |

Full list: [`docs/CRITICAL_GAPS.md`](CRITICAL_GAPS.md)

---

## Documentation map

| Read this… | When you need… |
|------------|----------------|
| **This file** | “Where exactly are we?” |
| [`SYSTEM_OVERVIEW.md`](SYSTEM_OVERVIEW.md) | What CRENIT is and how it works |
| [`PRODUCT_ROADMAP_3_PHASES.md`](PRODUCT_ROADMAP_3_PHASES.md) | Full 3-phase plan + engineering notes |
| [`STAGING_RELEASE_CHECKLIST.md`](STAGING_RELEASE_CHECKLIST.md) | Pre-prod sign-off steps |
| [`OBSERVABILITY.md`](OBSERVABILITY.md) | Sentry, cron, health dashboard |
| [`MIGRATION_RUNBOOK.md`](MIGRATION_RUNBOOK.md) | DB migration procedure |
| [`DEPLOYMENT.md`](../DEPLOYMENT.md) | Vercel + Render env vars |

---

## One-line summary

**CRENIT is a staging-ready Namibian rental-credit platform with Phase 1 trust features shipped in code; you are validating on staging (migrations 0035–0036, deploy, smoke) before Phase 2 growth work and production sign-off.**
