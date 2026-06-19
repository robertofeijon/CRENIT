export const landlordInputClass =
  'w-full rounded-xl border border-[var(--rc-border,#e2e8f0)] bg-[var(--rc-card-alt,#f3f4f6)] px-4 py-3 text-sm text-[var(--rc-text,#1a1a1a)] outline-none transition focus:border-[#C0392B]/60';

export const landlordSelectClass = landlordInputClass;

export function formatN$(value: unknown) {
  return `N$${Number(value || 0).toLocaleString()}`;
}

export function statusPillClass(status: string) {
  const s = (status || '').toUpperCase();
  if (['PAID', 'VERIFIED', 'APPROVED', 'COMPLETED', 'ACTIVE', 'ACCEPTED'].includes(s)) {
    return 'bg-emerald-100 text-emerald-900';
  }
  if (['PENDING', 'PENDING_REVIEW', 'PROCESSING', 'UNDER_REVIEW', 'IN_PROGRESS'].includes(s)) {
    return 'bg-amber-100 text-amber-900';
  }
  if (['OVERDUE', 'REJECTED', 'FAILED', 'DISPUTED', 'TERMINATED'].includes(s)) {
    return 'bg-red-100 text-red-900';
  }
  return 'bg-slate-100 text-slate-800';
}
