ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CARD', 'MOBILE_MONEY', 'EFT')),
  details JSONB DEFAULT '{}',
  last_four TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.auto_pay_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  payment_method_id UUID REFERENCES public.payment_methods(id),
  is_active BOOLEAN DEFAULT FALSE,
  pay_day_offset INTEGER DEFAULT 1,
  next_payment_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON public.payment_methods(user_id);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_pay_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own payment methods" ON public.payment_methods;
CREATE POLICY "Users manage own payment methods" ON public.payment_methods
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Tenants manage own auto pay" ON public.auto_pay_config;
CREATE POLICY "Tenants manage own auto pay" ON public.auto_pay_config
  FOR ALL USING (auth.uid() = tenant_id);
