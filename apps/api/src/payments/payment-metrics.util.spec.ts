import { describe, expect, it } from 'vitest';
import {
  buildPaymentMetrics,
  computeConsecutiveOnTimeStreak,
  computeOnTimeRatePct,
  isPaymentOnTime,
} from './payment-metrics.util';

describe('isPaymentOnTime', () => {
  it('returns true when paid on or before due date', () => {
    expect(
      isPaymentOnTime({
        status: 'PAID',
        due_date: '2026-03-01',
        paid_date: '2026-02-28',
        days_overdue: 0,
      }),
    ).toBe(true);
  });

  it('returns false for unpaid overdue', () => {
    expect(
      isPaymentOnTime({
        status: 'OVERDUE',
        due_date: '2026-01-01',
        paid_date: null,
        days_overdue: 5,
      }),
    ).toBe(false);
  });
});

describe('computeConsecutiveOnTimeStreak', () => {
  it('counts consecutive on-time paid months from newest due date', () => {
    const payments = [
      { status: 'PAID', due_date: '2026-05-01', paid_date: '2026-04-30', days_overdue: 0 },
      { status: 'PAID', due_date: '2026-04-01', paid_date: '2026-04-01', days_overdue: 0 },
      { status: 'PAID', due_date: '2026-03-01', paid_date: '2026-03-10', days_overdue: 9 },
    ];
    expect(computeConsecutiveOnTimeStreak(payments)).toBe(2);
  });

  it('stops streak on missed past-due cycle', () => {
    const payments = [
      { status: 'PENDING', due_date: '2026-04-01', paid_date: null, days_overdue: 0 },
      { status: 'PAID', due_date: '2026-03-01', paid_date: '2026-03-01', days_overdue: 0 },
    ];
    const today = new Date();
    const due = '2026-04-01';
    if (due <= today.toISOString().slice(0, 10)) {
      expect(computeConsecutiveOnTimeStreak(payments)).toBe(0);
    }
  });
});

describe('computeOnTimeRatePct', () => {
  it('returns 100 when all settled payments are on time', () => {
    const payments = [
      { status: 'PAID', due_date: '2026-02-01', paid_date: '2026-02-01', days_overdue: 0 },
      { status: 'PAID', due_date: '2026-01-01', paid_date: '2026-01-01', days_overdue: 0 },
    ];
    expect(computeOnTimeRatePct(payments, 12)).toBe(100);
  });
});

describe('buildPaymentMetrics', () => {
  it('returns streak and rate fields', () => {
    const m = buildPaymentMetrics([
      { status: 'PAID', due_date: '2026-02-01', paid_date: '2026-02-01', days_overdue: 0 },
    ]);
    expect(m).toMatchObject({
      consecutive_on_time_streak: expect.any(Number),
      on_time_rate_pct: expect.any(Number),
      window_months: 12,
    });
  });
});
