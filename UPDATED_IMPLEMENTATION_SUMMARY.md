# RentCredit Update Summary

## Current work scope

This update captures the latest backend implementation completed in the NestJS API and the remaining platform work. The current repo contains an existing RentCredit stack with `apps/api` (NestJS backend), `apps/web` (Next.js frontend), and Supabase database migrations.

## RENT.MD requirements not yet captured

The platform prompt in `RENT.MD` defines core product priorities and data integrity rules that must be enforced across the stack. The current implementation summary should also explicitly cover:

- Core business focus: verified landlord-tenant rental payment data is the primary product, and all features must support market intelligence quality.
- Five data integrity rules:
  - rigorous KYC that includes income verification and expiry workflows,
  - real landlord verification before property addition and tenant invites,
  - defensible, auditable tenant credit scoring,
  - zero-PII `market_data` records with suburb minimum suppression,
  - every data point sourced from verified transactions.
- Full database schema coverage for tables expected by the prompt:
  - `profiles`, `kyc`, `properties`, `units`, `leases`, `payments`, `escrow`, `disputes`, `credit_scores`, `score_history`, `market_data`, `attachments`, `notifications`, `tenant_invites`, `lease_renewals`, `payment_methods`, `auto_pay_config`, `b2b_clients`, `b2b_report_log`, `audit_log`.
- Payment tracks A and B with distinct confirmation flows and UI messaging.
- Notification system requirements and event types for rent reminders, KYC lifecycle, invite/lease events, dispute workflow, and document verification.
- Tenant onboarding flow from invite to active tenant, including the onboarding checklist UX and returning-tenant edge case.
- Lease lifecycle / renewal flow and nightly background renewal proposal generation.
- Late payment grace period rules, payment status transitions, and credit score impact by `days_late`.
- Income verification and KYC expiry lifecycle, including `KYC_EXPIRING` and `KYC_EXPIRED` notifications and score weighting when income data expires.
- Frontend shell and role-based dashboard requirements, especially landlord KYC gating and property verification.

## Completed backend implementation

### Auth and invitation flow
- Added duplicate registration protection in `apps/api/src/auth/auth.service.ts`:
  - Lookup by `email` before creating a new user.
  - If a tenant already exists for the invited email, the code now links the invite to the existing account instead of creating a duplicate.
- Added tenant invite preview and acceptance endpoints in `apps/api/src/auth/auth.controller.ts`:
  - `GET /auth/invite/:token` returns invite details, landlord info, and tenant email validation.
  - `POST /auth/invite/:token/accept` accepts an invite and finalizes tenant registration or account linkage.
- Added invite acceptance metadata to the Supabase migration:
  - `supabase/migrations/0008_tenant_invite_acceptance.sql`
  - Added `accepted_by UUID` and `accepted_at TIMESTAMP` to `tenant_invitations`.

### Landlord workflow improvements
- Implemented KYC gating in `apps/api/src/landlords/landlords.service.ts`:
  - Landlords must have approved KYC before creating tenant invitations.
  - The invite endpoint now validates the inviter is a landlord with `kyc_status = 'approved'`.
  - Invitation creation now ensures `invite_url`, `expires_at`, and `status = 'pending'` are set correctly.
- Added approval gating for property creation in `apps/api/src/properties/properties.service.ts`:
  - Only landlords with approved KYC may create properties.

### Safety and integrity
- Existing tenant accounts are detected during invite creation and accepted via the same invite flow.
- Duplicate email registration attempts are prevented at the API level.
- Invite record metadata now supports acceptance tracking.

## Files changed

- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/landlords/landlords.service.ts`
- `apps/api/src/properties/properties.service.ts`
- `supabase/migrations/0008_tenant_invite_acceptance.sql`

## Known implementation gaps

### Frontend work still needed
- Tenant invite landing page with token preview and invite status display.
- Tenant invite acceptance/registration page.
- Tenant redirect flow when invited email already exists.
- Landlord dashboard page for sending invites and showing invite status.
- Admin/landlord UI for KYC review and pending invite management.

### Backend and business logic to finish
- Complete tenant onboarding flow after invite acceptance:
  - link tenant to a property/unit
  - create an initial lease record
  - generate rent payment schedule and due dates
- Build KYC version history, re-submission tracking, and audit trail.
- Implement overdue payment state transitions, charge assessments, and late reminders.
- Add support for credit score updates and rent payment history scoring.
- Add notification event hooks for email/SMS/push on:
  - invite sent
  - invite accepted
  - rent due/overdue notices
  - KYC expiry reminders
  - lease renewal notices

### Data intelligence and compliance
- Enforce market data suppression rules and exclude direct PII from market intelligence snapshots.
- Complete B2B API key rotation, rate limiting, and usage logging.
- Build admin pages for data intelligence insights, compliance review, and GDPR actions.
- Validate and deploy RLS policies for production Supabase security.

## What's left

- Frontend invite acceptance experience:
  - invite landing page
  - registration form for invited tenants
  - existing-email handling and login redirect
- Tenant onboarding completion:
  - link accepted invite to property and unit
  - create lease record and rent payment schedule
  - publish tenant dashboard entry flow
- Notifications and reminders:
  - invite sent/accepted alerts
  - rent due / overdue notices
  - KYC expiry reminders
  - lease renewal reminders
- KYC and compliance:
  - version history and re-submission audit
  - landlord KYC review UI
  - GDPR/compliance enforcement paths
- Market intelligence and B2B:
  - enforce PII suppression rules
  - B2B API key rotation and rate limiting
  - usage logging and admin reporting
- Production readiness:
  - Supabase RLS policy validation
  - deployment integration and environment review

## Remaining priority list

1. Frontend invite acceptance flow + invite landing page.
2. Tenant onboarding workflow and lease/payment initialization.
3. Notification wiring for landlord/tenant lifecycle events.
4. KYC audit/re-submission and landlord compliance UI.
5. Market intelligence enforcement and B2B API hardening.

## Summary

The backend invite and registration logic are now in place and aligned with the RentCredit tenant invite/use-case. The remaining work is mainly frontend integration, onboarding completion, scheduled lifecycle jobs, notification delivery, and admin/compliance tooling.
