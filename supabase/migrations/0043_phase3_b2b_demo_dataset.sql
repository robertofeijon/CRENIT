-- Phase 3: illustrative B2B demo dataset (3 Windhoek suburbs) + sample key flow

ALTER TABLE public.market_data_snapshots
  ADD COLUMN IF NOT EXISTS is_illustrative boolean NOT NULL DEFAULT false;

ALTER TABLE market_intelligence.market_data_records
  ADD COLUMN IF NOT EXISTS is_illustrative boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.b2b_sample_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  company_name text,
  api_key_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_sample_requests_email ON public.b2b_sample_requests (lower(email));

INSERT INTO market_intelligence.b2b_clients (name, client_type, access_tier, subscription_status, reports_pulled_this_month, rate_limit_per_hour)
SELECT 'CRENIT B2B Demo (Illustrative)', 'Research Firm', 'API access', 'active', 0, 500
WHERE NOT EXISTS (
  SELECT 1 FROM market_intelligence.b2b_clients WHERE name = 'CRENIT B2B Demo (Illustrative)'
);

-- Illustrative snapshots (latest month)
INSERT INTO public.market_data_snapshots (
  suburb, city, property_type, bedrooms, avg_rent, min_rent, max_rent, median_rent,
  on_time_rate, avg_days_to_pay, sample_count, snapshot_date, is_illustrative
)
SELECT v.suburb, 'Windhoek', v.property_type, v.bedrooms, v.avg_rent, v.min_rent, v.max_rent, v.median_rent,
       v.on_time_rate, v.avg_days_to_pay, v.sample_count, current_date, true
FROM (VALUES
  ('Klein Windhoek', 'Apartment', 2, 11417::numeric, 9800::numeric, 12500::numeric, 11500::numeric, 88::numeric, 0.8::numeric, 12),
  ('Eros', 'House', 3, 8217::numeric, 6900::numeric, 9100::numeric, 8200::numeric, 82::numeric, 1.4::numeric, 12),
  ('Kleine Kuppe', 'Townhouse', 2, 9833::numeric, 8400::numeric, 10700::numeric, 9800::numeric, 85::numeric, 1.1::numeric, 12)
) AS v(suburb, property_type, bedrooms, avg_rent, min_rent, max_rent, median_rent, on_time_rate, avg_days_to_pay, sample_count)
WHERE NOT EXISTS (
  SELECT 1 FROM public.market_data_snapshots s
  WHERE s.suburb = v.suburb AND s.is_illustrative = true AND s.snapshot_date = current_date
);

-- Illustrative market_data_records (12 per suburb)
DO $$
DECLARE
  cfg record;
  rent numeric;
  idx int;
  month_offset int;
  payment_uuid uuid;
  tenant_hash text;
  landlord_hash text;
  on_time boolean;
BEGIN
  FOR cfg IN
    SELECT * FROM (VALUES
      ('Klein Windhoek', 'Apartment', 2, ARRAY[9800,10200,10800,11200,11500,11800,12000,12500,10900,11400,11600,12100]::numeric[]),
      ('Eros', 'House', 3, ARRAY[6900,7400,7800,8000,8200,8500,8900,9100,7600,8300,8600,8950]::numeric[]),
      ('Kleine Kuppe', 'Townhouse', 2, ARRAY[8400,8900,9200,9500,9800,10100,10400,10700,9000,9600,10000,10250]::numeric[])
    ) AS t(suburb, property_type, bedrooms, rents)
  LOOP
    idx := 0;
    FOREACH rent IN ARRAY cfg.rents LOOP
      idx := idx + 1;
      month_offset := (idx - 1) % 6;
      payment_uuid := gen_random_uuid();
      tenant_hash := encode(digest('crenit-demo-tenant-' || cfg.suburb || '-' || idx, 'sha256'), 'hex');
      landlord_hash := encode(digest('crenit-demo-landlord-' || cfg.suburb || '-' || idx, 'sha256'), 'hex');
      on_time := idx <> 4 AND idx <> 9;

      INSERT INTO market_intelligence.market_data_records (
        payment_id, suburb, city, property_type, bedrooms, verified_rent_amount,
        payment_status, days_to_pay, month_year, tenant_hash, landlord_hash, is_illustrative
      )
      SELECT payment_uuid, cfg.suburb, 'Windhoek', cfg.property_type, cfg.bedrooms, rent,
             CASE WHEN on_time THEN 'on_time' ELSE 'late' END,
             CASE WHEN on_time THEN 0 ELSE 2 END,
             to_char((date_trunc('month', current_date) - (month_offset || ' months')::interval), 'YYYY-MM'),
             tenant_hash, landlord_hash, true
      WHERE NOT EXISTS (
        SELECT 1 FROM market_intelligence.market_data_records r
        WHERE r.suburb = cfg.suburb AND r.is_illustrative = true AND r.verified_rent_amount = rent
      );
    END LOOP;
  END LOOP;
END $$;
