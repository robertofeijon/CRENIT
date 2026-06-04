export type PaymentRow = {
  status?: string | null;
  due_date?: string | null;
  paid_date?: string | null;
  days_overdue?: number | null;
};

export function isPaymentOnTime(payment: PaymentRow): boolean {
  if (payment.status !== 'PAID' && !payment.paid_date) return false;
  if (!payment.due_date) return Number(payment.days_overdue || 0) === 0;
  if (!payment.paid_date) return Number(payment.days_overdue || 0) === 0;
  const paid = new Date(payment.paid_date);
  const due = new Date(payment.due_date);
  if (Number.isNaN(paid.getTime()) || Number.isNaN(due.getTime())) {
    return Number(payment.days_overdue || 0) === 0;
  }
  return paid.getTime() <= due.getTime() || Number(payment.days_overdue || 0) === 0;
}

/** Consecutive on-time paid cycles from most recent due_date backward. */
export function computeConsecutiveOnTimeStreak(payments: PaymentRow[]): number {
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...payments]
    .filter((p) => p.due_date)
    .sort((a, b) => (b.due_date || '').localeCompare(a.due_date || ''));

  let streak = 0;
  for (const payment of sorted) {
    const due = payment.due_date!;
    const isPaid = payment.status === 'PAID' || Boolean(payment.paid_date);
    if (isPaid) {
      if (isPaymentOnTime(payment)) {
        streak += 1;
        continue;
      }
      break;
    }
    if (due > today) {
      continue;
    }
    break;
  }
  return streak;
}

/** On-time % among payments due in the last `monthsBack` months (settled = PAID). */
export function computeOnTimeRatePct(payments: PaymentRow[], monthsBack = 12): number {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const eligible = payments.filter((p) => {
    if (!p.due_date || p.due_date < cutoffKey) return false;
    const isPaid = p.status === 'PAID' || Boolean(p.paid_date);
    return isPaid || p.due_date <= today;
  });

  const settled = eligible.filter((p) => p.status === 'PAID' || Boolean(p.paid_date));
  if (!settled.length) return 0;

  const onTime = settled.filter(isPaymentOnTime).length;
  return Math.round((onTime / settled.length) * 100);
}

export function buildPaymentMetrics(payments: PaymentRow[], monthsBack = 12) {
  const consecutive_on_time_streak = computeConsecutiveOnTimeStreak(payments);
  const on_time_rate_pct = computeOnTimeRatePct(payments, monthsBack);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  const payments_in_window = payments.filter((p) => p.due_date && p.due_date >= cutoffKey).length;
  const on_time_payments_in_window = payments.filter(
    (p) => p.due_date && p.due_date >= cutoffKey && (p.status === 'PAID' || p.paid_date) && isPaymentOnTime(p),
  ).length;

  return {
    consecutive_on_time_streak,
    on_time_rate_pct,
    payments_in_window,
    on_time_payments_in_window,
    window_months: monthsBack,
  };
}
