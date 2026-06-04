# Staging release checklist

Run on **staging** before production. Commands assume repo root and `.env` configured.

---

## 1. Staging migrations + RLS

```bash
# Apply migrations 0026–0033 in Supabase (see supabase/scripts/staging_apply_reference.sql)
# Then validate tenant-scoped RLS with anon key:
npm run validate:rls
```

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
| 7 | Tenant | `/tenant/payments` → initiate EFT (or card simulated) |
| 8 | Landlord | `/landlord/payments` → confirm payment received |
| 9 | Tenant | `/tenant/home` → streak + on-time % update; `/tenant/credit-score` → recalculate |

---

## 3. SMTP + forgot-password email

**.env (API + scripts):**

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=app-password
EMAIL_FROM=CRENIT <your@gmail.com>
WEB_URL=https://your-staging-web.vercel.app
```

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

## Sign-off

| Item | Owner | Date | Pass |
|------|-------|------|------|
| Migrations 0026–0033 | | | |
| RLS script | | | |
| E2E smoke + manual path | | | |
| SMTP + password reset | | | |
| 2FA step-up | | | |
| Admin health smoke | | | |
| CI green | | | |
