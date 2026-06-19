export type ScoreEventType =
  | 'PAYMENT_CONFIRMED'
  | 'AUTO_CONFIRM'
  | 'DISPUTE_RESOLVED'
  | 'IMPORT_HISTORY'
  | 'CALCULATED'
  | 'MANUAL_RECALC';

export type ScoreNarrativeInput = {
  event_type: ScoreEventType;
  score_delta: number;
  due_date?: string | null;
  paid_date?: string | null;
  dispute_type?: string | null;
  decision?: string | null;
};

export function formatScoreDelta(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta} points`;
}

export function monthLabelFromDate(iso?: string | null): string {
  if (!iso) return 'Recent';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function daysRelativeToDue(due?: string | null, paid?: string | null): { early: number; late: number } {
  if (!due || !paid) return { early: 0, late: 0 };
  const dueMs = Date.parse(due.slice(0, 10));
  const paidMs = Date.parse(paid.slice(0, 10));
  if (Number.isNaN(dueMs) || Number.isNaN(paidMs)) return { early: 0, late: 0 };
  const diffDays = Math.round((dueMs - paidMs) / 86400000);
  if (diffDays > 0) return { early: diffDays, late: 0 };
  if (diffDays < 0) return { early: 0, late: Math.abs(diffDays) };
  return { early: 0, late: 0 };
}

export function buildScoreAnnotation(input: ScoreNarrativeInput): string {
  const delta = formatScoreDelta(input.score_delta);

  switch (input.event_type) {
    case 'AUTO_CONFIRM': {
      const month = monthLabelFromDate(input.due_date);
      return `${delta}: ${month} rent auto-confirmed after landlord review window`;
    }
    case 'PAYMENT_CONFIRMED': {
      const month = monthLabelFromDate(input.due_date);
      const { early, late } = daysRelativeToDue(input.due_date, input.paid_date);
      if (early > 0) return `${delta}: ${month} rent confirmed ${early} day${early === 1 ? '' : 's'} early`;
      if (late > 0) return `${delta}: ${month} rent confirmed ${late} day${late === 1 ? '' : 's'} late`;
      return `${delta}: ${month} rent confirmed on time`;
    }
    case 'DISPUTE_RESOLVED': {
      const type = (input.dispute_type || 'deposit dispute').replace(/_/g, ' ').toLowerCase();
      const outcome = (input.decision || 'closed').replace(/_/g, ' ');
      return `${delta}: ${type} resolved — ${outcome}`;
    }
    case 'IMPORT_HISTORY':
      return `${delta}: verified historical rent payments imported after admin review`;
    case 'MANUAL_RECALC':
      return input.score_delta !== 0
        ? `${delta}: score recalculated from your latest payment data`
        : 'Score recalculated — no change from previous snapshot';
    default:
      return input.score_delta !== 0 ? `${delta}: score updated` : 'Score snapshot recorded';
  }
}
