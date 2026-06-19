# Site optimization & release notes (June 2026)

Summary of work shipped on `main` from the site optimization, marketing completion, dashboard polish, and staging-configuration batches.

**Commits (newest first):**

| SHA | Summary |
|-----|---------|
| `6862240` | Contact env setup scripts; `hello@crenit.co` standardized |
| `c81b60e` | Landlord overview polish; homepage market/testimonial; auth modal UX; staging checklist |
| `fc2697c` | Lazy auth on marketing routes; lightweight logo; marketing header → `/auth` |
| `b6d1dde` | SSR homepage; admin code-split; contact API + blog; dashboard loading polish |

Prior related fixes already on `main`: `f3a287f` (Vercel landlord `useSearchParams`), `7bb5caf` (SEO, sitemap, redirects).

---

## 1. Performance

### Homepage SSR (`apps/web/app/page.tsx`)

- Converted from a full client page to a **server component** with metadata.
- Client islands only where needed: `HeroScoreCard`, `ProofStatsGrid`.
- Homepage route first-load JS ~**2 kB** (static HTML for hero, flywheel, platform cards, market teaser, testimonial).
- Auth CTAs use `Link` to `/auth` and `/auth?mode=register` (no homepage auth modal).

### Admin code-split

- `app/admin/data-intelligence/lazy-panels.tsx` — dynamic imports for heavy B2B panels.
- `app/components/charts/ScoreHistoryChart.tsx`, `AuditActivityChart.tsx` — chart bundles split out.
- `admin/credit-scores/page.tsx`, `admin/system-health/page.tsx` — `dynamic()` for charts.

### Lazy auth on public routes (`src/contexts/AuthContext.tsx`)

- Public marketing paths skip `/auth/me`; light Supabase session probe only (faster homepage).
- Full hydration on `/tenant`, `/landlord`, `/admin`, `/auth`, `/join`, `/dashboard`.
- `src/lib/auth-routes.ts` — `isAuthScopedPath()` documents auth-wrapped segments.
- `src/providers/AuthScopeLayout.tsx` — `AuthProvider` only on tenant/landlord/admin/auth/join (not marketing).

### Logo asset

- Replaced **~135 KB** embedded-JPEG SVG with a **vector wordmark** (`apps/web/public/crenit-logo.svg`).

---

## 2. Marketing completion

### Contact form

| Layer | Path |
|-------|------|
| API | `POST /public/contact` — `apps/api/src/public/*` |
| Web | `/company/contact` — `ContactForm.tsx` |
| Email target | `EMAIL_CONTACT` (API env) |

### Blog

| Route | Source |
|-------|--------|
| `/company/blog` | `app/company/blog/page.tsx` |
| `/company/blog/[slug]` | 3 posts in `src/content/blog-posts.ts` |

### SEO

- `app/sitemap.ts` — blog index, posts, `/company/contact`.
- Removed duplicate `company/blog` from generic `[section]/[slug]` marketing slugs.

### Homepage parity (server HTML)

- **Market intelligence** — suburb table teaser + link to `/products/market-data`.
- **Testimonial** — “From the field” quote + three bullet points.
- **Flywheel** — four-step ecosystem section.

### Marketing header

- Login / Get started → `/auth` links (no inline `AuthModal` on marketing pages).
- Logged-in users still see dashboard link via light session probe.

---

## 3. Dashboard polish

### Shared loading (`app/components/ui/WorkspaceLoading.tsx`)

- `TenantWorkspaceLoading`, `LandlordWorkspaceLoading` — skeleton + label.

### Route loaders

- `app/tenant/loading.tsx`
- `app/landlord/loading.tsx`

### Applied across

- Tenant/landlord layouts and all workspace pages (home, payments, settings, credit-score, kyc, deposit, reports).
- Landlord shell and all landlord list pages.

### Empty states

- Tenant deposit — `EmptyStateCard` when no deposit on file.

---

## 4. Landlord overview (`/landlord/overview`)

- `LandlordWorkspaceLoading` during auth.
- Skeleton loaders for stat cards and recent payments on first fetch.
- `ErrorStateCard` with retry.
- `EmptyStateCard` for no properties, no payments, no notifications.
- Stat card hints + **Add property** CTA when portfolio is empty.
- **View all** link on recent payments.

---

## 5. Auth UX

- `/auth` and `/auth?mode=register` — **modal opens immediately** on load.
- Minimal backdrop (logo + back link); reopen button only if modal is dismissed.
- Register mode synced from query param.

---

## 6. Staging & environment configuration

### Contact email (standard: `hello@crenit.co`)

| Where | Variable |
|-------|----------|
| API (Render / `.env`) | `EMAIL_CONTACT`, `EMAIL_REPLY_TO` |
| Web (Vercel / `.env.local`) | `NEXT_PUBLIC_CONTACT_EMAIL` |
| Fallback in code | `src/lib/site.ts`, `email-delivery.service.ts` |

