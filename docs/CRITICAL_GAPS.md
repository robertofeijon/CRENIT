# CRENIT — Critical & high-priority gap audit

Senior full-stack review of `main` @ June 2026 (`e5e728b`).  
**Current position:** [`docs/PROJECT_STATUS.md`](PROJECT_STATUS.md). Use this as the **release gate** alongside `UPDATED_IMPLEMENTATION_SUMMARY.md`.

---

## Legend

| Priority | Meaning |
|----------|---------|
| **P0** | Block production / regulatory / security launch |
| **P1** | Expected for a credible v1 product |
| **P2** | Important but can ship shortly after launch |
| **P3** | Nice-to-have |

| Status | Meaning |
|--------|---------|
| Done | In code on `main` |
| Partial | Exists but incomplete or dev-only |
| Missing | Not implemented |
| Process | Requires staging/prod validation, not code |

---

## P0 — Must not launch without

| # | Area | Status | Notes |
|---|------|--------|-------|
| 1 | **Supabase migrations applied** | Process | Run `0026`–`0036` on staging then prod (`supabase/scripts/staging_apply_reference.sql`) |
| 2 | **RLS + service-role smoke** | Process | Policies in `0012_rls_policies.sql`; API uses service role — validate tenant cannot read others’ rows via anon client |
| 3 | **Production env + secrets** | Process | `JWT_SECRET` ≥32 chars, `ADMIN_EMAILS`, `CORS_ORIGIN`, SMTP/Resend, `WEB_URL` for email links |
| 4 | **Backup before migrate** | Process | Release gate item |
| 5 | **Payment gateway (live money)** | Missing | Card/mobile **simulated**; EFT + landlord confirm works. Blocked on merchant — **accepted deferral** |
| 6 | **Transactional email in prod** | Done | `email_delivery_log`, startup validation, retry queue (1m cron), `/admin/system-health` panel + `POST /admin/system-health/email-test`, failed log at `GET /admin/email-delivery/failed` — migration `0039` |

---

## P1 — Very needed for a trustworthy v1

| # | Area | Status | Notes |
|---|------|--------|-------|
| 7 | **Password reset** | Done | `/auth/forgot-password`, `/auth/reset-password` (Supabase). Add redirect URLs in Supabase Auth settings |
| 8 | **KYC before pay** | Done | `assertKycApproved` on payment routes |
| 9 | **Landlord partner approval** | Done | UI guard + `assertPartnerApproved` on sensitive APIs |
| 10 | **TOTP 2FA + admin/landlord step-up** | Done | Enforced when enabled; login → `/auth/verify-2fa` |
| 11 | **Invite → lease → first payment E2E** | Done | `scripts/smoke-staging-e2e.mjs` + `e2e/staging-lifecycle.spec.ts` (invite accept → KYC → approve → EFT confirm → score) |
| 12 | **Lease renewal E2E** | Done | Smoke + Playwright: landlord propose → tenant accept |
| 13 | **Deposit escrow + disputes** | Done | APIs + landlord/tenant/admin UIs |
| 14 | **Credit score + payment metrics** | Done | Streak + on-time rate on home/credit-score |
| 15 | **Schedulers (auto-pay, overdue, reminders)** | Done | In-process + GitHub Actions `cron.yml`, `cron-webhook-retry.yml`, **`cron-auto-confirm.yml`** |
| 16 | **Privacy / Terms pages** | Partial | `/company/privacy`, `/company/terms` + counsel-review banner; `docs/legal/POPIA_COMPLIANCE_PACK.md` backlog |
| 17 | **Automated tests** | Done | Vitest payment-metrics + Playwright (public pages + optional tenant login via `E2E_TENANT_*` secrets) + CI |
| 18 | **Admin operational smoke** | Done | `POST /admin/system-health/smoke` |
| 19 | **GDPR export/anonymise** | Done | `/admin/compliance` |
| 20 | **Rate limiting + security headers** | Done | `rate-limit.middleware`, `security-headers.middleware` |

---

## P2 — Soon after launch

