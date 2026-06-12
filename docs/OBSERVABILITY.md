# Observability — Sentry, health dashboard, cron

## Sentry (errors)

### API (Render)

| Variable | Example |
|----------|---------|
| `SENTRY_DSN` | `https://…@….ingest.sentry.io/…` |
| `SENTRY_ENVIRONMENT` | `staging` or `production` |

Already wired: `apps/api/src/instrument.ts`, `http-exception.filter.ts` (5xx capture).

### Web (Vercel)

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Same project DSN (browser) |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | `staging` / `production` |
| `NEXT_PUBLIC_SENTRY_PROJECT_URL` | Optional — `https://sentry.io/organizations/…/projects/crenit-web/` for admin link |

Already wired: `sentry.client.config.ts`, `sentry.server.config.ts`, `next.config.mjs` (when DSN set).

### Local setup helper

```bash
npm run configure:sentry-env
```

Edits gitignored `.env` and `apps/web/.env.local` (does not commit secrets).

---

## Admin health dashboard

- **Overview:** `/admin` → **System health** quick link
- **Detail:** `/admin/system-health` — DB probes, scheduler heartbeats, smoke tests, observability flags (Sentry, CRON_SECRET, email)

Run smoke from UI or API: `POST /admin/system-health/smoke` (admin JWT).

---

## External cron (GitHub Actions)

Repository secrets:

| Secret | Value |
|--------|--------|
| `CRON_SECRET` | Same as Render `CRON_SECRET` |
| `API_URL` | `https://your-api.onrender.com` (no trailing slash) |

Workflows:

- `.github/workflows/cron.yml` — daily batch (~05:00 UTC)
- `.github/workflows/cron-webhook-retry.yml` — `mi-webhook-retry` every 15 min

Manual run: GitHub → Actions → **Cron daily jobs** → Run workflow.

Probe locally:

```bash
CRON_SECRET=your-secret API_URL=https://your-api npm run smoke:staging
```

---

## Staging E2E

```bash
API_URL=https://your-api npm run smoke:staging          # API lifecycle incl. renewal
cd apps/web && NEXT_PUBLIC_API_URL=… E2E_TENANT_*=… npm run test:e2e -- staging-lifecycle.spec.ts
```
