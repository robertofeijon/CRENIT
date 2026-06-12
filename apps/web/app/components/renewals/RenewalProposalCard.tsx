'use client';

import { formatN$, statusPillClass, tenantInputClass } from '../tenant/tenantUi';
import { landlordInputClass } from '../landlord/landlordUi';
import {
  formatRenewalDate,
  isRenewalActionable,
  renewalStatusHint,
  renewalStatusLabel,
  type RenewalProposal,
} from '../../../src/lib/renewalUi';

type CounterState = { proposed_rent: string; proposed_end_date: string };

type RenewalProposalCardProps = {
  renewal: RenewalProposal;
  role: 'tenant' | 'landlord';
  counter: CounterState;
  onCounterChange: (patch: Partial<CounterState>) => void;
  onApprove: () => void | Promise<void>;
  onReject: () => void | Promise<void>;
  onCounter: () => void | Promise<void>;
  busy?: boolean;
  approveLabel?: string;
  rejectLabel?: string;
};

export default function RenewalProposalCard({
  renewal,
  role,
  counter,
  onCounterChange,
  onApprove,
  onReject,
  onCounter,
  busy = false,
  approveLabel = role === 'tenant' ? 'Accept' : 'Approve',
  rejectLabel = role === 'tenant' ? 'Decline' : 'Reject',
}: RenewalProposalCardProps) {
  const inputClass = role === 'tenant' ? tenantInputClass : landlordInputClass;
  const btnSecondary = role === 'tenant' ? 'tenant-btn-secondary' : 'landlord-btn-secondary';
  const btnPrimary = role === 'tenant' ? 'tenant-btn-primary' : 'landlord-btn-primary bg-emerald-600 hover:bg-emerald-700';
  const actionable = isRenewalActionable(renewal.status);

  return (
    <article
      className={`rounded-xl border p-4 ${actionable ? 'border-[#C0392B]/25 bg-gradient-to-br from-white to-[#FDEDEC]/20' : 'border-slate-100 bg-[#F3F4F6]'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {role === 'landlord' && renewal.lease_id ? (
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Lease {renewal.lease_id.slice(0, 8)}…</p>
          ) : null}
          <p className="text-sm font-semibold text-[#1A1A1A]">
            Current term ends {formatRenewalDate(renewal.current_end_date)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Proposed end {formatRenewalDate(renewal.proposed_end_date)} · {formatN$(renewal.proposed_rent)}
          </p>
          <p className="mt-2 text-xs text-slate-500">{renewalStatusHint(renewal.status, role)}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClass(renewal.status)}`}>
          {renewalStatusLabel(renewal.status)}
        </span>
      </div>

      {actionable ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-600">
              Counter rent (optional)
              <input
                type="number"
                min={0}
                disabled={busy}
                value={counter.proposed_rent}
                onChange={(e) => onCounterChange({ proposed_rent: e.target.value })}
                className={`${inputClass} mt-1`}
                placeholder="e.g. 8500"
              />
            </label>
            <label className="block text-xs font-medium text-slate-600">
              Counter end date
              <input
                type="date"
                disabled={busy}
                value={counter.proposed_end_date}
                onChange={(e) => onCounterChange({ proposed_end_date: e.target.value })}
                className={`${inputClass} mt-1`}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void onCounter()} className={`${btnSecondary} ${role === 'landlord' ? 'py-2 text-xs' : ''}`}>
              {busy ? 'Sending…' : 'Send counter'}
            </button>
            <button type="button" disabled={busy} onClick={() => void onApprove()} className={`${btnPrimary} ${role === 'landlord' ? 'py-2 text-xs' : ''}`}>
              {busy ? 'Saving…' : approveLabel}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onReject()}
              className={`rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60 ${role === 'landlord' ? 'text-xs' : ''}`}
            >
              {rejectLabel}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
