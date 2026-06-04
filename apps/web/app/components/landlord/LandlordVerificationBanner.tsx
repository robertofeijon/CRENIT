'use client';

import { ShieldCheck, X } from 'lucide-react';
import type { VerificationDisplayStatus } from './LandlordVerificationBadge';

type Props = {
  status: VerificationDisplayStatus;
  onOpenVerification: () => void;
  onDismiss: () => void;
  rejectionReason?: string | null;
};

export default function LandlordVerificationBanner({
  status,
  onOpenVerification,
  onDismiss,
  rejectionReason,
}: Props) {
  if (status === 'VERIFIED' || status === 'PENDING_REVIEW') return null;

  const isRejected = status === 'REJECTED';

  return (
    <div
      className={`mb-6 flex gap-3 rounded-[1.25rem] border p-4 sm:p-5 ${
        isRejected ? 'border-red-200 bg-red-50/90' : 'border-[#C0392B]/25 bg-[#FDEDEC]'
      }`}
    >
      <ShieldCheck
        className={`mt-0.5 h-5 w-5 shrink-0 ${isRejected ? 'text-red-800' : 'text-[#C0392B]'}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1 text-sm">
        <p className={`font-semibold ${isRejected ? 'text-red-950' : 'text-[#1A1A1A]'}`}>
          {isRejected ? 'Verification needs updates' : 'Complete partner verification'}
        </p>
        <p className={`mt-1 ${isRejected ? 'text-red-900/90' : 'text-slate-600'}`}>
          {isRejected
            ? rejectionReason || 'Some details or documents were rejected. Update and resubmit to unlock listings and payments.'
            : 'Verify your identity and property details to list properties, review tenant reports, and receive payments.'}
        </p>
        <button
          type="button"
          onClick={onOpenVerification}
          className="mt-3 rounded-full bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#111]"
        >
          {isRejected ? 'Fix and resubmit' : 'Start verification'}
        </button>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-white/60"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
