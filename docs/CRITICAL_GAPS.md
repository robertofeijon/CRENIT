# CRENIT — Critical & high-priority gap audit

Senior full-stack review of `main` @ June 2026. Use this as the **release gate** alongside `UPDATED_IMPLEMENTATION_SUMMARY.md`.

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
| 1 | **Supabase migrations applied** | Process | Run `0026`–`0033` on staging then prod (`docs/MIGRATION_RUNBOOK.md`) |
| 2 | **RLS + service-role smoke** | Process | Policies in `0012_rls_policies.sql`; API uses service role — validate tenant cannot read others’ rows via anon client |
| 3 | **Production env + secrets** | Process | `JWT_SECRET` ≥32 chars, `ADMIN_EMAILS`, `CORS_ORIGIN`, SMTP/Resend, `WEB_URL` for email links |
| 4 | **Backup before migrate** | Process | Release gate item |
| 5 | **Payment gateway (live money)** | Missing | Card/mobile **simulated**; EFT + landlord confirm works. Blocked on merchant — **accepted deferral** |
| 6 | **Transactional email in prod** | Partial | Nodemailer/Resend wired; fails silently if SMTP unset — verify with smoke + real send |

---

## P1 — Very needed for a trustworthy v1

| # | Area | Status | Notes |
|---|------|--------|-------|
| 7 | **Password reset** | Done | `/auth/forgot-password`, `/auth/reset-password` (Supabase). Add redirect URLs in Supabase Auth settings |
| 8 | **KYC before pay** | Done | `assertKycApproved` on payment routes |
| 9 | **Landlord partner approval** | Done | UI guard + `assertPartnerApproved` on sensitive APIs |
| 10 | **TOTP 2FA + admin/landlord step-up** | Done | Enforced when enabled; login → `/auth/verify-2fa` |
| 11 | **Invite → lease → first payment E2E** | Partial | Code paths exist; needs scripted QA on staging |
| 12 | **Lease renewal E2E** | Partial | API + tenant/landlord UI + bell; landlord can propose from `/landlord/leases`; needs staging proof |
| 13 | **Deposit escrow + disputes** | Done | APIs + landlord/tenant/admin UIs |
| 14 | **Credit score + payment metrics** | Done | Streak + on-time rate on home/credit-score |
| 15 | **Schedulers (auto-pay, overdue, reminders)** | Partial | In-process crons + `POST /internal/cron/:job` with `CRON_SECRET` for external triggers |
| 16 | **Privacy / Terms pages** | Partial | `/company/privacy`, `/company/terms` (summary pages; legal review still required) |
| 17 | **Automated tests** | Done | Vitest payment-metrics + Playwright (public pages + optional tenant login via `E2E_TENANT_*` secrets) + CI |
| 18 | **Admin operational smoke** | Done | `POST /admin/system-health/smoke` |
| 19 | **GDPR export/anonymise** | Done | `/admin/compliance` |
| 20 | **Rate limiting + security headers** | Done | `rate-limit.middleware`, `security-headers.middleware` |

---

## P2 — Soon after launch

| # | Area | Status | Notes |
|---|------|--------|-------|
| 21 | **Mandatory 2FA for all admins** | Done | Set `ADMIN_REQUIRE_2FA=true`; `/admin/security` setup gate |
| 22 | **SMS 2FA** | Missing | TOTP only |
| 23 | **Real-time notifications** | Done | `NotificationsProvider` + bell on all dashboard shells; migration `0035` |
| 24 | **E2E monitoring (Sentry/Datadog)** | Partial | Optional `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` on API + web |
| 25 | **Payment webhook → live provider** | Partial | Generic webhook + signature; not tied to PayToday/etc. |
| 26 | **EFT proof upload** | Done | `POST /payments/:id/eft-proof`, private `payment-proofs` bucket, landlord view/confirm |
| 27 | **E-sign / lease PDF generation** | Partial | Attachments + reports; no DocuSign-style flow |
| 28 | **Legacy routes cleanup** | Partial | `/dashboard/tenant` duplicates `/tenant/home` — deprecate |
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

## Recommended next implementation order

1. **Staging**: migrations + RLS script + invite/renewal/pay smoke checklist  
2. **CI**: `payment-metrics.util` unit tests + one Playwright login→pay path  
3. **Ops**: external cron or Render worker so schedulers survive API restarts  
4. **Legal**: counsel review of privacy/terms copy  
5. **Payments**: merchant integration when provider selected  

---

## Supabase Auth checklist (password reset)

In Supabase Dashboard → Authentication → URL configuration, allow:

- `https://<your-web-domain>/auth/reset-password`
- `http://localhost:3002/auth/reset-password` (local)

---

*Maintained with `IMPLEMENTATION_STATUS.md` and `docs/MIGRATION_RUNBOOK.md`.*
