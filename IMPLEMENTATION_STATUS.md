# CRENIT Implementation Status

**Last updated:** June 2026 (integrated trunk: KYC + market intelligence + platform trust)

---

## Integrated release branches

| Branch | Status | Notes |
|--------|--------|-------|
| `feat/kyc-landlord-verification` | Merged into MI | Tenant KYC wizard, landlord verification, `0026`/`0027` |
| `main` | **Current production trunk** | KYC + MI + TOTP 2FA + tenant metrics + ops smoke (`f1ea96e`+) |
| `feat/market-intelligence-compliance` | Merged to `main` | Keep for PR history only |

**Gap audit:** see **`docs/CRITICAL_GAPS.md`** for P0–P3 launch checklist.

**Payment gateway (C):** Deferred — card/mobile initiate remains simulated until a merchant is selected.

---

## Implemented (platform)

### Auth & security
- JWT auth, register/login, `/auth/me` with role from `ADMIN_EMAILS`
- **TOTP 2FA** (authenticator QR); `POST /auth/2fa/verify-session` for login step-up
- **Enforcement** on `ADMIN` and `LANDLORD` when 2FA enabled (`TWO_FACTOR_ENFORCEMENT=false` disables in dev)
- Migration `0033_two_factor_totp.sql` — `two_factor_verified_until`

### Tenant
- Dashboard `GET /tenants/me` with onboarding checklist
- **Payment metrics:** consecutive on-time streak + 12-month on-time rate (`paymentMetrics`)
- Routes: home, payments, deposit, credit-score, reports, settings, KYC wizard
- Credit score CRENIT model (50/30/20), history, recalculate

### Landlord
- Overview, properties, tenants, leases, payments, deposits, reports, market data
- Partner verification (3-step panel, route guard, API `assertPartnerApproved`)
- Lease `tenant_residence` for KYC location cross-check
- Invite flow with unit validation

### Admin
- KYC queue (tenant + landlord), compliance dashboard, users, payments, disputes, audit
- Credit score audit, system health with **alerts + scheduler heartbeats**
- **`POST /admin/system-health/smoke`** — DB/notification/scheduler checks
- GDPR `/admin/compliance`, data intelligence / B2B tools

### Payments & ops schedulers (Namibia time)
- Auto-pay 07:00, rent reminders 08:00, overdue 09:00, score recalc 02:00
- MI rollup/webhook crons; heartbeat recorded per job for health UI

### Market intelligence (on integration branch)
- B2B reports, webhooks, sale comps ingest, geocode QA, licensable alerts

### Database
- Core `0001`–`0025`, KYC `0026`–`0027`, MI `0028`–`0032`, 2FA `0033`

---

## Still missing / follow-up

| Item | Priority | Notes |
|------|----------|-------|
| Production payment gateway | P1 | Blocked on merchant |
| Staging deploy + migration runbook | P0 | `docs/MIGRATION_RUNBOOK.md` |
| Password reset (forgot / reset email) | Done | `/auth/forgot-password`, `/auth/reset-password` |
| Privacy / Terms marketing pages | Partial | `/company/privacy`, `/company/terms` — legal review still needed |
| Automated tests (CI) | Done | Vitest payment-metrics + Playwright public pages (`.github/workflows/ci.yml`) |
| RLS validation on staging | P0 | Release gate in `UPDATED_IMPLEMENTATION_SUMMARY.md` |
| Real-time Supabase subscriptions | P2 | Dashboards still poll |
| SMS 2FA | P2 | TOTP only for now |
| Legacy demo 6-digit 2FA secrets | P3 | Re-setup with authenticator app |

---

## Quick verification

1. Apply migrations per `docs/MIGRATION_RUNBOOK.md`
2. Landlord: enable 2FA in settings → log out/in → `/auth/verify-2fa`
3. Tenant: pay history → home shows streak + on-time %
4. Admin: System Health → Run smoke tests

---

## Sprint / delivery log

| Area | Status |
|------|--------|
| Core landlord/tenant/admin portals | Done |
| V4.1 admin modules (credit audit, health, GDPR) | Done |
| KYC + landlord verification | Done (merge to main pending) |
| Market intelligence B2B | Done on feature branch |
| TOTP 2FA + tenant payment metrics + ops smoke | Done (this pass) |
| Live payment provider | Not started |
