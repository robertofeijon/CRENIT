-- Phase 2 growth: EFT bank reference capture, tenant waitlist, bring-your-landlord referrals

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS eft_bank_code TEXT,
  ADD COLUMN IF NOT EXISTS eft_payment_reference TEXT;

CREATE TABLE IF NOT EXISTS public.tenant_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT,
  suburb TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'NOTIFIED', 'CONVERTED')),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_waitlist_email_suburb
  ON public.tenant_waitlist (lower(email), lower(suburb));

CREATE INDEX IF NOT EXISTS idx_tenant_waitlist_suburb_status
  ON public.tenant_waitlist (lower(suburb), status);

CREATE TABLE IF NOT EXISTS public.landlord_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tenant_email TEXT NOT NULL,
  tenant_name TEXT,
  landlord_email TEXT NOT NULL,
  landlord_name TEXT,
  suburb TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'EMAIL_SENT', 'REGISTERED', 'DECLINED')),
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landlord_referrals_landlord_email
  ON public.landlord_referrals (lower(landlord_email), status);
