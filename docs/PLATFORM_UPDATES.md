# CRENIT Platform Updates — Summary

This document summarizes major product, API, database, and UI changes delivered across the marketing site, tenant KYC, landlord partner verification, admin review, market intelligence, and compliance tooling.

**Stack:** Supabase (migrations + storage) · NestJS API (`apps/api`, port 3001) · Next.js web (`apps/web`, port 3002) · Nodemailer SMTP for transactional email.

---

## 1. Marketing & brand (web)

| Area | Changes |
|------|---------|
| Logo | Branded SVG at `apps/web/public/crenit-logo.svg`; `Logo.tsx` uses Next `Image` |
| Landing (`app/page.tsx`) | Full-width layout, dedicated `MarketingHeader` / `MarketingFooter`, metallic cards (`marketing-metal-card` in `globals.css`), calmer motion + `prefers-reduced-motion` |
| Footer | Black background, white text; logo removed from footer per design |
| Tenant dashboard hero | Premium glass card; score gauge animates once on load |
| Auth / verify pages | Shared `<Logo />` component |

---

## 2. Database migrations

Apply in order in Supabase SQL (or CLI). See **`docs/MIGRATION_RUNBOOK.md`** for the full integrated list.

### KYC & landlord verification

- **`0026_kyc_wizard_residence.sql`** — tenant 3-step KYC wizard, `leases.tenant_residence`
- **`0027_landlord_verification_wizard.sql`** — landlord partner verification, `partner_approval_status`

### Market intelligence (branch `feat/market-intelligence-compliance`)

- **`0028`** — sale comps pilot, webhooks, licensable watch
- **`0029`** — webhook delivery retries
- **`0030`** — landlord licensable notify log
- **`0031`** — capture suburb snapshot QA
- **`0032`** — `market_intelligence_alerts` notification preference

### Platform trust

- **`0033_two_factor_totp.sql`** — `two_factor_verified_until` for admin/landlord session enforcement

---

## 3. Tenant KYC (3-step wizard)

### Flow

1. **Personal** — name, DOB, gender, nationality, phone, ID number  
2. **Location** — country, region, city, street, postal code, residential status  
3. **Documents** — government ID, selfie, proof of income, proof of address  

- Progress indicator, validation per step, back navigation on steps 2–3  
- Partial progress saved via `PUT /kyc/wizard/personal`, `PUT /kyc/wizard/residence`  
- Submit: `POST /kyc/wizard/submit` → status `PENDING_REVIEW`  

### Location cross-check

Compares tenant residence to landlord reference (KYC step 2 → profile address → `tenant_residence` → leased property). Below-threshold match inserts `LOCATION_MISMATCH` in `kyc_flags`.

### Web & admin

- `app/tenant/kyc/page.tsx` — wizard UI  
- `app/admin/kyc/page.tsx` — tenant/landlord tabs, location compare  

---

## 4. Landlord partner verification

- `/landlord/onboarding` redirects to overview with verify panel  
- 3-step slide-over: identity, property (reference for tenant cross-check), documents  
- Nav + route guard until `partner_approval_status === APPROVED`  
- API: `GET/PUT/POST /landlords/kyc/*`  

---

## 5. B2B market intelligence

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/reports` | Licensed report catalog |
| GET | `/api/v1/reports/:type/preview?suburb=` | JSON preview |
| GET | `/api/v1/reports/:type/pdf?suburb=` | PDF; 400 if n&lt;5 |
| GET | `/api/v1/catalog` | Routes, compliance fields, thresholds |

**Admin → Data Intelligence:** API keys, integrator exports (OpenAPI/Postman), licensable webhooks, B2B playground, sale comps ingest/CSV, geocode QA, licensable watch.

**Landlord → Market intelligence:** rent vs suburb median, sale comps on suburb detail, licensable alerts banner.

Full reference: **`docs/B2B_INTEGRATOR_GUIDE.md`**, **`docs/MARKET_INTELLIGENCE.md`**.

---

## 6. Auth, 2FA, and profiles

- Landlord signup: `UNVERIFIED` / `NOT_SUBMITTED` (not auto-approved)  
- **TOTP 2FA** (authenticator app): setup returns QR + `otpauth` URL; confirm with 6-digit code  
- **Enforcement:** `ADMIN` and `LANDLORD` with 2FA enabled must call `POST /auth/2fa/verify-session` after login (12h window via `two_factor_verified_until`)  
- Tenants: 2FA optional (same API, not enforced on routes)  

---

## 7. Tenant payment metrics

`GET /tenants/me` includes `paymentMetrics`:

- **`consecutive_on_time_streak`** — consecutive paid, on-time rent cycles (newest due date first)  
- **`on_time_rate_pct`** — % on-time among settled payments (last 12 months)  
- Shown on `/tenant/home` and `/tenant/credit-score`  

---

## 8. Email notifications (Nodemailer)

KYC/partner approve/reject, rent reminders, payment confirmed/overdue, lease renewal, deposit/dispute events — see `notifications.service.ts`.

---

## 9. Deployment checklist

1. Run migrations **`0026`–`0033`** on Supabase (see runbook).  
2. Ensure `kyc-documents` storage bucket exists.  
3. Configure SMTP env vars.  
4. Set `ADMIN_EMAILS`, optional `TWO_FACTOR_SESSION_HOURS` (default 12).  
5. Restart API + web.  
6. Smoke test: `POST /admin/system-health/smoke` (admin session).  
7. End-to-end: landlord verify → tenant KYC → payment streak on tenant home.  

---

## 10. Known follow-ups

- Production payment gateway (merchant not yet selected — initiate stays simulated)  
- Align legacy `/admin/partner-approvals` with unified KYC queue if still needed  
- Real-time Supabase subscriptions on dashboards  

---

*Last updated: June 2026 — integrated KYC + market intelligence + TOTP 2FA + tenant payment metrics.*
