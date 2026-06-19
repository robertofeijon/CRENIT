-- Lease context on score history for multi-lease tenant timelines
ALTER TABLE public.score_history
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
