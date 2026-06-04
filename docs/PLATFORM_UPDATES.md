# CRENIT Platform Updates — Summary

This document summarizes major product, API, database, and UI changes delivered across the marketing site, tenant KYC, landlord partner verification, admin review, and compliance tooling.

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

Apply in order in Supabase SQL (or CLI):

### `0026_kyc_wizard_residence.sql`

- `profiles.kyc_status` extended with `PENDING_REVIEW`
- Profile fields: `first_name`, `surname`, address columns, `residential_status`, `kyc_wizard_draft` (jsonb)
- `kyc_documents` doc type `PROOF_OF_ADDRESS`
- `leases.tenant_residence` (jsonb) — landlord-reported tenant address for lease registration
- Used by **tenant** 3-step KYC wizard

### `0027_landlord_verification_wizard.sql`

- `profiles.partner_approval_status` values: `UNVERIFIED`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, etc.
- `landlord_profiles`: `account_type`, `vat_number`, `properties_managed_count`, `ownership_status`, `landlord_kyc_draft` (jsonb)
- Used by **landlord** dashboard KYC panel

---

## 3. Tenant KYC (3-step wizard)

### Flow

1. **Personal** — name, DOB, gender, nationality, phone, ID number  
2. **Location** — country, region, city, street, postal code, residential status  
3. **Documents** — government ID, selfie, proof of income, proof of address  

- Progress indicator, validation per step, back navigation on steps 2–3  
- Partial progress saved via `PUT /kyc/wizard/personal`, `PUT /kyc/wizard/residence`  
- Submit: `POST /kyc/wizard/submit` → status `PENDING_REVIEW`  
- Rejected tenants jump to step 3 with per-document re-upload hints  

### API (`apps/api/src/kyc/`)

- `kyc.service.ts` — wizard save/submit, document storage (`kyc-documents` bucket)  
- `kyc.controller.ts` — tenant-facing routes  
- `kyc-location.util.ts` — normalized address comparison (72% weighted threshold)  

### Location cross-check (tenant vs landlord)

When a tenant submits KYC, the API compares the tenant’s declared residence to a **landlord reference address** using `resolveLandlordReferenceForTenantCheck()` in `kyc-location.util.ts`.

**Priority (highest first):**

1. **Landlord KYC step 2** — `kyc_verifications.metadata.property` on the landlord’s profile (primary property from verification wizard)  
2. **Landlord profile address** — same fields persisted on `profiles` (`address_street`, `address_region`, `address_city`, etc.)  
3. **Lease `tenant_residence`** — address the landlord entered when registering the lease  
4. **Leased property** — unit → property address  

If comparison runs and similarity is below threshold, a `LOCATION_MISMATCH` row is inserted into `kyc_flags` and metadata stores `landlord_reference_source`, `landlord_reference_label`, match score, etc.

### Web

- `app/tenant/kyc/page.tsx` — full wizard UI  
- `components/kyc/KycWizardProgress.tsx`, `KycDocumentUploadField.tsx`  

### Admin

- `app/admin/kyc/page.tsx` — queue with tenant/landlord tabs (landlords separate), location side-by-side, `LOCATION_MISMATCH` highlight  
- `GET /admin/kyc/pending?applicant_role=TENANT`  
- `POST /admin/kyc/review/:userId` — approve → `VERIFIED`; reject with reason + optional per-document types  
- Emails: `sendKycApprovedEmail`, `sendKycRejectedEmail` (deep link `/tenant/kyc`)  

---

## 4. Landlord lease registration (tenant residence)

Landlords must capture **expected tenant residence** when registering a lease (not only property auto-fill).

| File | Role |
|------|------|
| `app/landlord/attachments/page.tsx` | Editable `tenant_residence` on lease form |
| `landlords.service.ts` / `landlords.controller.ts` | Persist `tenant_residence` on lease create |

This feeds fallback #3 in the tenant location cross-check when landlord KYC step-2 data is not yet available.

---

## 5. Landlord partner verification (dashboard-integrated)

Replaces standalone onboarding as the primary UX. Old route `/landlord/onboarding` redirects to `/landlord/overview?verify=1`.

### Status model

| Display badge | `partner_approval_status` / behaviour |
|---------------|--------------------------------------|
| `UNVERIFIED` | New signup; no submission |
| `PENDING_REVIEW` | Submitted; awaiting admin |
| `VERIFIED` | `APPROVED` — full dashboard unlock |
| `REJECTED` | Resubmit failed steps/documents only |

New landlords: `kyc_status: NOT_SUBMITTED`, `partner_approval_status: UNVERIFIED` (no longer auto-`APPROVED`).

### Wizard (slide-in panel)

| Step | Fields |
|------|--------|
| 1 — Identity | First/last name, DOB, gender, nationality, phone, email (read-only), account type (individual / company), company name, reg number, VAT optional |
| 2 — Property | Country, region, city, primary property address, property count, ownership status (owner / managing agent) — **stored as landlord reference for tenant cross-check** |
| 3 — Documents | Government ID or company registration, proof of address, proof of property ownership, selfie |

- Dismissible banner on overview when unverified/rejected  
- Header status badge  
- `LandlordKycPanel.tsx` slide-over; dashboard remains usable in background  
- Draft auto-save: `PUT /landlords/kyc/wizard/draft` (steps 1–2)  
- Submit: `POST /landlords/kyc/wizard/submit`  

