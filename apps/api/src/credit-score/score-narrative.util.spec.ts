import { describe, expect, it } from 'vitest';
import { buildScoreAnnotation, daysRelativeToDue, formatScoreDelta, monthLabelFromDate } from './score-narrative.util';

describe('score-narrative.util', () => {
  it('formats positive and negative deltas', () => {
    expect(formatScoreDelta(6)).toBe('+6 points');
    expect(formatScoreDelta(-3)).toBe('-3 points');
    expect(formatScoreDelta(0)).toBe('0 points');
  });

  it('builds payment confirmed early annotation', () => {
    const text = buildScoreAnnotation({
      event_type: 'PAYMENT_CONFIRMED',
      score_delta: 6,
      due_date: '2026-03-05',
      paid_date: '2026-03-03',
    });
    expect(text).toContain('+6 points');
    expect(text).toContain('March 2026');
    expect(text).toContain('2 days early');
  });

  it('builds auto-confirm annotation', () => {
    const text = buildScoreAnnotation({
      event_type: 'AUTO_CONFIRM',
      score_delta: 4,
      due_date: '2026-01-01',
    });
    expect(text).toContain('auto-confirmed');
    expect(text).toContain('+4 points');
  });

  it('builds dispute resolved annotation', () => {
    const text = buildScoreAnnotation({
      event_type: 'DISPUTE_RESOLVED',
      score_delta: 0,
      dispute_type: 'DAMAGE_CLAIM',
      decision: 'tenant_wins',
    });
    expect(text).toContain('0 points');
    expect(text).toContain('damage claim');
    expect(text).toContain('tenant wins');
  });

  it('computes days early relative to due date', () => {
    expect(daysRelativeToDue('2026-03-10', '2026-03-08')).toEqual({ early: 2, late: 0 });
    expect(daysRelativeToDue('2026-03-10', '2026-03-12')).toEqual({ early: 0, late: 2 });
  });

  it('monthLabelFromDate handles ISO dates', () => {
    expect(monthLabelFromDate('2026-03-15')).toContain('March');
  });
});
