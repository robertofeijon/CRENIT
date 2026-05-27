"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function AdminKycPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [auditByUser, setAuditByUser] = useState<Record<string, any[]>>({});
  const [auditLoadingUserId, setAuditLoadingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
      return;
    }
    if (!loading && user && role !== 'ADMIN') {
      router.replace('/auth');
      return;
    }
  }, [loading, user, role, router]);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      loadQueue();
    }
  }, [user, role]);

  const loadQueue = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/kyc/pending?status=PENDING&limit=20');
      setSubmissions(res.data.data.submissions || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load KYC submissions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (userId: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) {
      setError('A rejection reason is required.');
      return;
    }

    setActionLoadingId(userId);
    setError(null);
    setActionMessage(null);

    try {
      await api.post(`/admin/kyc/review/${userId}`, {
        action,
        reason: action === 'reject' ? rejectionReason.trim() : undefined,
      });
      setActionMessage(action === 'approve' ? 'KYC approved.' : 'KYC rejected.');
      setRejectingUserId(null);
      setRejectionReason('');
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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">KYC review queue</h1>
              <p className="mt-3 text-sm text-slate-600">Review pending submissions and approve or reject tenant KYC verifications.</p>
            </div>
            <button
              onClick={loadQueue}
              disabled={isLoading}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Refresh queue
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {actionMessage ? <p className="mb-4 text-sm text-emerald-700">{actionMessage}</p> : null}
          {isLoading ? (
            <p className="text-sm text-slate-600">Loading data...</p>
          ) : submissions.length ? (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div key={submission.user_id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{submission.user_name}</p>
                      <p className="text-sm text-slate-600">{submission.user_email}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                      {submission.status}
                    </span>
                  </div>
                  {submission.quality_flags?.length ? (
                    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                      <p className="font-semibold">⚠ Review Carefully</p>
                      <ul className="mt-1 space-y-1">
                        {submission.quality_flags.map((flag: any) => (
                          <li key={flag.id}>
                            {flag.flag_type}: {flag.flag_note || 'Flagged for manual review'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <p className="mt-3 text-sm text-slate-600">Submitted: {new Date(submission.submitted_at).toLocaleString()}</p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => loadAuditLog(submission.user_id)}
                      disabled={auditLoadingUserId === submission.user_id}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      {auditLoadingUserId === submission.user_id ? 'Loading audit trail...' : 'View KYC audit trail'}
                    </button>
                  </div>
                  {auditByUser[submission.user_id]?.length ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">KYC audit trail</p>
                      <div className="mt-3 space-y-2">
                        {auditByUser[submission.user_id].map((row: any) => (
                          <div key={row.id} className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
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
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {submission.documents.map((doc: any) => (
                      <div key={`${doc.type}-${doc.file_name}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="font-semibold text-slate-900">{doc.file_name}</p>
                        <p className="mt-1 text-sm text-slate-500">Type: {doc.type}</p>
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700">
                          View document
                        </a>
                      </div>
                    ))}
                  </div>
                  {rejectingUserId === submission.user_id ? (
                    <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <label className="block text-sm font-medium text-slate-700">Rejection reason</label>
                      <textarea
                        value={rejectionReason}
                        onChange={(event) => setRejectionReason(event.target.value)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                        rows={3}
                        placeholder="Explain why this submission was rejected"
                      />
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => handleReview(submission.user_id, 'reject')}
                          disabled={actionLoadingId === submission.user_id}
                          className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionLoadingId === submission.user_id ? 'Saving decision...' : 'Confirm rejection'}
                        </button>
                        <button
                          onClick={() => {
                            setRejectingUserId(null);
                            setRejectionReason('');
                          }}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={() => handleReview(submission.user_id, 'approve')}
                        disabled={actionLoadingId === submission.user_id}
                        className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionLoadingId === submission.user_id ? 'Saving decision...' : 'Approve KYC'}
                      </button>
                      <button
                        onClick={() => {
                          setRejectingUserId(submission.user_id);
                          setRejectionReason('');
                        }}
                        disabled={actionLoadingId === submission.user_id}
                        className="rounded-2xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reject KYC
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No pending KYC submissions right now.</p>
          )}
        </div>
      </div>
    </main>
  );
}
