-- Human-readable score change annotations alongside history snapshots
ALTER TABLE public.score_history
  ADD COLUMN IF NOT EXISTS score_delta INTEGER;

COMMENT ON COLUMN public.score_history.event_reason IS 'Human-readable annotation e.g. "+6 points: March rent confirmed 2 days early"';
COMMENT ON COLUMN public.score_history.score_delta IS 'Display score (300-900) change vs previous snapshot when recorded';
