# PR: Tenant KYC wizard and landlord partner verification

**Branch:** `feat/kyc-landlord-verification` → `main`  
**Open:** https://github.com/robertofeijon/CRENIT/compare/main...feat/kyc-landlord-verification?expand=1

## Summary

- **Tenant 3-step KYC wizard** — personal, residence, documents; draft save per step; submit to `PENDING_REVIEW`.
- **Location cross-check** — compare tenant declared address to landlord reference (KYC property, profile address, lease `tenant_residence`, or leased property) via `kyc-location.util.ts`; flag `LOCATION_MISMATCH` for admin.
- **Landlord verification** — dashboard KYC panel, locked routes until partner approved, onboarding/attachments integration.
- **Admin KYC** — tenant/landlord queues, side-by-side location compare, mismatch highlights.
- **Database** — `0026_kyc_wizard_residence.sql`, `0027_landlord_verification_wizard.sql`.
- **Docs** — `docs/PLATFORM_UPDATES.md` (full change log).

## Migrations (apply before deploy)

1. `supabase/migrations/0026_kyc_wizard_residence.sql`
2. `supabase/migrations/0027_landlord_verification_wizard.sql`

## Test plan

- [ ] `cd apps/api && npx tsc --noEmit`
- [ ] Tenant: complete wizard steps 1–3; refresh preserves draft; submit → `PENDING_REVIEW`
- [ ] Landlord: register lease with `tenant_residence`; tenant KYC address mismatch → `LOCATION_MISMATCH` in admin
- [ ] Landlord: verification wizard → `PENDING_REVIEW`; locked routes block market-data until approved (if configured)
- [ ] Admin: review tenant doc, approve/reject; landlord tab separate queue
- [ ] Rejected tenant lands on step 3 with re-upload hints

## Key files

| Area | Path |
|------|------|
| Tenant wizard API | `apps/api/src/kyc/kyc.service.ts`, `kyc.controller.ts` |
| Location match | `apps/api/src/kyc/kyc-location.util.ts` |
| Landlord KYC | `apps/api/src/landlords/landlord-kyc.service.ts` |
| Tenant UI | `apps/web/app/tenant/kyc/page.tsx` |
| Landlord UI | `apps/web/app/components/landlord/LandlordKycPanel.tsx`, `LandlordLockedRouteGuard.tsx` |
| Admin | `apps/web/app/admin/kyc/page.tsx` |
