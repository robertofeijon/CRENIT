# RentCredit Implementation and Release Closeout

## Current state

The project now has end-to-end invite onboarding, lease renewal workflows, KYC auditing, notifications, and production hardening foundations across `apps/api`, `apps/web`, and `supabase/migrations`.

## Completed scope (deduplicated)

- **Invite and onboarding flow**
  - Duplicate registration protection and existing-account linking.
  - Invite preview and acceptance endpoints (`/auth/invite/:token`, `/auth/invite/:token/accept`).
  - Landlord invite management (`list`, `resend`, `cancel`).
  - Tenant invite landing/acceptance UI at `apps/web/app/join/[token]/page.tsx`.
  - Acceptance can seed lease + initial pending payment when unit context exists.

- **Landlord and tenant lifecycle**
  - Landlord KYC gating for tenant invites and property creation.
  - Tenant/landlord dashboards enhanced with unread notifications.
  - Lease renewal proposal generation and response APIs.
  - Renewal approval now finalizes live lease terms (`end_date`, `monthly_rent`).
  - Counter-offer flow enabled in landlord and tenant UI.

- **Notifications**
  - Notification table and service foundation.
  - API endpoints for list/read/read-all.
  - Scheduled jobs for rent due reminders, KYC expiry reminders, and renewal proposal generation.
  - Event hooks for invite sent/accepted and overdue status transition.

- **KYC auditability**
  - `kyc_audit_log` migration added.
  - KYC submit/resubmit, landlord decisions, and admin decisions recorded.
  - Admin KYC audit endpoint (`/admin/kyc/audit/:userId`).
  - Initial audit visibility in admin and landlord UI.

- **Production hardening**
  - Global API in-memory rate limiting middleware.
  - RLS migration for core user-facing tables.
  - Performance indexes for heavy payments/leases/invites/renewals query paths.
  - Env examples updated for rate-limit controls.
  - Startup env validation for required runtime keys.
  - Global exception filter now standardizes error shape as `{ error, code, statusCode }`.

## Migration readiness checklist

### Pre-flight

- [ ] Ensure a full database backup/snapshot exists before applying new migrations.
- [ ] Confirm you are running migrations in a non-production environment first.
- [ ] Verify migration order is strictly increasing and complete from `0001` through `0013`.
- [ ] Confirm app code and migration set are deployed together (same release window).

### New migrations to apply

- [ ] `0008_tenant_invite_acceptance.sql`
- [ ] `0009_notifications.sql`
- [ ] `0010_lease_renewals.sql`
- [ ] `0011_kyc_audit_log.sql`
- [ ] `0012_rls_policies.sql`
- [ ] `0013_performance_indexes.sql`

### Compatibility and risk checks

- [ ] Confirm all tables referenced by `0012_rls_policies.sql` already exist in target DB.
- [ ] Validate RLS behavior using real tenant/landlord/admin JWTs (read and write paths).
- [ ] Confirm backend service-role operations still function after RLS enablement.
- [ ] Verify index creation time and lock behavior during deployment window.

### Post-migration validation

- [ ] `notifications`, `lease_renewals`, and `kyc_audit_log` tables exist with expected columns.
- [ ] New indexes from `0013_performance_indexes.sql` are present.
- [ ] RLS is enabled and policies are active on targeted tables.
- [ ] Invite acceptance and renewal approval still update `leases` correctly.

### Checklist run result (current repo audit)

- [x] Found required new migrations `0009` through `0013`.
- [x] Confirmed create statements exist for `notifications`, `lease_renewals`, and `kyc_audit_log`.
- [!] Noted historical schema drift risk: `tenant_invitations` appears in both `0001_init.sql` and `0002_add_kyc_and_admin_tables.sql` with different shapes. This is safe only when migration order is preserved; do not cherry-pick `0002` into a fresh DB without `0001`.
- [ ] Runtime RLS/JWT behavior still needs environment validation after applying `0012_rls_policies.sql`.

## Release checklist

### Environment

