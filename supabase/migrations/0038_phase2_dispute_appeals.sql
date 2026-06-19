-- Phase 2: dispute appeal window (5 business days after admin arbitration)

ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS appeal_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS appeal_status TEXT CHECK (appeal_status IN ('OPEN', 'FILED', 'CLOSED'));

CREATE INDEX IF NOT EXISTS idx_disputes_appeal_status ON public.disputes(appeal_status)
  WHERE appeal_status IS NOT NULL;
