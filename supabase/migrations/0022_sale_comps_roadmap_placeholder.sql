/*
  CRENIT Data Intelligence — Sale comps roadmap (NOT ACTIVE)
  ---------------------------------------------------------
  Rental comps remain in market_intelligence.market_data_records (live).
  Sale comps will use a separate table and ingest path after partner agreements.

  Planned storage (enable after legal + pilot suburb sign-off):

  CREATE TABLE market_intelligence.sale_comps_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES market_intelligence.b2b_clients(id),
    suburb TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Windhoek',
    property_type TEXT,
    bedrooms INTEGER,
    sale_price NUMERIC NOT NULL,
    price_per_sqm NUMERIC,
    transfer_date DATE NOT NULL,
    month_year TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('deeds', 'valuer', 'mls', 'bank_collateral')),
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  Planned report types (extend report_products check or use metadata):
    - sale_suburb_pack
    - sale_rent_yield_pack

  See apps/api/src/market-intelligence/data-product-catalog.ts (SALE_COMPS_ROADMAP)
  and Admin → Data Intelligence → Sale comps (planned) tab.
*/
