'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import DocumentInlinePreview from '../../components/kyc/DocumentInlinePreview';

const TENANT_REJECT_DOC_OPTIONS: Array<{ api: string; label: string }> = [
  { api: 'government_id', label: 'Government ID' },
  { api: 'selfie', label: 'Selfie' },
  { api: 'income_proof', label: 'Proof of income' },
  { api: 'proof_of_address', label: 'Proof of address' },
];

const LANDLORD_REJECT_DOC_OPTIONS: Array<{ api: string; label: string }> = [
  { api: 'government_id', label: 'Government ID' },
  { api: 'company_registration', label: 'Company registration' },
  { api: 'proof_of_address', label: 'Proof of address' },
  { api: 'proof_of_property_ownership', label: 'Proof of property ownership' },
  { api: 'selfie', label: 'Selfie' },
];

function formatResidence(res?: Record<string, string | undefined> | null) {
  if (!res) return '—';
  return [res.street_address, res.city, res.region, res.country, res.postal_code].filter(Boolean).join(', ') || '—';
}
export default function AdminKycPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [applicantTab, setApplicantTab] = useState<'TENANT' | 'LANDLORD'>('TENANT');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectedDocTypes, setRejectedDocTypes] = useState<string[]>(
    TENANT_REJECT_DOC_OPTIONS.map((d) => d.api),
  );
  const [auditByUser, setAuditByUser] = useState<Record<string, any[]>>({});
  const [auditLoadingUserId, setAuditLoadingUserId] = useState<string | null>(null);
  const [detailLoadingUserId, setDetailLoadingUserId] = useState<string | null>(null);
  const [kycDetail, setKycDetail] = useState<any | null>(null);
  const [fraudFlagCount, setFraudFlagCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  const rejectDocOptions = applicantTab === 'LANDLORD' ? LANDLORD_REJECT_DOC_OPTIONS : TENANT_REJECT_DOC_OPTIONS;

  const loadQueue = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    if (!silent) setError(null);
    try {
      const res = await api.get(
        `/admin/kyc/pending?status=PENDING&limit=20&applicant_role=${applicantTab}`,
      );
      setSubmissions(res.data.data.submissions || []);
    } catch (err: any) {
      if (!silent) setError(err?.response?.data?.message || err?.message || 'Unable to load KYC submissions.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [applicantTab]);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      void loadQueue();
    }
  }, [user, role, loadQueue]);

  useEffect(() => {
    if (!user || role !== 'ADMIN') return;
    api
      .get('/admin/fraud/flags')
      .then((res) => setFraudFlagCount(Array.isArray(res.data?.data) ? res.data.data.length : 0))
      .catch(() => setFraudFlagCount(0));
  }, [user, role, submissions]);

  useEffect(() => {
    if (!user || role !== 'ADMIN') return;
    const interval = setInterval(() => void loadQueue(true), 5000);
    return () => clearInterval(interval);
  }, [user, role, loadQueue]);

  const handleReview = async (userId: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) {
      setError('A rejection reason is required.');
      return;
    }
    if (action === 'reject' && !rejectedDocTypes.length) {
      setError('Select at least one document that requires re-upload.');
      return;
    }

    setActionLoadingId(userId);
    setError(null);
    setActionMessage(null);

    try {
      await api.post(`/admin/kyc/review/${userId}`, {
        action,
        reason: action === 'reject' ? rejectionReason.trim() : undefined,
        rejected_doc_types: action === 'reject' ? rejectedDocTypes : undefined,
      });
      setActionMessage(action === 'approve' ? 'KYC approved. Tenant notified by email.' : 'KYC rejected. Tenant notified by email.');
      setRejectingUserId(null);
      setRejectionReason('');
      setRejectedDocTypes(rejectDocOptions.map((d) => d.api));
      await loadQueue();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to update KYC status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const loadAuditLog = async (userId: string) => {
    setAuditLoadingUserId(userId);
    try {
      const res = await api.get(`/admin/kyc/audit/${userId}?limit=20`);
      setAuditByUser((prev) => ({ ...prev, [userId]: res.data?.data || [] }));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load KYC audit log.');
    } finally {
      setAuditLoadingUserId(null);
    }
  };

  const loadKycDetail = async (userId: string) => {
    setDetailLoadingUserId(userId);
    try {
      const res = await api.get(`/admin/kyc/detail/${userId}`);
      setKycDetail(res.data?.data || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load KYC verification detail.');
    } finally {
      setDetailLoadingUserId(null);
    }
  };


  return (
    <div className="space-y-6">
      <AdminPageHeader
        badge="Compliance"
        title="KYC review queue"
        subtitle="Pending tenant and landlord verifications — auto-refreshes every 5 seconds."
        actions={
          <button
            type="button"
            onClick={() => void loadQueue()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh queue
          </button>
        }
      />

      {fraudFlagCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              <strong>{fraudFlagCount}</strong> active fraud flag{fraudFlagCount === 1 ? '' : 's'} (confirm-rate anomalies, self-dealing, LOCATION_MISMATCH) awaiting review.
            </span>
          </p>
          <Link href="/admin/kyc/compliance" className="font-semibold text-[#C0392B] hover:underline">
            Open fraud queue →
          </Link>
        </div>
      ) : null}

      <div className="flex gap-2 rounded-full border border-slate-200 bg-white p-1 w-fit">
        {(['TENANT', 'LANDLORD'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setApplicantTab(tab);
              setRejectedDocTypes(
                (tab === 'LANDLORD' ? LANDLORD_REJECT_DOC_OPTIONS : TENANT_REJECT_DOC_OPTIONS).map((d) => d.api),
              );
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              applicantTab === tab ? 'bg-[#1A1A1A] text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab === 'TENANT' ? 'Tenants' : 'Landlords'}
          </button>
        ))}
      </div>

      {error ? <ErrorStateCard message={error} onRetry={loadQueue} /> : null}
      {actionMessage ? <p className="text-sm font-medium text-emerald-700">{actionMessage}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          {isLoading ? (
            <SkeletonBlocks rows={3} />
          ) : submissions.length ? (
            submissions.map((submission) => (
              <article
                key={submission.user_id}
                className={`admin-list-item ${submission.location_mismatch ? 'border-red-400 ring-2 ring-red-200' : ''}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-[#1A1A1A]">{submission.user_name}</p>
                    <p className="mt-1 text-sm text-slate-600">{submission.user_email}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
                    {submission.status}
                  </span>
                </div>

                {submission.location_mismatch ? (
                  <div className="mt-4 flex gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                    <div>
                      <p className="font-semibold">LOCATION_MISMATCH</p>
                      <p className="mt-1">Tenant and landlord residence records do not meet the similarity threshold.</p>
                    </div>
                  </div>
                ) : null}

                {submission.personal ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-[#F3F4F6] p-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Personal information</p>
                    <p className="mt-2">
                      {submission.personal.first_name} {submission.personal.surname} · DOB{' '}
                      {submission.personal.date_of_birth || '—'} · {submission.personal.gender || '—'}
                    </p>
                    <p className="mt-1">
                      {submission.personal.nationality || '—'} · {submission.personal.phone || '—'}
                    </p>
                  </div>
                ) : null}

                {submission.landlord_details ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                      <p className="font-semibold text-[#1A1A1A]">Account</p>
                      <p className="mt-2 text-slate-600">
                        {submission.landlord_details.account_type === 'COMPANY' ? 'Property management company' : 'Individual landlord'}
                      </p>
                      {submission.landlord_details.company_name ? (
                        <p className="mt-1 text-slate-600">{submission.landlord_details.company_name}</p>
                      ) : null}
                      {submission.landlord_details.registration_number ? (
                        <p className="mt-1 text-slate-500">Reg: {submission.landlord_details.registration_number}</p>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                      <p className="font-semibold text-[#1A1A1A]">Property portfolio</p>
                      <p className="mt-2 text-slate-600">
                        {submission.landlord_details.properties_managed_count ?? '—'} properties ·{' '}
                        {submission.landlord_details.ownership_status || '—'}
                      </p>
                      <p className="mt-2 text-slate-600">
                        {formatResidence(submission.landlord_details.property)}
                      </p>
                    </div>
                  </div>
                ) : null}

                {submission.location_comparison ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                      <p className="font-semibold text-[#1A1A1A]">Tenant entered</p>
                      <p className="mt-2 text-slate-600">{formatResidence(submission.location_comparison.tenant)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                      <p className="font-semibold text-[#1A1A1A]">
                        {submission.location_comparison.landlord_reference_label || 'Landlord reference'}
                      </p>
                      <p className="mt-2 text-slate-600">{formatResidence(submission.location_comparison.landlord)}</p>
                      {submission.location_comparison.landlord_reference_source ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Source: {submission.location_comparison.landlord_reference_source}
                        </p>
                      ) : null}
                    </div>
                    <p className="sm:col-span-2 text-xs text-slate-500">
                      Match score:{' '}
                      {submission.location_comparison.compared
                        ? `${Math.round((submission.location_comparison.score || 0) * 100)}%`
                        : 'No landlord reference on file'}
                    </p>
                  </div>
                ) : null}

                {submission.quality_flags?.length ? (
                  <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                    <div>
                      <p className="font-semibold">Review carefully</p>
                      <ul className="mt-1 space-y-1">
                        {submission.quality_flags.map((flag: any) => (
                          <li key={flag.id}>
                            {flag.flag_type}: {flag.flag_note || 'Flagged for manual review'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}

                <p className="mt-4 text-sm text-slate-600">
                  Submitted:{' '}
                  {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '—'}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void loadAuditLog(submission.user_id)}
                    disabled={auditLoadingUserId === submission.user_id}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {auditLoadingUserId === submission.user_id ? 'Loading audit…' : 'Audit trail'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadKycDetail(submission.user_id)}
                    disabled={detailLoadingUserId === submission.user_id}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {detailLoadingUserId === submission.user_id ? 'Loading detail…' : 'Open detail panel'}
                  </button>
                </div>

                {auditByUser[submission.user_id]?.length ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-[#F3F4F6] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">KYC audit trail</p>
                    <div className="mt-3 space-y-2">
                      {auditByUser[submission.user_id].map((row: any) => (
                        <div key={row.id} className="rounded-lg bg-white p-3 text-xs text-slate-700">
                          <p className="font-semibold">{row.action}</p>
                          <p className="mt-1">
                            {row.previous_status || 'N/A'} → {row.next_status || 'N/A'}
                          </p>
                          {row.reason ? <p className="mt-1">Reason: {row.reason}</p> : null}
                          <p className="mt-1 text-slate-500">{new Date(row.created_at).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {(submission.documents || []).map((doc: any) => (
                    <div key={`${doc.type}-${doc.file_name}-${doc.uploaded_at}`} className="rounded-xl border border-slate-200 bg-[#F3F4F6] p-4">
                      <p className="font-semibold text-[#1A1A1A]">{doc.file_name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Type: {doc.type} · {doc.status || 'PENDING'}
                      </p>
                      {doc.file_url ? (
                        <div className="mt-3">
                          <DocumentInlinePreview url={doc.file_url} fileName={doc.file_name} />
                        </div>
                      ) : null}
                      {doc.file_url ? (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-xs font-semibold text-[#C0392B] hover:underline"
                        >
                          Open in new tab
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>

                {rejectingUserId === submission.user_id ? (
                  <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-[#F3F4F6] p-4">
                    <label className="block text-sm font-medium text-slate-700">Rejection reason</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(event) => setRejectionReason(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#C0392B]/60"
                      rows={3}
                      placeholder="Explain why this submission was rejected (required)"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Documents requiring re-upload</p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {rejectDocOptions.map((opt) => (
                          <label key={opt.api} className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={rejectedDocTypes.includes(opt.api)}
                              onChange={(e) => {
                                setRejectedDocTypes((prev) =>
                                  e.target.checked ? [...prev, opt.api] : prev.filter((t) => t !== opt.api),
                                );
                              }}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleReview(submission.user_id, 'reject')}
                        disabled={actionLoadingId === submission.user_id}
                        className="inline-flex items-center gap-2 rounded-full bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" aria-hidden />
                        Confirm rejection
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingUserId(null);
                          setRejectionReason('');
                        }}
                        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleReview(submission.user_id, 'approve')}
                      disabled={actionLoadingId === submission.user_id}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      Approve KYC
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingUserId(submission.user_id);
                        setRejectionReason('');
                        setRejectedDocTypes(rejectDocOptions.map((d) => d.api));
                      }}
                      disabled={actionLoadingId === submission.user_id}
                      className="inline-flex items-center gap-2 rounded-full border border-[#C0392B]/40 bg-white px-4 py-2.5 text-sm font-semibold text-[#C0392B]"
                    >
                      <XCircle className="h-4 w-4" aria-hidden />
                      Reject KYC
                    </button>
                  </div>
                )}
              </article>
            ))
          ) : (
            <EmptyStateCard
              title="Queue is clear"
              description="No pending KYC submissions. Tenants with status PENDING will appear here."
            />
          )}
        </div>

        <aside className="admin-panel h-fit">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Verification detail</h2>
          <p className="mt-2 text-sm text-slate-500">Select a user to view verification state, documents, and flags.</p>
          {!kycDetail ? (
            <p className="mt-4 text-sm text-slate-500">No verification selected.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-[#F3F4F6] p-4 text-sm">
                <p className="font-semibold text-[#1A1A1A]">{kycDetail.profile?.full_name || 'Unknown user'}</p>
                <p className="mt-1 text-slate-600">
                  Status: {kycDetail.verification?.status || kycDetail.profile?.kyc_status || 'N/A'}
                </p>
                <p className="text-slate-600">Reviewer: {kycDetail.verification?.reviewer_name || 'Pending'}</p>
                <p className="text-slate-600">
                  Submitted:{' '}
                  {kycDetail.verification?.submitted_at
                    ? new Date(kycDetail.verification.submitted_at).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Documents</p>
                <div className="mt-2 space-y-2">
                  {(kycDetail.documents || []).slice(0, 5).map((doc: any) => (
                    <div key={doc.id} className="rounded-lg border border-slate-200 bg-white p-2">
                      <p className="text-xs font-medium text-slate-700">
                        {doc.doc_type} — {doc.file_name}
                      </p>
                      {doc.file_url ? <DocumentInlinePreview url={doc.file_url} fileName={doc.file_name} className="mt-2" /> : null}
                    </div>
                  ))}
                  {!kycDetail.documents?.length ? <p className="text-xs text-slate-500">No documents.</p> : null}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Open flags</p>
                <div className="mt-2 space-y-2">
                  {(kycDetail.flags || [])
                    .filter((flag: any) => !flag.dismissed_at)
                    .slice(0, 5)
                    .map((flag: any) => (
                      <div key={flag.id} className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                        {flag.flag_type}: {flag.flag_note || 'Flagged'}
                      </div>
                    ))}
                  {!kycDetail.flags?.filter((flag: any) => !flag.dismissed_at)?.length ? (
                    <p className="text-xs text-slate-500">No active flags.</p>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
