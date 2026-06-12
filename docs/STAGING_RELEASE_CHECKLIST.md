# Staging release checklist

Run on **staging** before production. Commands assume repo root and `.env` configured.

**Current position:** [`docs/PROJECT_STATUS.md`](PROJECT_STATUS.md) · **`main` @ `e5e728b`**

---

## 1. Staging migrations + RLS

```bash
# Apply migrations 0026–0036 in Supabase (see supabase/scripts/staging_apply_reference.sql)
# Then validate tenant-scoped RLS with anon key:
npm run validate:rls
```

**Migration `0035_notifications_realtime.sql` (live in-app notifications):**

| Check | Where |
|-------|--------|
| `notifications` on `supabase_realtime` publication | Supabase → Database → Replication |

**Migration `0036_phase1_trust.sql` (auto-confirm, dispute events, report expiry):**

| Check | Where |
|-------|--------|
| `payments.auto_confirm_at`, `confirmed_via` columns | `payments` table |
| `dispute_events`, `dispute_outcomes` tables | Table Editor |
| `report_verifications.expires_at`, `brand_tier` | `report_verifications` |

**Migration `0034_payment_eft_proofs.sql` (required for EFT proof + CI login E2E path):**

| Check | Where |
|-------|--------|
| `payment_eft_proofs` table exists | Supabase → Table Editor |
| `payments.eft_proof_*` columns exist | `payments` table |
| Private bucket `payment-proofs` | Supabase → Storage |

Expected: `4/4 RLS checks passed`.

---

## 2. Manual E2E (invite → KYC → pay → confirm → score)

**Automated partial smoke:**

```bash
npm run seed:demo          # if demo users missing
npm run dev              # API :3001 + Web :3002 in another terminal
npm run smoke:staging
```

**Manual UI path** (record screenshots / notes):

| Step | Actor | Action |
|------|--------|--------|
| 1 | Landlord | Login → complete partner verification if `UNVERIFIED` |
| 2 | Landlord | Properties → invite tenant to unit |
| 3 | Tenant | Open invite link `/join/[token]` → accept → account |
| 4 | Tenant | `/tenant/kyc` → complete 3 steps → submit |
| 5 | Admin | `/admin/kyc` → approve tenant |
| 6 | Tenant | `/tenant/settings` → add payment method |
| 7 | Tenant | `/tenant/payments` → initiate EFT → upload proof → landlord confirms on `/landlord/payments` |
| 8 | Landlord | `/landlord/payments` → confirm payment received |
| 9 | Tenant | `/tenant/home` → streak + on-time % update; `/tenant/credit-score` → recalculate |

---

## 3. SMTP, contact form, and forgot-password email

**.env (API — repo root / Render):**

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=app-password
EMAIL_FROM=CRENIT <your@gmail.com>
EMAIL_CONTACT=robertofeijon@mail.com
EMAIL_REPLY_TO=robertofeijon@mail.com
WEB_URL=https://your-staging-web.vercel.app
```

**Web (Vercel / `apps/web/.env.local`):**

```env
NEXT_PUBLIC_CONTACT_EMAIL=robertofeijon@mail.com
```

`POST /public/contact` delivers to **`EMAIL_CONTACT`** (falls back to `EMAIL_REPLY_TO` → `SMTP_USER`). The contact page mailto link uses **`NEXT_PUBLIC_CONTACT_EMAIL`**.

**Test contact form:**

```bash
curl -X POST "$NEXT_PUBLIC_API_URL/public/contact" \
  -H "Content-Type: application/json" \
  -d '{"name":"Staging","email":"you@example.com","subject":"Smoke test","message":"Hello from staging checklist."}'
```

Expected: `email_sent: true` when SMTP is configured; otherwise `email_sent: false` with a received acknowledgement.

**Test transport:**

```bash
npm run email:test your@email.com
```

**Supabase Auth → URL configuration** — add:

- `https://<staging-web>/auth/reset-password`
- `http://localhost:3002/auth/reset-password`

**UI test:** `/auth/forgot-password` → email → link → `/auth/reset-password` → new password → login.

---

## 4. Landlord / admin 2FA step-up

| Step | Action |
|------|--------|
| 1 | Landlord → Settings → Set up authenticator (QR) → Enable |
| 2 | Log out → log in → should land on `/auth/verify-2fa` |
| 3 | Enter TOTP → dashboard unlocks for ~12h |
| 4 | Repeat for admin account in `ADMIN_EMAILS` |

Dev bypass only: `TWO_FACTOR_ENFORCEMENT=false` (not for staging/prod).

---

## 5. Admin system health smoke

1. Login as admin → **System health**
2. **Run health check** — probes green or expected degraded
3. **Run smoke tests** — all checks pass (scheduler heartbeat may warn until first cron on that instance)

API: `POST /admin/system-health/smoke` with admin Bearer token.

---

## 6. CI (local)

```bash
npm ci
npm run test:metrics
cd apps/web && npx playwright install chromium && npm run test:e2e
```

GitHub Actions runs the same on push/PR (`.github/workflows/ci.yml`).

---

## 7. External schedulers (optional)

When the API restarts often, trigger jobs via HTTP instead of in-process crons only.

