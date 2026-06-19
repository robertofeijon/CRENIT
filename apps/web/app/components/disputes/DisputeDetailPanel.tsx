'use client';

import DisputeTimeline from './DisputeTimeline';
import { statusPillClass } from '../tenant/tenantUi';

type DisputeView = {
  id: string;
  status: string;
  claim_description?: string;
  dispute_type?: string;
  next_step?: string;
  estimated_resolution_by?: string;
  appeal_deadline?: string;
  can_appeal?: boolean;
  template?: { label: string; description: string; checklist: string[]; eta_days: number };
  evidence?: { id: string; file_name?: string; description?: string; uploaded_at?: string }[];
  timeline?: { event_type: string; message: string; created_at: string }[];
};

type Props = {
  dispute: DisputeView;
  onAppeal?: (reason: string) => Promise<void>;
  appealLoading?: boolean;
  appealReason?: string;
  onAppealReasonChange?: (value: string) => void;
};

export default function DisputeDetailPanel({
  dispute,
  onAppeal,
  appealLoading = false,
  appealReason = '',
  onAppealReasonChange,
}: Props) {
  return (
    <div className="space-y-4 rounded-xl border border-[var(--rc-border,#e2e8f0)] bg-[var(--rc-card-alt,#f3f4f6)] p-4 text-sm">
      <div>
        <p className="font-mono text-xs text-slate-500">{dispute.id}</p>
        <p className="mt-2">
          Status:{' '}
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusPillClass(dispute.status)}`}>
            {dispute.status}
          </span>
        </p>
        {dispute.template?.label ? (
          <p className="mt-2 text-sm font-semibold text-[#1A1A1A]">
            {dispute.template.label}
            {dispute.dispute_type ? (
              <span className="ml-2 text-xs font-normal uppercase tracking-wide text-slate-500">{dispute.dispute_type.replace(/_/g, ' ')}</span>
            ) : null}
          </p>
        ) : null}
        {dispute.template?.description ? <p className="mt-1 text-slate-600">{dispute.template.description}</p> : null}
        {dispute.claim_description ? <p className="mt-2 text-[#1A1A1A]">{dispute.claim_description}</p> : null}
        {dispute.next_step ? <p className="mt-2 text-slate-600">Next: {dispute.next_step}</p> : null}
        {dispute.estimated_resolution_by ? (
          <p className="text-xs text-slate-500">
            Est. resolution by {new Date(dispute.estimated_resolution_by).toLocaleDateString()}
            {dispute.template?.eta_days ? ` (~${dispute.template.eta_days} business days from open)` : ''}
          </p>
        ) : null}
      </div>

      {dispute.template?.checklist?.length ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Evidence checklist</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
            {dispute.template.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {dispute.evidence?.length ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Submitted evidence</h3>
          <ul className="mt-2 space-y-2">
            {dispute.evidence.map((ev) => (
              <li key={ev.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                <p className="font-semibold text-[#1A1A1A]">{ev.file_name || 'Attachment'}</p>
                {ev.description ? <p className="mt-1">{ev.description}</p> : null}
                {ev.uploaded_at ? <p className="mt-1 text-slate-400">{new Date(ev.uploaded_at).toLocaleString()}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Timeline</h3>
        <DisputeTimeline timeline={dispute.timeline || []} className="mt-3" />
      </div>

      {dispute.can_appeal && onAppeal ? (
        <div className="border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C0392B]">Appeal window</p>
          {dispute.appeal_deadline ? (
            <p className="mt-1 text-xs text-slate-600">
              Request senior review by {new Date(dispute.appeal_deadline).toLocaleDateString()}.
            </p>
          ) : null}
          <textarea
            value={appealReason}
            onChange={(e) => onAppealReasonChange?.(e.target.value)}
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#C0392B]/60"
            placeholder="Why should this outcome be reviewed?"
            rows={3}
          />
          <button
            type="button"
            className="mt-3 w-full rounded-full bg-[#C0392B] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            disabled={appealLoading}
            onClick={() => void onAppeal(appealReason)}
          >
            {appealLoading ? 'Submitting…' : 'File appeal'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
