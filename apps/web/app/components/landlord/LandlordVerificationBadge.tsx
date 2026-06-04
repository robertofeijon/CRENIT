'use client';

export type VerificationDisplayStatus = 'UNVERIFIED' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';

const STYLES: Record<VerificationDisplayStatus, string> = {
  UNVERIFIED: 'bg-slate-100 text-slate-700 border-slate-200',
  PENDING_REVIEW: 'bg-amber-50 text-amber-900 border-amber-200',
  VERIFIED: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-900 border-red-200',
};

export default function LandlordVerificationBadge({ status }: { status: VerificationDisplayStatus }) {
  const label = status === 'PENDING_REVIEW' ? 'PENDING REVIEW' : status;
  return (
    <span
      className={`hidden rounded-full border px-3 py-1 text-[10px] font-bold tracking-wide sm:inline-block ${STYLES[status]}`}
    >
      {label}
    </span>
  );
}
