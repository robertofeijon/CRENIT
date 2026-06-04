# PR: Harden market intelligence B2B and landlord market-data APIs

**Branch:** `feat/market-intelligence-compliance` → `main`  
**Open:** https://github.com/robertofeijon/CRENIT/compare/main...feat/market-intelligence-compliance?expand=1

## Summary

- Unify landlord `/market-data` with the verified intelligence pipeline (same merge logic as B2B).
- Add `buildMarketDataEnvelope()` for consistent licensing fields on suburb, city-overview, and lender-risk responses.
- Per-suburb live vs snapshot merge (`market_data_records` | `market_data_snapshots` | `mixed`).
- Require landlord or admin session on `/market-data/*` (health stays public).
- Harden lender-risk: stub-only response when `minimum_sample_not_met`.
- B2B: `GET /api/v1/suburb/:name/trends`, report catalog/preview/PDF under `/api/v1/reports/*`.
- Landlord UI: data-source badge, weighted summary on-time, bedroom/income blocks, monthly rent and on-time charts.
- Ops: nightly snapshot rollup, consent revoke UI, admin licensable suburbs + methodology PDF.
- Reference doc: `docs/MARKET_INTELLIGENCE.md`.

## Test plan

- [ ] `cd apps/api && npx tsc --noEmit`
- [ ] Landlord Bearer: `GET /market-data/summary`, `/suburbs`, `/suburbs/:name` → 401 without token, 200 with landlord
- [ ] B2B key: `GET /api/v1/suburb/:name` includes `transaction_count`, `data_source`, `confidence_level`, `licensing_notice`
- [ ] B2B: suburb with n &lt; 5 → `minimum_sample_not_met` only on suburb + lender-risk
- [ ] B2B: `GET /api/v1/reports` lists products; `.../preview` JSON; `.../pdf` returns PDF or 400 when sample insufficient
- [ ] B2B: `GET /api/v1/suburb/:name/trends` returns `on_time_trend` + envelope
- [ ] Landlord page: mixed badge when applicable; detail shows overall on-time (not last month only)
- [ ] Admin: rollup + licensable suburbs + methodology PDF still work
- [ ] Admin **Clients & API** → B2B report sample: generate key, download PDF via `/api/v1/reports/.../pdf`, copy curl

## API quick reference (B2B)

| Method | Path |
|--------|------|
| GET | `/api/v1/suburb/:name` |
| GET | `/api/v1/suburb/:name/trends` |
| GET | `/api/v1/city-overview` |
| GET | `/api/v1/lender-risk/:suburb` |
| GET | `/api/v1/reports` |
| GET | `/api/v1/reports/:reportType/preview?suburb=` |
| GET | `/api/v1/reports/:reportType/pdf?suburb=` |

Header: `X-CRENIT-Key` (or legacy `X-RentCredit-Key`).

Report types: `suburb_report`, `city_overview`, `lender_risk_pack`, `development_feasibility` (suburb required except city overview).
