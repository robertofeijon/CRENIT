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
| `NEXT_PUBLIC_SMS_ENABLED` | `false` |

`apps/web/vercel.json` adds security headers. Production builds fail if Supabase public keys are missing.

---

## Render (API)

Use the included `render.yaml` blueprint or create a **Web Service** manually:

| Setting | Value |
|---------|--------|
| Root directory | `.` (repo root) |
| Build command | `npm ci && npm run build --workspace=crenit-api` |
| Start command | `node apps/api/dist/main.js` |
| Health check path | `/` |

Render sets `PORT` automatically. The API binds to `0.0.0.0`.

### Required environment variables (Render dashboard)

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | |
| `SUPABASE_ANON_KEY` | |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** — never expose to web |
| `JWT_SECRET` | Min 32 characters |
| `CORS_ORIGIN` | Your Vercel URL(s), comma-separated |
| `WEB_URL` | Same as primary Vercel URL (emails, report links) |
| `ADMIN_EMAILS` | Comma-separated admin login emails |
| `RATE_LIMIT_WINDOW_MS` | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | `120` |
| `EMAIL_PROVIDER` / SMTP or Resend vars | See `.env.example` |
| `PAYMENT_WEBHOOK_SECRET` | Required when payment webhooks are enabled |

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
