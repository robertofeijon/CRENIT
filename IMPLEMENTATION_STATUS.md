# CRENIT Implementation Status

**Last updated:** June 2026 · **`main` @ `e5e728b`**

**Where we are:** [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) (read this first).

---

## Trunk

| Branch | Status |
|--------|--------|
| `main` | **Current trunk** — Phase 1 trust + observability + E2E smoke |

**Gap audit:** [`docs/CRITICAL_GAPS.md`](docs/CRITICAL_GAPS.md)

**Payment gateway:** Deferred — card/mobile simulated until merchant selected.

---

## Shipped on `main` (recent)

### Phase 1 — Core product trust (`e296c90`–`e5e728b`)
- Bronze→Platinum presentation tiers, insights, simulator
- Shareable credit PDF with expiry + QR verify
- EFT auto-confirm (48h), one-tap landlord confirm, pending/bulk confirm UI
- Dispute types, templates, `dispute_events` timeline
- Flywheel metrics on admin system health
- Migration `0036_phase1_trust.sql`

### Platform ops (prior)
- External cron (GitHub Actions), Sentry hooks, admin health + smoke
- Staging E2E: invite → KYC → pay → score; renewal flow
- Realtime notifications (`0035`), auth scope optimization
- TOTP 2FA, GDPR tools, market intelligence B2B admin

---

## Database migrations (apply through)

`0036_phase1_trust.sql` — see [`supabase/scripts/staging_apply_reference.sql`](supabase/scripts/staging_apply_reference.sql)

---

## Not started

- Phase 2: waitlist, bring-your-landlord, CSV bulk units, lite landlord tier
- Phase 3: public `data.crenit.na`, B2B sample API
- SMS confirm nudges (P1-S7), live payment gateway, legal counsel sign-off

---

## Quick verification (staging)

1. Apply migrations `0035` + `0036`
2. Redeploy Vercel + Render
3. `npm run validate:rls` && `npm run smoke:staging`
4. Admin → System health → Flywheel metrics + smoke tests
5. Landlord one-tap confirm + tenant share PDF

See [`docs/STAGING_RELEASE_CHECKLIST.md`](docs/STAGING_RELEASE_CHECKLIST.md).