- [ ] Copy `.env.example` updates into deployment env files.
- [ ] Set `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS` to production values.
- [ ] Verify `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `CORS_ORIGIN`, and `ADMIN_EMAILS`.
- [ ] Rotate any non-demo credentials if they were ever shared outside secure channels.

### Smoke tests (minimum)

- [ ] Register/login flow works for tenant and landlord.
- [ ] Landlord invite send, preview, accept, resend, cancel all work.
- [ ] Existing-email invite acceptance routes user correctly.
- [ ] KYC submit and admin/landlord review both write audit entries.
- [ ] Rent payment lifecycle: pending -> overdue transition and notifications.
- [ ] Renewal lifecycle: proposed -> counter -> approved/rejected, and lease finalization on approval.
- [ ] Notification endpoints (`/notifications`, `/notifications/unread`, read/read-all) work by role.
- [ ] Dashboards render without auth/permission regressions.

### Rollback notes

- [ ] Keep a pre-release DB backup to restore data state if needed.
- [ ] If app-level rollback is required, redeploy last known-good API/web artifacts.
- [ ] If migration rollback is required:
  - Prefer forward-fix migrations over destructive down-migrations in production.
  - Disable new code paths behind feature flags/env toggles if available.
  - For RLS incidents, apply emergency policy patch migration to restore access safely.
- [ ] Capture incident notes: failed migration ID, error output, affected endpoint(s), and mitigation applied.

## Remaining high-priority work

- Tenant onboarding completion after invite acceptance (unit linking validation + robust schedule generation).
- External notification channels (email/SMS/push) beyond in-app notifications.
- Market intelligence compliance enforcement (PII suppression guarantees + audits).
- B2B API hardening (key rotation UX, usage limits, reporting).
- Advanced KYC audit reporting and compliance dashboards.

## V4.1 implementation pass (current)

- Added migrations:
  - `0014_email_notification_preferences.sql`
  - `0015_b2b_api_usage_log.sql`
  - `0016_gdpr_events.sql`
  - `0017_kyc_quality_flags.sql`
- Added notification preferences read/write support in API settings endpoints and tenant/landlord settings UIs.
- Added branded external email dispatch plumbing (Resend/SendGrid/Postmark) and SMS plumbing (Africa's Talking, feature-flagged).
- Updated scheduled jobs toward Namibia-time requirements:
  - auto-pay (07:00),
  - rent due reminders (08:00),
  - overdue update (09:00),
  - score recalculation (02:00, recent payment updates),
  - API key expiry alerts (06:00).
- Added B2B API key expiry + grace-period-aware validation and rotation endpoint groundwork.
- Added market data hardening:
  - PII suppression guard before market record writes with audit logging,
  - minimum sample suppression logic and `minimum_sample_not_met` response for low-sample suburbs,
  - suburb freshness metadata (`last_record_at`, `freshness_status`),
  - export compliance event writes to admin audit log.
- Tenant onboarding checklist progress is now computed in tenant dashboard API and rendered in tenant home UI with step actions and lock/tick states.
- Invite unit validation UX hardening added:
  - invite preview and acceptance now validate unit existence, landlord linkage, and occupancy conflicts,
  - failures return explicit "Contact your landlord" style errors.
- Added KYC compliance dashboard support:
  - backend: `/admin/kyc/compliance`, flag dismissal endpoint, enriched queue with quality flags,
  - frontend: new `/admin/kyc/compliance` page and amber quality-flag indicators in admin KYC queue.
- Added admin missing module implementations:
  - credit score audit APIs and upgraded `/admin/credit-scores` detail/override/flag flow,
  - system health API snapshot and upgraded `/admin/system-health` dashboard,
  - GDPR tooling APIs and new `/admin/compliance` page for export/anonymise actions.
- Added full external email event subject mapping in notifications service for:
  - invite sent/accepted,
  - rent due reminder,
  - payment confirmed/overdue,
  - KYC approved/rejected,
  - lease renewal proposed/response,
  - deposit released,
  - dispute filed/resolved.
- Added deposit/dispute notification event hooks to ensure coverage for release/filed/resolved events.
- Enforced minimum-sample suppression in market-data service outputs (`suburbs`, `suburb details`, `summary`) with `minimum_sample_not_met` semantics for low-sample cases.
- Applied reusable skeleton/error/empty-state UI components and integrated them into key admin and tenant pages for consistent loading/failure/empty UX.
- Completed admin-wide UI state consistency by applying the same skeleton/error/empty-state pattern to:
  - `/admin/users`
  - `/admin/payments`
  - `/admin/disputes`
  - `/admin/audit`
  - `/admin/data-intelligence`
  - `/admin/service-requests`
- Final UX polish pass completed:
  - Unified microcopy tone across admin + tenant pages (button labels and loading text now use consistent action-oriented wording).
  - Tightened responsive padding on landing and key dashboard surfaces for better spacing on smaller screens.
  - Added an animated frontend `Rental Credit Scoring Model` card using the requested framework:
    - Payment History (50%),
    - Amount Defaulted On (30%),
    - Length of Credit History (20%),
    with animated progress bars and a total score out of 100.
- Tiny follow-up copy pass completed:
  - Standardized status messaging style for success/error toasts and inline alerts across updated admin/tenant pages.
  - Error copy now consistently uses `Unable to ...` phrasing where applicable.
  - Success copy now consistently uses concise completed-action phrasing with punctuation.

## Go/No-Go release gate

Use this section as the final deployment decision checklist. A release is **GO** only when all items are marked `PASS`.

| Gate item | Owner | Evidence required | Status |
|---|---|---|---|
| Database backup created before migration run | Tukuna (`@devops` suggested) | Backup job ID or snapshot ID with timestamp | PENDING |
| Staging migration run completed (0008-0013) | David (`@backend` suggested) | Migration logs showing success for each file | PENDING |
| Production migration plan reviewed | Cristiano (`@admin`) | Approved runbook link or sign-off comment | PENDING |
| RLS behavior validated for tenant role | Tukuna (`@qa` suggested) | Test results for tenant read/write paths after `0012` | PENDING |
| RLS behavior validated for landlord role | Tukuna (`@qa` suggested) | Test results for landlord endpoints and dashboard queries | PENDING |
| RLS behavior validated for admin role | Cristiano (`@admin`) | Admin portal and audit endpoints verification output | PENDING |
| Service-role backend paths validated after RLS | David (`@backend` suggested) | API smoke log proving no service-role regressions | PENDING |
| Invite flow smoke test passed end-to-end | Tukuna (`@qa` suggested) | Test case output: send, preview, accept, resend, cancel | PENDING |
| Renewal lifecycle smoke test passed end-to-end | Tukuna (`@qa` suggested) | Test case output: proposed, counter, approve/reject, lease update | PENDING |
| KYC audit trail writes and reads verified | Cristiano (`@admin`) | Evidence of audit records and UI/API retrieval | PENDING |
| Notifications flow validated | Tukuna (`@qa` suggested) | Evidence for unread/list/read/read-all + scheduled reminders | PENDING |
| Rate-limit config set in deployment env | Tukuna (`@devops` suggested) | Deployment env diff showing limit variables | PENDING |
| API and web deployment artifacts built successfully | David (`@backend` suggested) | Build logs + artifact/version IDs | PENDING |
| Post-deploy health checks passed | Tukuna (`@devops` suggested) | Health endpoint responses and monitoring dashboard snapshot | PENDING |
| Rollback procedure tested in non-prod | Tukuna (`@devops` suggested) + David (`@backend` suggested) | Rollback rehearsal notes and expected recovery time | PENDING |
| Security review of exposed env/config completed | Cristiano (`@admin`) + David (`@backend` suggested) | Checklist sign-off covering keys, CORS, JWT, admin emails | PENDING |
| Final business owner approval | Cristiano (`@admin`) | Explicit approval note for release window | PENDING |

### Release decision

- **GO**: All gate items are `PASS`.
- **NO-GO**: Any gate item remains `PENDING` or is marked `FAIL`.
