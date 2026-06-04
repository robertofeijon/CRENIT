'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

export type PartnerBannerState = {
  partnerStatus?: string;
  awaitingDirectConfirmations?: number;
  businessName?: string;
};

import type { VerificationDisplayStatus } from './LandlordVerificationBadge';

export default function LandlordPartnerBanner({
  state,
  verificationStatus,
}: {
  state: PartnerBannerState | null;
  verificationStatus?: VerificationDisplayStatus;
}) {
  if (!state) return null;

  const status = (state.partnerStatus || '').toUpperCase();
  const pendingApproval =
    verificationStatus === 'PENDING_REVIEW' ||
    status === 'PENDING_REVIEW' ||
    status === 'PENDING_APPROVAL' ||
    status === 'PENDING';
  const suspended = status === 'SUSPENDED';
  const awaitingDirect = Number(state.awaitingDirectConfirmations || 0) > 0;

  if (!pendingApproval && !suspended && !awaitingDirect) return null;

  return (
    <div className="mb-6 space-y-3">
      {pendingApproval ? (
        <div className="flex gap-3 rounded-[1.25rem] border border-amber-200 bg-amber-50/90 p-4 sm:p-5">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" aria-hidden />
          <div className="text-sm text-amber-950">
            <p className="font-semibold">Partner review in progress</p>
            <p className="mt-1 text-amber-900/90">
              {state.businessName ? `${state.businessName} is` : 'Your account is'} being verified by CRENIT. Some
              features may be limited until approval.
            </p>
            <p className="mt-2 text-xs text-amber-800/80">Use the verification panel from your overview banner to check status.</p>
          </div>
        </div>
      ) : null}

      {suspended ? (
        <div className="flex gap-3 rounded-[1.25rem] border border-red-200 bg-red-50 p-4 sm:p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-800" aria-hidden />
          <div className="text-sm text-red-950">
            <p className="font-semibold">Partner account suspended</p>
            <p className="mt-1">Contact CRENIT support to restore access.</p>
          </div>
        </div>
      ) : null}

      {awaitingDirect ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-sky-200 bg-sky-50/90 p-4 sm:p-5">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-800" aria-hidden />
            <p className="text-sm font-medium text-sky-950">
              {state.awaitingDirectConfirmations} direct payment
              {state.awaitingDirectConfirmations === 1 ? '' : 's'} need your confirmation.
            </p>
          </div>
          <Link
            href="/landlord/payments?payment_method=DIRECT&status=PENDING"
            className="rounded-full bg-[#1A1A1A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#111]"
          >
            Review payments
          </Link>
        </div>
      ) : null}
    </div>
  );
}
