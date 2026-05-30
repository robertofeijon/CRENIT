-- Tenant profile fields, admin account flags, signed lease doc type, optional property erf

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS surname text,
  ADD COLUMN IF NOT EXISTS account_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS account_flag_note text,
  ADD COLUMN IF NOT EXISTS account_flagged_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_flagged_by uuid REFERENCES public.profiles(id);

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS erf_number text;

COMMENT ON COLUMN public.profiles.account_flagged IS 'Admin flag for review — does not auto-suspend';

ALTER TABLE public.landlord_profiles
  ADD COLUMN IF NOT EXISTS monthly_data_fee numeric(12,2) DEFAULT 0;

COMMENT ON COLUMN public.landlord_profiles.monthly_data_fee IS 'Monthly fee for payment data recording (CRENIT revenue model)';
