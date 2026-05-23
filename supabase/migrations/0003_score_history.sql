-- Monthly credit score snapshots for history charts
CREATE TABLE IF NOT EXISTS public.score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 300 AND 900),
  tier TEXT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_score_history_tenant_recorded ON public.score_history(tenant_id, recorded_at DESC);

ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can view own score history" ON public.score_history
  FOR SELECT USING (auth.uid() = tenant_id);
