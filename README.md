# RentCredit

RentCredit is a fintech monorepo scaffold for Namibia. The platform turns rent payments into a verified financial identity — tenants pay rent through the platform, build a credible credit score, and use that score to access loans, mortgages, and property purchases.

**Project status (where we are now):** [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) · `main` @ `e5e728b`

## Core Platform Features

- **In-Platform Rent Payments** — EFT, card, and mobile money processing with 0.5–1.5% commission
- **Credit Score Engine** — weighted factor model (payment history, streak, tenancy length, income-to-rent, deposit management)
- **Landlord Partner Model** — verified landlords onboard tenants; tenants cannot self-enrol
- **KYC & Identity Verification** — government ID, selfie, income verification with admin review queue
- **Deposit & Escrow Management** — full lifecycle with dispute resolution
- **Property Market Data Intelligence** — anonymised, verified rent data for B2B clients

## Dashboard Modules

### Landlord Dashboard
| Module | Features |
|--------|----------|
| Portfolio Overview | Total units/tenants, expected vs collected rent, outstanding balances, commission deducted |
| Payments | Incoming payment log per unit, confirmation status, commission per transaction, bank account management |
| Tenants | Searchable directory with KYC status, score tier, payment streak, full payment history |
| Deposits & Disputes | Escrow balances per tenant, active disputes, evidence review, refund release controls |
| Reports | Portfolio Summary + Per-Tenant Payment Report (PDF export) |
| Unit Registration | Add properties/units, set rent amounts, due dates, lease terms |

### Tenant Dashboard
| Module | Features |
|--------|----------|
| Home Overview | Current rent due, due date, payment status, score with tier badge, payment streak, recent transactions |
| Payments | Pay Rent button, method selection (EFT/card/mobile money), full history, receipt archive, auto-pay |
| Deposit | Escrow balance, refund status, full timeline, dispute filing with evidence upload |
| My Credit Score | Score gauge, tier label, factor breakdown (35/20/20/15/10%), history graph, next-milestone guidance |
| My Report | Generate bank-ready RentCredit Score Report PDF |
| Settings | Profile, KYC documents, linked payment accounts, 2FA |

### Admin Portal
| Module | Capabilities |
|--------|--------------|
| User Management | Directory, account status, role assignment, landlord partner approval |
| KYC Review Queue | Document verification, approve/reject/request-more-info, audit log |
| Payment Oversight | Transaction log, commission reconciliation, refund management |
| Escrow & Disputes | Deposit balances, dispute monitoring, fund release authorisation |
| Credit Score Audit | View score breakdowns, flag anomalies, manual override with audit note |
| Data Intelligence | Suburb reports, API access, client management |
| Compliance | Audit log, transaction monitoring, GDPR controls |
| System Health | Service status, error rates, uptime monitoring |

## Structure

- `apps/api` — NestJS backend
- `apps/web` — Next.js frontend (Tailwind CSS)
- `supabase/migrations` — database schema migrations

## Setup

1. Copy `.env.example` to `.env` and set required Supabase values
2. Add admin emails to `ADMIN_EMAILS` in `.env` if you want manual admin login:
   - `ADMIN_EMAILS=admin@example.com,ops@example.com`
   - The admin account must also exist in Supabase auth and have a matching `profiles` row with `role = 'ADMIN'`.
   - Look up the auth user's UUID first, then insert the profile row:
     ```sql
     select id from auth.users where email = 'admin@example.com';

     insert into public.profiles (id, full_name, role)
     values ('<USER_UUID>', 'Admin Name', 'ADMIN');
     ```
3. Copy `apps/web/.env.local.example` to `apps/web/.env.local`
4. Run `npm install` at the repository root
5. Start development:
   - `npm run dev:api` — backend on port 3001
   - `npm run dev:web` — frontend on port 3002

## Staging validation

After applying Supabase migrations (`docs/MIGRATION_RUNBOOK.md`):

```bash
npm run seed:demo          # demo users
npm run dev              # API + web
npm run staging:checklist # RLS + API E2E smoke
npm run email:test you@example.com
npm run test:metrics
npm run test:e2e
```

Full manual steps: `docs/STAGING_RELEASE_CHECKLIST.md`. Gap audit: `docs/CRITICAL_GAPS.md`.

## Technology Stack

| Layer | Technology |
|-------|-------------|
| Frontend | React / Next.js (App Router), Tailwind CSS |
| Backend | NestJS, JWT + 2FA |
| Database | Supabase (PostgreSQL) |
| Payments | EFT, card gateway, mobile money (Phase 2) |
| Security | PCI-DSS compliant, role-based JWT, full audit trail |

## Notes

- Desktop-first web application (mobile apps are Phase 3)
- No notification centre (explicitly out of scope per spec v4.0)
- Credit score recalculated nightly after payment confirmation
- All reports export as branded PDF (bank/lender ready)
- Data intelligence product uses aggregated, anonymised data only