Set `CRON_SECRET` in API env, then:

```bash
curl -X POST -H "X-Cron-Secret: YOUR_SECRET" https://your-api/internal/cron/payments-overdue
curl -X POST -H "X-Cron-Secret: YOUR_SECRET" https://your-api/internal/cron/notifications-rent-reminder
```

List jobs: `GET /internal/cron/jobs` with the same header.

| Job key | Schedule (Namibia) |
|---------|-------------------|
| `payments-autopay` | 07:00 daily |
| `notifications-rent-reminder` | 08:00 daily |
| `payments-overdue` | 09:00 daily |
| `credit-score-recalc` | 02:00 daily |
| `mi-snapshot-rollup` | 03:30 daily |
| `mi-licensable-webhooks` | 04:00 daily |
| `mi-webhook-retry` | every 15 min |

---

## 8. Mandatory admin 2FA (staging)

Set `ADMIN_REQUIRE_2FA=true` on the API. Admins must enable 2FA at `/admin/security` before other admin routes work.

---

## 9. GitHub Actions secrets (login E2E)

**Prerequisites on staging (same Supabase project as the secrets below):**

- Migrations through **`0034_payment_eft_proofs.sql`** applied — see §1 table.
- Demo tenant exists with **KYC approved** (`npm run seed:demo` against staging, or matching real credentials in secrets).
- Staging API **`CORS_ORIGIN`** includes your deployed web URL **and** `http://localhost:3002` (Playwright in CI serves Next on that origin while calling `NEXT_PUBLIC_API_URL`).

Configure in the repo **Settings → Secrets and variables → Actions** (repository secrets, not environment-only):

| Secret | Example / notes |
|--------|-----------------|
| `E2E_TENANT_EMAIL` | `tenant@rentcredit.demo` (from `npm run seed:demo`) |
| `E2E_TENANT_PASSWORD` | `DemoTenant123!` |
| `NEXT_PUBLIC_SUPABASE_URL` | Staging Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging anon key |
| `NEXT_PUBLIC_API_URL` | Staging API base URL (no trailing slash), e.g. `https://your-api.onrender.com` |

Without these, CI still runs public Playwright tests; the tenant login spec is **skipped**.

**Verify CI:** push to `main` or re-run **web-e2e**. Expected: **5 passed** including `login.spec.ts` (not `1 skipped`).

**Automated secret setup** (after filling `.env.staging` from `.env.staging.example`):

```bash
npm run setup:github-e2e-secrets
```

Requires [GitHub CLI](https://cli.github.com/) and `gh auth login`.

**Local E2E with login** (optional):

```bash
cd apps/web
E2E_TENANT_EMAIL=tenant@rentcredit.demo E2E_TENANT_PASSWORD=DemoTenant123! \
  NEXT_PUBLIC_API_URL=http://localhost:3001 npm run test:e2e
```

Optional observability secrets: `SENTRY_DSN` (API), `NEXT_PUBLIC_SENTRY_DSN` (web).

**EFT proof on staging (manual):** tenant `/tenant/payments` → Pay now (EFT) → upload proof → landlord `/landlord/payments` → View proof → Mark received. Confirm `payment-proofs` bucket is private in Supabase Storage.

---

## 10. Notification bell + lease renewals (manual)

Requires migration **`0035_notifications_realtime.sql`** (§1) and web deploy with `NotificationsProvider` / `NotificationBell`.

| Step | Actor | Action | Pass criteria |
|------|--------|--------|----------------|
| 1 | Tenant | Log in → any `/tenant/*` page | Header **bell** visible; click opens panel titled **Notifications** |
| 2 | Tenant | Trigger an in-app notification (e.g. landlord renewal proposal) | Bell badge increments; item appears in dropdown without full page refresh |
| 3 | Tenant | Dismiss one / Mark all read | Badge clears; list updates |
| 4 | Landlord | Log in → `/landlord/overview` or `/landlord/leases` | Same bell behaviour |
| 5 | Admin | Log in → `/admin` | Same bell behaviour |
| 6 | Tenant | `/tenant/home` → **Lease renewals** | Accept / Decline / Send counter show loading labels; green success banner after respond |
| 7 | Landlord | `/landlord/leases` → **Lease renewal proposals** | Approve / Reject / counter show busy state; success message after respond |

**Playwright:** `cd apps/web && E2E_TENANT_EMAIL=… E2E_TENANT_PASSWORD=… NEXT_PUBLIC_API_URL=… npm run test:e2e -- dashboard-shell.spec.ts`

---

## Sign-off

| Item | Owner | Date | Pass |
|------|-------|------|------|
| Migrations 0026–0034 (incl. EFT proof `0034`) | | | |
| RLS script | | | |
| Contact form (`EMAIL_CONTACT` + `NEXT_PUBLIC_CONTACT_EMAIL`) | | | |
| E2E smoke + manual path | | | |
| SMTP + password reset | | | |
| Migration `0035` (notifications realtime) | | | |
| Notification bell + renewals (§10) | | | |
| GitHub E2E secrets (5+ passed in CI) | | | |
| 2FA step-up | | | |
| Admin health smoke | | | |
| CI green | | | |
