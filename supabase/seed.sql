-- RentCredit demo data (portfolio only — does NOT create auth users)
--
-- RECOMMENDED: from project root run:
--   npm run seed:demo
-- That creates admin/landlord/tenant accounts AND this data.
--
-- If using Supabase SQL Editor:
--   1. Create users first (npm run seed:demo)
--   2. Paste this ENTIRE file
--   3. Click RUN (green) — NOT "Explain"

DO $$
DECLARE
  v_landlord_user_id uuid;
  v_tenant_user_id uuid;
  v_admin_user_id uuid;
  v_landlord_profile_id uuid;
  v_property_id uuid;
  v_unit_id uuid;
  v_lease_id uuid;
  v_monthly_rent numeric := 12500;
BEGIN
  SELECT id INTO v_admin_user_id FROM auth.users WHERE email = 'admin@rentcredit.demo' LIMIT 1;
  SELECT id INTO v_landlord_user_id FROM auth.users WHERE email = 'landlord@rentcredit.demo' LIMIT 1;
  SELECT id INTO v_tenant_user_id FROM auth.users WHERE email = 'tenant@rentcredit.demo' LIMIT 1;

  IF v_landlord_user_id IS NULL OR v_tenant_user_id IS NULL THEN
    RAISE EXCEPTION 'Demo auth users missing. Run: npm run seed:demo (from project root), then run this script again.';
  END IF;

  IF v_admin_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, full_name, role, kyc_status, kyc_approved_at)
    VALUES (v_admin_user_id, 'Demo Admin', 'ADMIN', 'APPROVED', NOW())
    ON CONFLICT (id) DO UPDATE SET role = 'ADMIN', kyc_status = 'APPROVED', kyc_approved_at = NOW();
  END IF;

  INSERT INTO public.profiles (id, full_name, role, kyc_status, kyc_approved_at)
  VALUES (v_landlord_user_id, 'Demo Landlord', 'LANDLORD', 'APPROVED', NOW())
  ON CONFLICT (id) DO UPDATE SET role = 'LANDLORD', kyc_status = 'APPROVED', kyc_approved_at = NOW();

  INSERT INTO public.profiles (id, full_name, role, kyc_status, kyc_approved_at)
  VALUES (v_tenant_user_id, 'Demo Tenant', 'TENANT', 'APPROVED', NOW())
  ON CONFLICT (id) DO UPDATE SET kyc_status = 'APPROVED', kyc_approved_at = NOW();

  INSERT INTO public.landlord_profiles (user_id, business_name, partner_status)
  VALUES (v_landlord_user_id, 'Windhoek Central Rentals', 'APPROVED')
  ON CONFLICT (user_id) DO UPDATE SET business_name = EXCLUDED.business_name, partner_status = 'APPROVED';

  SELECT id INTO v_landlord_profile_id FROM public.landlord_profiles WHERE user_id = v_landlord_user_id;

  SELECT id INTO v_property_id
  FROM public.properties
  WHERE landlord_id = v_landlord_profile_id AND property_name = 'Klein Windhoek Apartments'
  LIMIT 1;

  IF v_property_id IS NULL THEN
    INSERT INTO public.properties (
      landlord_id, property_name, address_street, address_suburb, address_city, property_type
    )
    VALUES (
      v_landlord_profile_id,
      'Klein Windhoek Apartments',
      '15 Independence Ave',
      'Klein Windhoek',
      'Windhoek',
      'APARTMENT'
    )
    RETURNING id INTO v_property_id;
  END IF;

  SELECT id INTO v_unit_id
  FROM public.units
  WHERE property_id = v_property_id AND unit_identifier = 'Unit 4B'
  LIMIT 1;

  IF v_unit_id IS NULL THEN
    INSERT INTO public.units (property_id, unit_identifier, bedrooms, bathrooms, monthly_rent, is_occupied)
    VALUES (v_property_id, 'Unit 4B', 2, 1, v_monthly_rent, false)
    RETURNING id INTO v_unit_id;
  END IF;

  SELECT id INTO v_lease_id
  FROM public.leases
  WHERE tenant_id = v_tenant_user_id AND status = 'ACTIVE'
  LIMIT 1;

  IF v_lease_id IS NULL THEN
    INSERT INTO public.leases (unit_id, tenant_id, landlord_id, start_date, monthly_rent, status)
    VALUES (v_unit_id, v_tenant_user_id, v_landlord_profile_id, CURRENT_DATE - INTERVAL '6 months', v_monthly_rent, 'ACTIVE')
    RETURNING id INTO v_lease_id;

    UPDATE public.units SET is_occupied = true WHERE id = v_unit_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.payments WHERE lease_id = v_lease_id AND status = 'PAID'
  ) THEN
    INSERT INTO public.payments (
      lease_id, tenant_id, landlord_id, unit_id,
      amount_gross, commission_rate, commission_amount, amount_net,
      due_date, paid_date, payment_method, status, is_simulated
    )
    VALUES (
      v_lease_id, v_tenant_user_id, v_landlord_profile_id, v_unit_id,
      v_monthly_rent, 0.01, v_monthly_rent * 0.01, v_monthly_rent * 0.99,
      CURRENT_DATE, NOW(), 'CARD', 'PAID', true
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.deposits WHERE lease_id = v_lease_id) THEN
    INSERT INTO public.deposits (lease_id, tenant_id, landlord_id, amount, status)
    VALUES (v_lease_id, v_tenant_user_id, v_landlord_profile_id, v_monthly_rent, 'HELD');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.credit_scores WHERE tenant_id = v_tenant_user_id AND is_current = true
  ) THEN
    INSERT INTO public.credit_scores (tenant_id, score, tier, calculation_date, is_current)
    VALUES (v_tenant_user_id, 712, 'GOOD', NOW(), true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.market_data_snapshots WHERE suburb = 'Klein Windhoek' AND city = 'Windhoek'
  ) THEN
    INSERT INTO public.market_data_snapshots (suburb, city, avg_rent, median_rent, sample_count)
    VALUES ('Klein Windhoek', 'Windhoek', 11800, 12500, 42);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.market_data_snapshots WHERE suburb = 'Olympia' AND city = 'Windhoek'
  ) THEN
    INSERT INTO public.market_data_snapshots (suburb, city, avg_rent, median_rent, sample_count)
    VALUES ('Olympia', 'Windhoek', 9200, 9500, 31);
  END IF;

  RAISE NOTICE 'RentCredit demo seed completed successfully.';
END $$;
