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
- `src/lib/auth-routes.ts` — `isAuthRequiredPath()` helper.

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

1. **Vercel** — deploy `main` HEAD (`6862240` or later). Verify build log commit SHA (not stale `ff06a95`).
2. **Render** — set `EMAIL_CONTACT`, redeploy API.
3. **Vercel env** — set `NEXT_PUBLIC_CONTACT_EMAIL`, redeploy web.
4. **Supabase** — migrations through `0034` if not already applied.
5. **GitHub** — fill `.env.staging`, run `npm run setup:github-e2e-secrets`, confirm **web-e2e** shows 5 passed.

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

---

## 9. Admin workspace polish

- `AdminWorkspaceLoading` in `WorkspaceLoading.tsx`.
- `app/admin/loading.tsx` — route-level loader.
- `app/admin/layout.tsx` — centralized auth gate + skeleton (replaces per-page plain `<p>` tags).
- Legacy redirects (`/dashboard/tenant`, `/landlord/onboarding`) use workspace loaders.

---

## 10. Deferred (not in this batch)

- Production payment gateway integration
- SMS 2FA
- Real-time notifications
- Scope `AuthProvider` off public routes entirely (partial lazy hydrate done)
- Restore original photographic logo if brand requires it (`git show b6d1dde^:apps/web/public/crenit-logo.svg`)