| # | Area | Status | Notes |
|---|------|--------|-------|
| 21 | **Mandatory 2FA for all admins** | Done | Set `ADMIN_REQUIRE_2FA=true`; `/admin/security` setup gate |
| 22 | **SMS 2FA** | Done | TOTP + SMS when `SMS_ENABLED=true`; migration `0045` |
| 23 | **Real-time notifications** | Done | `NotificationsProvider` + bell on all dashboard shells; migration `0035` |
| 24 | **E2E monitoring (Sentry/Datadog)** | Done | Sentry wired (API + web); admin health dashboard + `docs/OBSERVABILITY.md`; set DSN on Render/Vercel |
| 25 | **Payment webhook → live provider** | Partial | Generic webhook + signature; not tied to PayToday/etc. |
| 26 | **EFT proof upload** | Done | `POST /payments/:id/eft-proof`, private `payment-proofs` bucket, landlord view/confirm |
| 27 | **E-sign / lease PDF generation** | Partial | Attachments + reports; no DocuSign-style flow |
| 28 | **Legacy routes cleanup** | Done | `/dashboard/*` → permanent redirects; pages removed |
| 29 | **B2B lender-risk n&lt;5** | Partial | Intentional stub for compliance |
| 30 | **Multi-region / HA schedulers** | Missing | Heartbeats in-memory per API instance |

---

## P3 — Backlog

- Account email change self-service  
- Tenant rent payment plans / partial payments  
- Native mobile apps  
- Open Banking pull payments  
- Full POPIA legal pack (DPA, retention schedule) reviewed by counsel  

---

## What is solid today (do not rebuild)

- Role-based API (`TENANT` / `LANDLORD` / `ADMIN`)  
- Tenant 3-step KYC + landlord verification + admin location compare  
- Commission on payments, receipts, landlord ledger  
- Market intelligence B2B (keys, reports, webhooks, sale comps pilot)  
- Notification prefs + many email event hooks  
- Credit score engine aligned to 50/30/20 model  

---

## Phase 1 trust (June 2026)

| Item | Status | Notes |
|------|--------|-------|
| Bronze–Platinum tiers + simulator | Done | `/tenant/credit-score`, migration N/A |
| EFT auto-confirm + one-tap link | Done | `0036`; prove on staging |
| Shareable PDF + verify expiry | Done | `POST /reports/credit-score/share` |
| Dispute templates + timeline | Done | Tenant + landlord (`/landlord/disputes`) share `DisputeDetailPanel`; admin analytics + appeal window |
| Transactional email reliability | Done | `0039` — retry queue, failed log, admin smoke test |
| Fraud pattern detection v1 | Done | `0040` — confirm-rate + self-dealing flags; daily cron; `/admin/kyc/compliance` |
| Flywheel metrics (admin) | Done | `/admin/system-health` |
| SMS confirm nudges | Done | Email + in-app + SMS when `SMS_ENABLED` (24h landlord reminder) |

## Recommended next implementation order

1. **Staging**: apply `0035`–`0044`, redeploy, smoke + flywheel metrics baseline  
2. **Legal**: counsel review — packet `docs/legal/COUNSEL_REVIEW_PACKET.md` (v2026.06-draft-1)
3. **Staging/process**: apply `0035`–`0045`, `staging_post_apply_verify.sql`, `npm run staging:checklist`, flywheel baseline script
4. **Phase 3 data monetisation**: ~~B2B demo dataset, public MI dashboard, bank one-pagers~~ **Done in code** — apply `0043`, smoke `/data` and sample-key flow
5. **Phase 2 tail**: ~~onboarding emails, lite landlord tier, retrospective import~~ **Done in code** — apply `0044`
6. **Payments**: merchant integration when provider selected

---

## Supabase Auth checklist (password reset)

In Supabase Dashboard → Authentication → URL configuration, allow:

- `https://<your-web-domain>/auth/reset-password`
- `http://localhost:3002/auth/reset-password` (local)

---

*Maintained with `IMPLEMENTATION_STATUS.md` and `docs/MIGRATION_RUNBOOK.md`.*
