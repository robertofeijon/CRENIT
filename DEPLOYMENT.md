# CRENIT deployment guide

## Vercel (Web)

1. Import the GitHub repo in [Vercel](https://vercel.com).
2. **Root Directory:** `apps/web`
3. **Framework:** Next.js (auto-detected)
4. **Install Command:** `cd ../.. && npm ci` (monorepo — installs workspaces)
5. **Build Command:** `npm run build` (runs inside `apps/web`)

### Required environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_API_URL` | `https://crenit-api.onrender.com` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `robertofeijon@gmail.com` (contact page + mailto) |
| `NEXT_PUBLIC_SITE_URL` | `https://crenit-web.vercel.app` (canonical URLs / sitemap) |
| `NEXT_PUBLIC_SMS_ENABLED` | `false` (set `true` when `SMS_ENABLED` on API) |
| `NEXT_PUBLIC_VERIFY_URL` | Optional — `https://verify.crenit.na` for PDF QR links |

`apps/web/vercel.json` adds security headers. Production builds fail if Supabase public keys are missing.

---

## Render (API)

Use the included `render.yaml` blueprint or create a **Web Service** manually:

| Setting | Value |
|---------|--------|
| Root directory | `.` (repo root) |
| Build command | `npm ci && npm run build:api` |
| Start command | `npm run start:prod --workspace=crenit-api` |
| Node version | `20` (set in Render or use repo `.nvmrc`) |
| Health check path | `/` |

If you previously set **Root directory** to `apps/api`, change it to **`.`** (repo root) so workspace installs resolve correctly.

**Do not** use `node dist/main.js` unless root directory is `apps/api` and a clean `nest build` runs there.

Render sets `PORT` automatically. The API binds to `0.0.0.0`.

### Required environment variables (Render dashboard)

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | |
| `SUPABASE_ANON_KEY` | |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** — never expose to web |
| `JWT_SECRET` | Min 32 characters |
| `CORS_ORIGIN` | Your Vercel **web** URL, e.g. `https://crenit-web.vercel.app` (comma-separated for previews) |
| `WEB_URL` | Same as primary Vercel URL (emails, report links) |
| `ADMIN_EMAILS` | Comma-separated admin login emails |
| `RATE_LIMIT_WINDOW_MS` | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | `120` |
| `EMAIL_PROVIDER` / SMTP or Resend vars | See `.env.example` |
| `EMAIL_CONTACT` | Inbox for `POST /public/contact` (e.g. `robertofeijon@gmail.com`) |
| `EMAIL_REPLY_TO` | Reply-to for outbound mail (often same as `EMAIL_CONTACT`) |
| `PAYMENT_WEBHOOK_SECRET` | Required when payment webhooks are enabled |

---

## Contact email + GitHub E2E secrets (one-time)

**Local dev** (creates/updates gitignored `.env` files):

```bash
npm run configure:contact-env
```

**GitHub Actions** (tenant login Playwright in CI):

1. Copy `.env.staging.example` → `.env.staging`
2. Fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_API_URL` from your staging Supabase + Render API
3. Install [GitHub CLI](https://cli.github.com/) and run `gh auth login`
4. Push secrets:

```bash
npm run setup:github-e2e-secrets
```

E2E credentials default to demo seed (`tenant@rentcredit.demo` / `DemoTenant123!`) — run `npm run seed:demo` on staging first.

**Render / Vercel dashboards:** set `EMAIL_CONTACT` and `EMAIL_REPLY_TO` on the API service; set `NEXT_PUBLIC_CONTACT_EMAIL` on the web project (same address).

---

## verify.crenit.na (PDF verification subdomain)

1. In **Vercel** → Project → Domains → add `verify.crenit.na` (same project as main web).
2. At your DNS provider, add a **CNAME** for `verify` → `cname.vercel-dns.com` (or Vercel’s shown target).
3. Set env on **API** (Render): `VERIFY_URL=https://verify.crenit.na`
4. Set env on **Web** (Vercel): `NEXT_PUBLIC_VERIFY_URL=https://verify.crenit.na`
5. `apps/web/middleware.ts` rewrites `verify.crenit.na/{reference}` → `/verify/{reference}`.

Shareable credit PDFs and QR codes use `buildVerifyUrl()` — links update automatically when `VERIFY_URL` is set.

---

## SMS (optional)

| API (Render) | Web (Vercel) |
|--------------|--------------|
| `SMS_ENABLED=true` | `NEXT_PUBLIC_SMS_ENABLED=true` |
| `SMS_PROVIDER=africas_talking` | |
| `SMS_PROVIDER_API_KEY=...` | |
| `SMS_AT_USERNAME=...` | |
| `SMS_FROM=CRENIT` | |

Enables: SMS 2FA (`POST /auth/2fa/sms/*`), landlord confirm SMS nudges (24h before auto-confirm).

---

## Database

Apply migrations in order in Supabase SQL Editor: `0001_init.sql` → … → `0024_profile_kyc_flags_and_lease_doc.sql` → **`0025_private_storage_buckets.sql`**.

### Storage security (important)

1. Run **`0025_private_storage_buckets.sql`** in Supabase SQL Editor (sets buckets to **private**).

2. **Dashboard cleanup** (required if optional policy SQL fails with `must be owner of table objects`):
   - Storage → `kyc-documents` → **Policies** → delete every policy (or disable public read/upload rules)
   - Storage → `landlord-attachments` → **Policies** → same
   - Private bucket + **no policies** = clients cannot access files directly; only the API (`service_role`) and signed URLs work.

3. Optional: run **`0025_storage_policies_optional.sql`** only if your SQL Editor session is `postgres` and it succeeds. If you see `42501 must be owner of table objects`, skip step 3 — step 2 is enough.

Confirm each bucket shows **Public: OFF** under Storage.

---

## Deploy gates (`6edfdf8`+)

Run locally before/after pushing to `main`:

```bash
npm run verify:deploy-gates
```

| Gate | Action |
|------|--------|
| **Vercel** | Redeploy `apps/web`; build log SHA = `git rev-parse --short HEAD` |
| **Render** | Redeploy API; `EMAIL_CONTACT`, `CORS_ORIGIN`, `WEB_URL` set |
| **Supabase** | Apply `0034_payment_eft_proofs.sql` + `0035_notifications_realtime.sql` |
| **GitHub CI** | [Actions → CI](https://github.com/robertofeijon/CRENIT/actions) — **web-e2e** 9+ passed with E2E secrets |
| **Manual** | `docs/STAGING_RELEASE_CHECKLIST.md` §10 (notification bell + renewals) |

---

## Post-deploy smoke tests

| Test | Command / URL | Pass |
|------|----------------|------|
| API health | `GET https://<api>/` | `success: true` |
| Auth health | `GET https://<api>/auth/health` | `200` |
| Web home | `https://<vercel-app>/` | Loads |
| Login | Sign in on `/auth` | Session works |
| CORS | Web calls API | No CORS errors in browser console |

```bash
npm run smoke:presentation
```

---

## Security checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` only on Render (never in Vercel)
- [ ] `JWT_SECRET` ≥ 32 chars, unique per environment
- [ ] `CORS_ORIGIN` lists only your real front-end origins (no `*`)
- [ ] `ADMIN_EMAILS` lists only trusted admins (ADMIN role is email-gated)
- [ ] `PAYMENT_WEBHOOK_SECRET` set before enabling payment webhooks
- [ ] KYC storage buckets private; RLS enabled on Supabase tables
- [ ] Rotate keys if `.env` was ever committed or shared

### Fixes included in this repo

- Registration cannot self-assign `ADMIN` role
- `ADMIN` role only from `ADMIN_EMAILS`, not `profiles.role` alone
- Payment webhooks require signature when `PAYMENT_WEBHOOK_SECRET` is set (mandatory in production)
- KYC documents use signed URLs instead of public bucket URLs
- Upload filename sanitization and size limits
- Rate limiting skips health checks; trusts `X-Forwarded-For` behind Render
- Security headers on API and web responses
