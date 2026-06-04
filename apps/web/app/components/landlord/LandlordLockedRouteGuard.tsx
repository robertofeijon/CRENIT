'use client';

import Link from 'next/link';
import { Lock, ShieldCheck } from 'lucide-react';
import { LANDLORD_VERIFICATION_LOCK_REASON } from './landlordVerificationPaths';

type Props = {
  onOpenVerification: () => void;
};

export default function LandlordLockedRouteGuard({ onOpenVerification }: Props) {
  return (
    <div className="mx-auto max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FDEDEC]">
        <Lock className="h-7 w-7 text-[#C0392B]" aria-hidden />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-[#1A1A1A]">Verification required</h2>
      <p className="mt-2 text-sm text-slate-600">
        This section is locked until your partner identity and property details are verified.{' '}
        {LANDLORD_VERIFICATION_LOCK_REASON}.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onOpenVerification}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C0392B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#992d24]"
        >
          <ShieldCheck className="h-4 w-4" aria-hidden />
          Complete verification
        </button>
        <Link
          href="/landlord/overview"
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}
