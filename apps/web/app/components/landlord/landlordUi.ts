export const landlordInputClass =
  'w-full rounded-xl border border-slate-200 bg-[#F3F4F6] px-4 py-3 text-sm text-[#1A1A1A] outline-none transition focus:border-[#C0392B]/60';

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
