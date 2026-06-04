# CRENIT Supabase migration runbook

Use this when merging **KYC + market intelligence** into `main` and promoting to staging/production.

## Prerequisites

- Full database backup (snapshot ID recorded in release gate).
- API deployed with matching code (migration order must match app expectations).
- Service role key available for post-migrate smoke tests.

## Apply order

Run each file in `supabase/migrations/` **in numeric order**. On an existing project, skip files already recorded in your migration history.

| Migration | Purpose |
|-----------|---------|
| `0001`–`0025` | Core platform (if not already applied) |
| `0026_kyc_wizard_residence.sql` | Tenant 3-step KYC, `tenant_residence` on leases |
| `0027_landlord_verification_wizard.sql` | Landlord partner verification fields |
| `0028` | MI: sale comps, webhooks, licensable watch |
| `0029` | Webhook delivery retries |
| `0030_landlord_licensable_notify.sql` | Landlord licensable email notify log |
| `0031` | Capture suburb snapshot QA |
| `0032` | Market intelligence alert notification pref |
| `0033_two_factor_totp.sql` | `two_factor_verified_until` for TOTP session enforcement |
| `0034_payment_eft_proofs.sql` | EFT proof columns on `payments` + private `payment-proofs` storage bucket |

## Staging procedure

1. **Backup** — Supabase dashboard → Database → Backups, or `pg_dump` for self-hosted.
2. **Apply** — SQL Editor: paste one migration at a time, or `supabase db push` if CLI linked.
3. **Verify columns** — Spot-check:
   - `profiles.partner_approval_status`, `two_factor_verified_until`
   - `leases.tenant_residence`
   - MI tables from `0028` (webhooks, sale comps) if using data intelligence
4. **Storage** — Bucket `kyc-documents` exists; policies allow service role uploads.
5. **Restart API** — Pick up new env and code paths.
6. **Smoke** — `npm run validate:rls` then `npm run smoke:staging` (API running + demo seed).
7. **Functional** — Full UI path in `docs/STAGING_RELEASE_CHECKLIST.md`.
8. **Auth** — `npm run email:test` + forgot-password UI; Supabase redirect URLs for `/auth/reset-password`.
9. **CI** — `npm run test:metrics` and `npm run test:e2e` (`.github/workflows/ci.yml`).

## Production procedure

Same as staging after go/no-go sign-off (`UPDATED_IMPLEMENTATION_SUMMARY.md` release gate).

- Run during a low-traffic window.
- Keep rollback SQL notes (column drops only if safe; prefer forward-fix).
- Do **not** skip `0026`/`0027` if KYC branch is merged — landlord gating depends on them.

## Post-migrate API smoke (admin)

```http
POST /admin/system-health/smoke
Authorization: Bearer <admin_access_token>
```

Returns a checklist: DB probes, scheduler heartbeats, SMTP configured, notification table reachable.

## Branch integration note

Integrated trunk = `feat/market-intelligence-compliance` (includes KYC merge) → merge to `main` → deploy from `main`.

Payment gateway migrations are **not** included (merchant TBD); card/mobile remain simulated until a provider is chosen.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| `partner_approval_status` missing | Run `0027` |
| Landlord nav not locking | Profile column + web build from integrated branch |
| 403 `TWO_FACTOR_REQUIRED` | Enable 2FA in settings, then `POST /auth/2fa/verify-session` |
| Webhooks not retrying | `0029` applied + API scheduler running |

---

*Last updated: June 2026*
