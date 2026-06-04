# CRENIT Data Intelligence — B2B Integrator Guide

Licensed rental market data from **verified platform rent payments** (not listing scrapes). Every suburb response includes sample size, confidence, and licensing text.

**Base URL:** `https://your-api-host` (local dev: `http://localhost:3001`)  
**Auth:** `X-CRENIT-Key: <client_api_key>` (legacy alias: `X-RentCredit-Key`)

---

## Response shape

All JSON routes return:

```json
{
  "success": true,
  "data": { },
  "error": null
}
```

### Compliance envelope (on `data`)

| Field | Type | Meaning |
|-------|------|---------|
| `transaction_count` | number | Effective sample size for this response |
| `sample_count` | number | Deprecated alias of `transaction_count` |
| `confidence_level` | string | `insufficient` \| `low` \| `moderate` \| `high` |
| `licensing_notice` | string | Required disclosure for client-facing use |
| `commercially_licensable` | boolean | `true` when n ≥ 10 |
| `data_source` | string | `market_data_records` \| `market_data_snapshots` \| `mixed` |
| `minimum_sample_not_met` | boolean | `true` when n &lt; 5 |
| `required_minimum_sample` | number | Present when minimum not met (usually 5) |
| `recommended_use_cases` | string[] | Present when sample is sufficient |

---

## Endpoints

### Catalog

```http
GET /api/v1/catalog
```

Machine-readable list of routes and compliance field definitions.

### Suburb detail

```http
GET /api/v1/suburb/Klein%20Windhoek
```

**Includes when n ≥ 5:** `price_range`, `rent_distribution`, `on_time_trend`, `bedroom_breakdown`, `income_to_rent_distribution`, `on_time_rate`, `pricing_guidance`.

**Thin suburb (n &lt; 5):** envelope + `minimum_sample_not_met` only.

### Suburb trends only

```http
GET /api/v1/suburb/Klein%20Windhoek/trends
```

Returns `on_time_trend[]` plus envelope (lighter than full suburb).

### City overview

```http
GET /api/v1/city-overview
```

All suburbs with n ≥ 5, ranked by sample; city-level envelope on the wrapper.

### Lender risk pack

```http
GET /api/v1/lender-risk/Klein%20Windhoek
```

**n ≥ 5:** `on_time_payment_rate`, `income_to_rent_distribution`, `bedroom_breakdown` + envelope.  
**n &lt; 5:** same stub as suburb detail (no income/bedroom arrays).

### Licensed reports

```http
GET /api/v1/reports
GET /api/v1/reports/suburb_report/preview?suburb=Klein%20Windhoek
GET /api/v1/reports/suburb_report/pdf?suburb=Klein%20Windhoek
```

| `reportType` | Suburb required |
|------------|-----------------|
| `suburb_report` | Yes |
| `development_feasibility` | Yes |
| `lender_risk_pack` | Yes |
| `city_overview` | No |

PDF returns `application/pdf`. **400** if sample below minimum.

### OpenAPI / Postman

```http
GET /api/v1/openapi.json
```

OpenAPI 3.0 document generated from the live catalog. Admins can also download from **Data Intelligence → Clients & API** (session auth):

- `GET /admin/data-intelligence/integrator/openapi.json`
- `GET /admin/data-intelligence/integrator/postman.json` (Postman Collection v2.1)

### Sale comps (pilot)

```http
GET /api/v1/suburb/Klein%20Windhoek/sale-comps
```

Partner-sourced transfer prices in `sale_comps_records` (separate from rental merge). Admin ingest: `POST /admin/data-intelligence/sale-comps/ingest`.

### Webhooks — suburb becomes licensable

Register a URL to receive `suburb.licensable` when a suburb crosses **n ≥ 10** verified samples:

```http
POST /api/v1/webhooks
Content-Type: application/json

{ "url": "https://partner.example/hooks/crenit", "events": ["suburb.licensable"] }
```

```http
GET /api/v1/webhooks
DELETE /api/v1/webhooks/:id
```

Deliveries are **POST** JSON with header `X-CRENIT-Signature: sha256=<hmac>` (HMAC-SHA256 of raw body using the subscription secret returned at registration). Sync also runs after nightly rollup and on a 04:00 Windhoek cron.

---

## Data merge logic (per suburb)

1. If **≥ 5** live `market_data_records` for suburb → use live (`data_source: market_data_records` for that suburb).
2. Else if latest **snapshot** has weighted n ≥ 5 → use snapshot.
3. City response may be **`mixed`** when suburbs use different layers.

---

## Rate limits

Daily caps by client `access_tier` (tracked in `api_usage_log`):

| Tier | Daily calls |
|------|-------------|
| One-time report | 10 |
| Monthly subscription | 200 |
| API access | 500 |

**401** invalid/revoked key · **400** tier exceeded · **400** insufficient sample for reports

---

## Example: Node.js

```javascript
const suburb = 'Klein Windhoek';
const res = await fetch(
  `${API_BASE}/api/v1/suburb/${encodeURIComponent(suburb)}`,
  { headers: { 'X-CRENIT-Key': process.env.CRENIT_KEY } },
);
const { success, data, error } = await res.json();
if (!success || data.minimum_sample_not_met) {
  throw new Error(data.licensing_notice || 'Insufficient sample');
}
console.log(data.price_range.median, data.confidence_level);
```

---

## Example: Python PDF report

```python
import requests
r = requests.get(
    f"{API_BASE}/api/v1/reports/lender_risk_pack/pdf",
    params={"suburb": "Klein Windhoek"},
    headers={"X-CRENIT-Key": CRENIT_KEY},
)
r.raise_for_status()
open("lender_risk.pdf", "wb").write(r.content)
```

---

## Admin testing

**Data Intelligence → Clients & API** in the admin console: generate a key, use **B2B API playground** and **B2B report sample** without writing code.

---

## Related docs

- `docs/MARKET_INTELLIGENCE.md` — capture, consent, trust model  
- `docs/PLATFORM_UPDATES.md` — §9 B2B reports  
- `docs/pull-requests/feat-market-intelligence-compliance.md` — PR test plan  