### API

| Route | Purpose |
|-------|---------|
| `GET /landlords/kyc/status` | Status, draft, documents, rejection hints |
| `PUT /landlords/kyc/wizard/draft` | Auto-save steps 1–2 |
| `POST /landlords/kyc/wizard/submit` | Full submit + document upload |

Service: `apps/api/src/landlords/landlord-kyc.service.ts`

### Feature gating

**Nav lock** (greyed + tooltip): Properties, Tenants, Leases, Deposits, Payments, Reports, Market data, Lease & docs — until `VERIFIED`.

**Page-level guard** (direct URL cannot bypass):

- `landlord/layout.tsx` checks `isLandlordVerificationLockedPath(pathname)`  
- Unverified landlords see `LandlordLockedRouteGuard` instead of page content  
- Locked path list: `components/landlord/landlordVerificationPaths.ts`  
- `ADMIN` role bypasses guard (can view landlord shell for support)  

**API gating** (unchanged pattern): `assertPartnerApproved()` on properties, leases, payments, deposits, invites — requires `partner_approval_status === APPROVED`.

### Admin review (landlords)

- Same queue as tenants with **Landlords** tab: `GET /admin/kyc/pending?applicant_role=LANDLORD`  
- Approve/reject via `POST /admin/kyc/review/:userId` — updates `partner_approval_status`, `landlord_profiles.partner_status`, `kyc_status`  
- Emails: `sendPartnerApprovedEmail`, `sendPartnerRejectedEmail` with deep link `/landlord/overview?verify=1&step=3`  

### Web components (landlord)

| Component | Purpose |
|-----------|---------|
| `LandlordVerificationBanner.tsx` | Prompt to verify |
| `LandlordVerificationBadge.tsx` | Header status |
| `LandlordKycPanel.tsx` | 3-step slide-over |
| `LandlordLockedRouteGuard.tsx` | Blocked route full-page message |
| `landlordVerificationPaths.ts` | Shared locked route list |

---

## 6. Auth & profiles

- `auth.service.ts` — landlord signup sets `UNVERIFIED` / `NOT_SUBMITTED`  
- `supabase.utils.ts` — `assertPartnerApproved` defaults to locked unless `APPROVED`  
- `landlords.service.ts` — `buildOverview` uses `profiles.partner_approval_status`; new `landlord_profiles` default `partner_status: PENDING`  

---

## 7. Email notifications (Nodemailer)

| Event | Template / method | Recipient action |
|-------|-------------------|------------------|
| Tenant KYC approved | `sendKycApprovedEmail` | Log in |
| Tenant KYC rejected | `sendKycRejectedEmail` | `/tenant/kyc` |
| Landlord approved | `sendPartnerApprovedEmail` | `/landlord/overview` |
| Landlord rejected | `sendPartnerRejectedEmail` | `/landlord/overview?verify=1&step={n}` |

In-app notifications created via `NotificationsService.createNotification` on admin review.

---

## 8. File map (quick reference)

### API

```
apps/api/src/kyc/
  kyc.service.ts          # Tenant wizard + location resolve
  kyc.controller.ts
  kyc-location.util.ts    # compareResidence + landlord reference priority

apps/api/src/landlords/
  landlord-kyc.service.ts # Landlord wizard
  landlords.controller.ts # /landlords/kyc/*
  landlords.service.ts    # Overview, leases, tenant_residence

apps/api/src/admin/
  admin.service.ts        # KYC queue (tenant/landlord), review
  admin.controller.ts

apps/api/src/auth/auth.service.ts
apps/api/src/notifications/notifications.service.ts
```

### Web

```
apps/web/app/tenant/kyc/page.tsx
apps/web/app/landlord/layout.tsx          # Banner, badge, panel, route guard
apps/web/app/landlord/onboarding/page.tsx # Redirect only
apps/web/app/admin/kyc/page.tsx
apps/web/app/components/landlord/         # Verification UI
apps/web/app/components/kyc/              # Shared upload + progress
```

### Migrations

```
supabase/migrations/0026_kyc_wizard_residence.sql
supabase/migrations/0027_landlord_verification_wizard.sql
```

---

## 9. Deployment checklist

1. Run migrations `0026` and `0027` on Supabase.  
2. Ensure `kyc-documents` storage bucket exists and API service role can upload.  
3. Configure SMTP env vars for Nodemailer.  
4. Restart API + web after deploy.  
5. Smoke test:  
   - New landlord signup → `UNVERIFIED`, locked routes show guard  
   - Complete landlord panel → `PENDING_REVIEW`  
   - Admin approve → nav unlock, `VERIFIED` badge  
   - Tenant with active lease submits KYC → admin sees location compare using **Landlord KYC step 2** when present  

---

## 10. Known follow-ups (optional)

- Align legacy `landlord_onboarding_submissions` / `/admin/partner-approvals` with unified KYC queue if still in use  
- Page-level API 403 messages already enforce partner approval; keep in sync with UI guard  
- Apply `0026`/`0027` on production if not yet applied  

---

*Last updated: June 2026 — reflects marketing refresh, tenant KYC wizard, landlord dashboard verification, admin dual-queue review, and landlord step-2–first location cross-check.*
