-- RentCredit comprehensive visual seed
-- Uses existing auth.users records. Requires at least 14 users.

DO $$
DECLARE
  user_ids uuid[];
  landlord_profile_ids uuid[] := '{}';
  tenant_ids uuid[] := '{}';
  suburbs text[] := ARRAY['Klein Windhoek', 'Olympia', 'Pioneerspark', 'Khomasdal', 'Eros', 'Katutura'];
  property_types text[] := ARRAY['APARTMENT', 'HOUSE', 'TOWNHOUSE', 'APARTMENT', 'HOUSE', 'APARTMENT'];
  admin_id uuid;
  idx integer;
  landlord_user_id uuid;
  landlord_profile_id uuid;
  tenant_id uuid;
  property_id uuid;
  unit_id uuid;
  lease_id uuid;
  month_idx integer;
  due_dt date;
  paid_dt timestamptz;
  rent numeric;
  on_time_rate integer;
  score_value integer;
  tier_value text;
  switch_method text;
BEGIN
  SELECT array_agg(id ORDER BY created_at ASC)
  INTO user_ids
  FROM auth.users
  LIMIT 14;

  IF coalesce(array_length(user_ids, 1), 0) < 14 THEN
    RAISE EXCEPTION 'Seed requires at least 14 auth users. Create users first, then rerun supabase/seed.sql.';
  END IF;

  admin_id := user_ids[1];
  INSERT INTO public.profiles (id, full_name, role, kyc_status, kyc_approved_at, partner_approval_status)
  VALUES (admin_id, 'Seed Admin', 'ADMIN', 'APPROVED', now(), 'APPROVED')
  ON CONFLICT (id) DO UPDATE
    SET full_name = excluded.full_name, role = 'ADMIN', kyc_status = 'APPROVED', kyc_approved_at = now(), partner_approval_status = 'APPROVED';

  FOR idx IN 1..3 LOOP
    landlord_user_id := user_ids[idx + 1];
    INSERT INTO public.profiles (id, full_name, role, kyc_status, kyc_approved_at, partner_approval_status)
    VALUES (landlord_user_id, format('Seed Landlord %s', idx), 'LANDLORD', 'APPROVED', now(), 'APPROVED')
    ON CONFLICT (id) DO UPDATE
      SET full_name = excluded.full_name, role = 'LANDLORD', kyc_status = 'APPROVED', kyc_approved_at = now(), partner_approval_status = 'APPROVED';

    INSERT INTO public.landlord_profiles (user_id, business_name, partner_status, partner_approved_at)
    VALUES (landlord_user_id, format('Seed Portfolio %s', idx), 'APPROVED', now())
    ON CONFLICT (user_id) DO UPDATE
      SET business_name = excluded.business_name, partner_status = 'APPROVED', partner_approved_at = now()
    RETURNING id INTO landlord_profile_id;

    IF landlord_profile_id IS NULL THEN
      SELECT id INTO landlord_profile_id FROM public.landlord_profiles WHERE user_id = landlord_user_id;
    END IF;

    landlord_profile_ids := array_append(landlord_profile_ids, landlord_profile_id);
  END LOOP;

  FOR idx IN 1..10 LOOP
    tenant_id := user_ids[idx + 4];
    INSERT INTO public.profiles (id, full_name, role, kyc_status, kyc_approved_at, income_monthly, partner_approval_status)
    VALUES (
      tenant_id,
      format('Seed Tenant %s', idx),
      'TENANT',
      CASE WHEN idx % 4 = 0 THEN 'PENDING' ELSE 'APPROVED' END,
      CASE WHEN idx % 4 = 0 THEN null ELSE now() END,
      12000 + idx * 850,
      'APPROVED'
    )
    ON CONFLICT (id) DO UPDATE
      SET full_name = excluded.full_name, role = 'TENANT', kyc_status = excluded.kyc_status, income_monthly = excluded.income_monthly;
    tenant_ids := array_append(tenant_ids, tenant_id);
  END LOOP;

  FOR idx IN 1..6 LOOP
    landlord_profile_id := landlord_profile_ids[((idx - 1) % 3) + 1];
    INSERT INTO public.properties (landlord_id, property_name, address_street, address_suburb, address_city, property_type)
    VALUES (
      landlord_profile_id,
      format('Seed Property %s', idx),
      format('%s Example Street', 20 + idx),
      suburbs[idx],
      'Windhoek',
      property_types[idx]
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO property_id;

    IF property_id IS NULL THEN
      SELECT id INTO property_id
      FROM public.properties
      WHERE landlord_id = landlord_profile_id AND address_suburb = suburbs[idx]
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;

    FOR month_idx IN 1..3 LOOP
      rent := 7000 + (idx * 600) + (month_idx * 250);
      INSERT INTO public.units (property_id, unit_identifier, bedrooms, bathrooms, monthly_rent, is_occupied)
      VALUES (property_id, format('U%s%s', idx, month_idx), 1 + (month_idx % 3), 1, rent, false)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  idx := 1;
  FOR unit_id, property_id, rent IN
    SELECT u.id, u.property_id, u.monthly_rent
    FROM public.units u
    JOIN public.properties p ON p.id = u.property_id
    WHERE p.address_city = 'Windhoek'
    ORDER BY u.created_at DESC
    LIMIT 10
  LOOP
    tenant_id := tenant_ids[idx];
    SELECT p.landlord_id INTO landlord_profile_id FROM public.properties p WHERE p.id = property_id;
    switch_method := CASE WHEN idx % 2 = 0 THEN 'DIRECT' ELSE 'PLATFORM' END;

    INSERT INTO public.leases (unit_id, tenant_id, landlord_id, start_date, end_date, monthly_rent, status, payment_method)
    VALUES (
      unit_id,
      tenant_id,
      landlord_profile_id,
      (current_date - interval '14 months')::date,
      (current_date + interval '10 months')::date,
      rent,
      'ACTIVE',
      switch_method
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO lease_id;

    IF lease_id IS NULL THEN
      SELECT l.id INTO lease_id
      FROM public.leases l
      WHERE l.unit_id = unit_id AND l.tenant_id = tenant_id
      ORDER BY l.created_at DESC
      LIMIT 1;
    END IF;

    UPDATE public.units SET is_occupied = true WHERE id = unit_id;

    INSERT INTO public.deposits (lease_id, tenant_id, landlord_id, amount, status, collected_date)
    VALUES (lease_id, tenant_id, landlord_profile_id, rent, 'HELD', now() - interval '12 months')
    ON CONFLICT DO NOTHING;

    on_time_rate := 78 + idx * 2;
    score_value := 570 + idx * 24;
    tier_value := CASE WHEN score_value >= 800 THEN 'EXCELLENT' WHEN score_value >= 650 THEN 'GOOD' WHEN score_value >= 500 THEN 'FAIR' ELSE 'BUILDING' END;

    INSERT INTO public.credit_scores (
      tenant_id, score, tier, payment_history_score, streak_score, history_length_score, income_rent_ratio_score, deposit_management_score, is_current
    )
    VALUES (tenant_id, score_value, tier_value, 70 + idx, 60 + idx, 68 + idx, 62 + idx, 72 + idx, true)
    ON CONFLICT DO NOTHING;

    FOR month_idx IN 0..11 LOOP
      due_dt := (date_trunc('month', now())::date - ((11 - month_idx) || ' months')::interval)::date;
      paid_dt := due_dt::timestamp + CASE WHEN month_idx IN (2, 8) THEN interval '2 days' ELSE interval '0 days' END;
      INSERT INTO public.payments (
        lease_id, tenant_id, landlord_id, unit_id, amount_gross, commission_rate, commission_amount, amount_net,
        due_date, paid_date, payment_method, status, is_simulated, days_overdue, created_at, updated_at
      )
      VALUES (
        lease_id, tenant_id, landlord_profile_id, unit_id, rent,
        CASE WHEN switch_method = 'DIRECT' THEN 0 ELSE 0.01 END,
        CASE WHEN switch_method = 'DIRECT' THEN 0 ELSE round(rent * 0.01, 2) END,
        CASE WHEN switch_method = 'DIRECT' THEN rent ELSE round(rent * 0.99, 2) END,
        due_dt, paid_dt, CASE WHEN switch_method = 'DIRECT' THEN 'EFT' ELSE 'CARD' END,
        'PAID', true, CASE WHEN month_idx IN (2, 8) THEN 2 ELSE 0 END,
        due_dt::timestamp, paid_dt
      )
      ON CONFLICT DO NOTHING;

      INSERT INTO public.score_history (tenant_id, score, tier, recorded_at, event_type)
      VALUES (
        tenant_id,
        least(900, score_value - (11 - month_idx) * 6),
        CASE WHEN least(900, score_value - (11 - month_idx) * 6) >= 800 THEN 'EXCELLENT'
             WHEN least(900, score_value - (11 - month_idx) * 6) >= 650 THEN 'GOOD'
             WHEN least(900, score_value - (11 - month_idx) * 6) >= 500 THEN 'FAIR'
             ELSE 'BUILDING' END,
        due_dt::timestamp,
        'CALCULATED'
      )
      ON CONFLICT DO NOTHING;
    END LOOP;

    idx := idx + 1;
  END LOOP;

  FOR idx IN 1..6 LOOP
    FOR month_idx IN 0..5 LOOP
      INSERT INTO public.market_data_snapshots (
        suburb, city, property_type, bedrooms, avg_rent, min_rent, max_rent, median_rent, on_time_rate, avg_days_to_pay, sample_count, snapshot_date
      )
      VALUES (
        suburbs[idx],
        'Windhoek',
        property_types[idx],
        2,
        7600 + idx * 700 + month_idx * 120,
        6800 + idx * 550 + month_idx * 90,
        9800 + idx * 700 + month_idx * 180,
        7400 + idx * 650 + month_idx * 115,
        78 + idx,
        CASE WHEN month_idx IN (1, 4) THEN 2 ELSE 0 END,
        6 + month_idx,
        (date_trunc('month', now())::date - ((5 - month_idx) || ' months')::interval)::date
      );
    END LOOP;
  END LOOP;

  -- Public verify page test reference: /verify/RC-TEST01
  IF coalesce(array_length(tenant_ids, 1), 0) >= 1 THEN
    INSERT INTO public.report_verifications (
      report_reference,
      tenant_id,
      score,
      tier,
      generated_at,
      score_calculation_date,
      verified_payment_records,
      tenancy_months
    )
    VALUES (
      'RC-TEST01',
      tenant_ids[1],
      594,
      'GOOD',
      now() - interval '7 days',
      now() - interval '7 days',
      10,
      12
    )
    ON CONFLICT (report_reference) DO UPDATE
      SET tenant_id = excluded.tenant_id,
          score = excluded.score,
          tier = excluded.tier,
          generated_at = excluded.generated_at,
          score_calculation_date = excluded.score_calculation_date,
          verified_payment_records = excluded.verified_payment_records,
          tenancy_months = excluded.tenancy_months;
  END IF;

  IF to_regclass('market_intelligence.b2b_clients') IS NOT NULL THEN
    INSERT INTO market_intelligence.b2b_clients (name, client_type, access_tier, subscription_status, reports_pulled_this_month, rate_limit_per_hour)
    VALUES
      ('Namibia Bank Partner', 'Bank', 'API access', 'active', 8, 400),
      ('Windhoek Dev Group', 'Developer', 'Monthly subscription', 'active', 5, 200)
    ON CONFLICT DO NOTHING;
  END IF;

  IF to_regclass('market_intelligence.api_usage_log') IS NOT NULL THEN
    INSERT INTO market_intelligence.api_usage_log (client_id, endpoint, method, response_status, created_at)
    SELECT c.id, '/api/b2b/suburbs', 'GET', 200, now() - (g || ' days')::interval
    FROM market_intelligence.b2b_clients c
    CROSS JOIN generate_series(0, 4) g
    WHERE c.name IN ('Namibia Bank Partner', 'Windhoek Dev Group');
  END IF;

  RAISE NOTICE 'Seed completed: 1 admin, 3 landlords, 10 tenants, 12-month payment histories, score history, report RC-TEST01, market snapshots, and B2B usage.';
END $$;