### Local setup scripts

```bash
npm run configure:contact-env          # creates/updates gitignored .env files
cp .env.staging.example .env.staging   # fill Supabase + API URLs
npm run setup:github-e2e-secrets       # requires gh auth login
```

### GitHub Actions secrets (CI login E2E)

| Secret | Notes |
|--------|--------|
| `E2E_TENANT_EMAIL` | e.g. `tenant@rentcredit.demo` |
| `E2E_TENANT_PASSWORD` | e.g. `DemoTenant123!` |
| `NEXT_PUBLIC_SUPABASE_URL` | Staging Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging anon key |
| `NEXT_PUBLIC_API_URL` | Staging API base (no trailing slash) |

**Prerequisites:** migration `0034_payment_eft_proofs.sql`, `npm run seed:demo` on staging, API `CORS_ORIGIN` includes web URL + `http://localhost:3002`.

### Docs updated

- `docs/STAGING_RELEASE_CHECKLIST.md` — §1 `0034` table, §3 contact form, §9 E2E secrets + `setup:github-e2e-secrets`
- `DEPLOYMENT.md` — contact vars, GitHub E2E setup section
- `.env.staging.example` — template for secrets script

---

## 7. Deploy checklist

1. **Vercel** — deploy `main` HEAD (`61a6899` or later). Verify build log commit SHA.
2. **Render** — set `EMAIL_CONTACT`, redeploy API.
3. **Vercel env** — set `NEXT_PUBLIC_CONTACT_EMAIL`, redeploy web.
4. **Supabase** — migrations through `0035` if not already applied (`0034` EFT proof + `0035` notifications realtime).
5. **GitHub** — fill `.env.staging`, run `npm run setup:github-e2e-secrets`, confirm **web-e2e** shows 9+ passed (or 5+ if login secrets missing).

---

## 8. Manual smoke (post-deploy)

| Area | Check |
|------|--------|
| `/` | SSR homepage; market table + testimonial visible |
| `/company/contact` | Form submits; email to `EMAIL_CONTACT` |
| `/company/blog` | Index + 3 posts load |
| `/auth?mode=register` | Modal opens on register tab |
| `/landlord/overview` | Stat cards, empty states, loading skeletons |
| `/tenant/*`, `/landlord/*` | Consistent workspace loading shells |
| **Tenant / landlord / admin** | Log in → **bell in header** visible; badge updates when unread exist; dropdown lists items; dismiss / mark all read |
| **`/tenant/home`** | Pending-renewal banner when actionable; Accept / Decline / Send counter show **Saving…** / **Sending…**; green success banner after action |
| **`/landlord/leases`** | Renewal proposals use shared cards; Approve / Reject / counter show busy labels; success message after respond |

**Automated (staging credentials):** `apps/web/e2e/dashboard-shell.spec.ts` — bell + renewal sections (runs in CI when `E2E_TENANT_*` + `NEXT_PUBLIC_API_URL` are set).

---

## 9. Admin workspace polish

- `AdminWorkspaceLoading` in `WorkspaceLoading.tsx`.
- `app/admin/loading.tsx` — route-level loader.
- `app/admin/layout.tsx` — centralized auth gate + skeleton (replaces per-page plain `<p>` tags).
- Legacy `/dashboard/*` URLs redirect via `next.config.mjs` (no `app/dashboard` pages).

---

## 10. Tenant home, legal pages, admin overview, realtime (latest)

- **Tenant home** — onboarding progress bar, empty states (no lease, no payments), KYC/settings CTAs, score hints.
- **Privacy & Terms** — full sections in `src/content/legal-pages.ts` rendered on `/company/privacy` and `/company/terms`.
- **Admin overview** — “Queue clear” attention state; deposit escrow panel always visible with empty state.
- **Contact email** — `robertofeijon@gmail.com` (Nodemailer / `EMAIL_CONTACT` / `NEXT_PUBLIC_CONTACT_EMAIL`).

---

## 11. Notification bell + lease renewal polish

- **Global notification bell** — `NotificationBell` in `DashboardShell` header for tenant, landlord, and admin shells.
- **NotificationsProvider** — `src/contexts/NotificationsContext.tsx` loads unread, subscribes via `useNotificationRealtime`, exposes `markRead` / `markAllRead`.
- **Realtime** — single subscription per logged-in dashboard session (migration `0035_notifications_realtime.sql`); removed duplicate fetches from tenant home and legacy landlord dashboard.
- **Lease renewals** — shared `RenewalProposalCard` + `renewalUi` helpers; pending-renewal banners on tenant home and landlord leases; per-action busy states and clearer status copy.

---

## 12. Deferred (not in this batch)

- Production payment gateway integration
- SMS 2FA
- ~~Scope `AuthProvider` off public routes~~ — done via `AuthScopeLayout` on session routes only
- Restore original photographic logo if brand requires it (`git show b6d1dde^:apps/web/public/crenit-logo.svg`)
