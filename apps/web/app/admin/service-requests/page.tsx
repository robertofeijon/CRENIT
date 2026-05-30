'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ClipboardList, FileUp, RefreshCw, UserPlus } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';

interface PendingRequest {
  id: string;
  landlord_id: string;
  request_type: string;
  status: string;
  description?: string;
  fee_amount: number;
  assigned_admin_id?: string;
  created_at: string;
}

interface PendingAttachment {
  id: string;
  landlord_id: string;
  property_id?: string;
  attachment_type: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  uploaded_at: string;
}

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-900',
    VERIFIED: 'bg-emerald-100 text-emerald-900',
    REJECTED: 'bg-red-100 text-red-900',
    ACCEPTED: 'bg-sky-100 text-sky-900',
    IN_PROGRESS: 'bg-sky-100 text-sky-900',
    COMPLETED: 'bg-emerald-100 text-emerald-900',
  };
  return map[status] || 'bg-slate-100 text-slate-800';
}

export default function AdminServiceRequestsPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<PendingAttachment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState<'requests' | 'attachments'>('requests');
  const [onBehalfLandlordId, setOnBehalfLandlordId] = useState('');
  const [onBehalfPropertyId, setOnBehalfPropertyId] = useState('');
  const [onBehalfLeaseId, setOnBehalfLeaseId] = useState('');
  const [onBehalfUnitId, setOnBehalfUnitId] = useState('');
  const [onBehalfType, setOnBehalfType] = useState<'PROPERTY_PROOF' | 'LEASE_AGREEMENT' | 'OWNERSHIP_DOCUMENT' | 'OTHER'>(
    'PROPERTY_PROOF',
  );
  const [onBehalfDescription, setOnBehalfDescription] = useState('');
  const [onBehalfFile, setOnBehalfFile] = useState<File | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  const loadAll = useCallback(async () => {
    if (!user || role !== 'ADMIN') return;
    setIsLoading(true);
    setError(null);
    try {
      const [reqRes, attRes] = await Promise.all([
        api.get('/admin/service-requests'),
        api.get('/admin/attachments?status=PENDING'),
      ]);
      setRequests(reqRes.data?.data || []);
      setPendingAttachments(attRes.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load service workspace.');
    } finally {
      setIsLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openRequestCount = requests.filter((r) => r.status !== 'COMPLETED').length;

  const handleAssignRequest = async (requestId: string) => {
    setIsLoading(true);
    setMessage(null);
    try {
      await api.post(`/admin/service-requests/${requestId}/assign`);
      setMessage('Request assigned to you.');
      await loadAll();
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Unable to assign request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRequest = async (requestId: string) => {
    setIsLoading(true);
    setMessage(null);
    try {
      await api.post(`/admin/service-requests/${requestId}/complete`);
      setMessage('Request marked complete.');
      await loadAll();
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Unable to complete request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAttachment = async (attachmentId: string) => {
    setIsLoading(true);
    setMessage(null);
    try {
      await api.post(`/admin/attachments/${attachmentId}/verify`);
      setMessage('Attachment verified.');
      setSelectedAttachment(null);
      await loadAll();
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Unable to verify attachment.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectAttachment = async (attachmentId: string) => {
    if (!rejectionReason.trim()) {
      setMessage('Provide a rejection reason.');
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      await api.post(`/admin/attachments/${attachmentId}/reject`, { rejection_reason: rejectionReason });
      setMessage('Attachment rejected.');
      setSelectedAttachment(null);
      setRejectionReason('');
      await loadAll();
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Unable to reject attachment.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadOnBehalf = async () => {
    if (!onBehalfLandlordId || !onBehalfFile) {
      setMessage('Landlord ID and document file are required.');
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', onBehalfFile);
      formData.append('landlord_id', onBehalfLandlordId);
      formData.append('attachment_type', onBehalfType);
      if (onBehalfPropertyId) formData.append('property_id', onBehalfPropertyId);
      if (onBehalfLeaseId) formData.append('lease_id', onBehalfLeaseId);
      if (onBehalfUnitId) formData.append('unit_id', onBehalfUnitId);
      if (onBehalfDescription) formData.append('description', onBehalfDescription);
      await api.post('/admin/attachments/upload-on-behalf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage('Document uploaded on behalf of landlord.');
      setOnBehalfPropertyId('');
      setOnBehalfLeaseId('');
      setOnBehalfUnitId('');
      setOnBehalfDescription('');
      setOnBehalfFile(null);
      await loadAll();
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Unable to upload document.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || !user || role !== 'ADMIN') {
    return <p className="text-sm text-slate-500">Loading admin workspace...</p>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        badge="Operations"
        title="Service requests"
        subtitle="Assisted onboarding — assign “done for me” tasks and verify landlord property documents."
        actions={
          <button
            type="button"
            onClick={() => loadAll()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={loadAll} /> : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`rounded-t-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'requests'
              ? 'border-b-2 border-[#C0392B] text-[#C0392B]'
              : 'text-slate-600 hover:text-[#1A1A1A]'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <ClipboardList className="h-4 w-4" aria-hidden />
            Service requests ({openRequestCount})
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('attachments')}
          className={`rounded-t-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'attachments'
              ? 'border-b-2 border-[#C0392B] text-[#C0392B]'
              : 'text-slate-600 hover:text-[#1A1A1A]'
          }`}
        >
          Pending documents ({pendingAttachments.length})
        </button>
      </div>

      {activeTab === 'requests' ? (
        <div className="space-y-4">
          {isLoading && !requests.length ? <SkeletonBlocks rows={3} /> : null}
          {!isLoading && requests.length === 0 ? (
            <EmptyStateCard title="No service requests" description="There are no active assisted onboarding requests." />
          ) : (
            requests.map((req) => (
              <article
                key={req.id}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">{req.request_type.replace(/_/g, ' ')}</p>
                    <p className="mt-1 text-sm text-slate-600">Landlord {req.landlord_id.slice(0, 8)}…</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      Fee N${Number(req.fee_amount || 0).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(req.created_at).toLocaleString()}</p>
                    {req.description ? <p className="mt-3 text-sm text-slate-700">{req.description}</p> : null}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(req.status)}`}>
                    {req.status}
                  </span>
                </div>

                {req.status === 'PENDING' ? (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleAssignRequest(req.id)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#992d24] disabled:opacity-60"
                  >
                    <UserPlus className="h-4 w-4" aria-hidden />
                    Assign to me
                  </button>
                ) : null}

                {req.status === 'ACCEPTED' && req.assigned_admin_id === user?.id ? (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleCompleteRequest(req.id)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#111] disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    Mark complete
                  </button>
                ) : null}
              </article>
            ))
          )}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2">
                <FileUp className="h-5 w-5 text-[#C0392B]" aria-hidden />
                <h2 className="font-semibold text-[#1A1A1A]">Upload on behalf</h2>
              </div>
              <p className="mt-1 text-sm text-slate-600">Platform-assisted onboarding when landlords cannot upload themselves.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  className="rounded-xl border border-slate-200 bg-[#F3F4F6] px-3 py-2 text-sm"
                  placeholder="Landlord user ID"
                  value={onBehalfLandlordId}
                  onChange={(e) => setOnBehalfLandlordId(e.target.value)}
                />
                <input
                  className="rounded-xl border border-slate-200 bg-[#F3F4F6] px-3 py-2 text-sm"
                  placeholder="Property ID (optional)"
                  value={onBehalfPropertyId}
                  onChange={(e) => setOnBehalfPropertyId(e.target.value)}
                />
                <select
                  className="rounded-xl border border-slate-200 bg-[#F3F4F6] px-3 py-2 text-sm"
                  value={onBehalfType}
                  onChange={(e) => setOnBehalfType(e.target.value as typeof onBehalfType)}
                >
                  <option value="PROPERTY_PROOF">Property proof</option>
                  <option value="LEASE_AGREEMENT">Lease agreement</option>
                  <option value="OWNERSHIP_DOCUMENT">Ownership document</option>
                  <option value="OTHER">Other</option>
                </select>
                <input
                  className="rounded-xl border border-slate-200 bg-[#F3F4F6] px-3 py-2 text-sm"
                  placeholder="Lease ID (optional)"
                  value={onBehalfLeaseId}
                  onChange={(e) => setOnBehalfLeaseId(e.target.value)}
                />
                <input
                  className="rounded-xl border border-slate-200 bg-[#F3F4F6] px-3 py-2 text-sm sm:col-span-2"
                  placeholder="Description (optional)"
                  value={onBehalfDescription}
                  onChange={(e) => setOnBehalfDescription(e.target.value)}
                />
                <input
                  className="rounded-xl border border-slate-200 bg-[#F3F4F6] px-3 py-2 text-sm sm:col-span-2"
                  type="file"
                  onChange={(e) => setOnBehalfFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={handleUploadOnBehalf}
                  disabled={isLoading}
                  className="rounded-full bg-[#1A1A1A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#111] disabled:opacity-60 sm:col-span-2"
                >
                  Upload document
                </button>
              </div>
            </section>

            {isLoading && !pendingAttachments.length ? <SkeletonBlocks rows={3} /> : null}
            {!isLoading && pendingAttachments.length === 0 ? (
              <EmptyStateCard title="No pending documents" description="All submitted attachments have been processed." />
            ) : (
              pendingAttachments.map((att) => (
                <button
                  key={att.id}
                  type="button"
                  onClick={() => setSelectedAttachment(att)}
                  className={`w-full rounded-[1.25rem] border bg-white p-5 text-left shadow-sm transition ${
                    selectedAttachment?.id === att.id
                      ? 'border-[#C0392B] ring-2 ring-[#C0392B]/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-semibold text-[#1A1A1A]">{att.attachment_type.replace(/_/g, ' ')}</p>
                  <p className="mt-1 text-sm text-slate-600">Landlord {att.landlord_id.slice(0, 8)}…</p>
                  {att.property_id ? (
                    <p className="mt-1 text-sm text-slate-600">Property {att.property_id.slice(0, 8)}…</p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">{new Date(att.uploaded_at).toLocaleString()}</p>
                </button>
              ))
            )}
          </div>

          <aside className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:sticky xl:top-24 xl:self-start">
            {selectedAttachment ? (
              <>
                <h2 className="font-semibold text-[#1A1A1A]">Review document</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Type</dt>
                    <dd className="font-medium text-[#1A1A1A]">{selectedAttachment.attachment_type.replace(/_/g, ' ')}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Landlord</dt>
                    <dd className="break-all font-mono text-xs text-slate-700">{selectedAttachment.landlord_id}</dd>
                  </div>
                  {selectedAttachment.property_id ? (
                    <div>
                      <dt className="text-slate-500">Property</dt>
                      <dd className="break-all font-mono text-xs text-slate-700">{selectedAttachment.property_id}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-slate-500">Uploaded</dt>
                    <dd className="text-slate-700">{new Date(selectedAttachment.uploaded_at).toLocaleString()}</dd>
                  </div>
                </dl>
                <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleVerifyAttachment(selectedAttachment.id)}
                    className="w-full rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <label className="block text-sm font-medium text-slate-700" htmlFor="reject-reason">
                    Rejection reason
                  </label>
                  <textarea
                    id="reject-reason"
                    className="w-full rounded-xl border border-slate-200 bg-[#F3F4F6] p-3 text-sm"
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why the document was rejected…"
                  />
                  <button
                    type="button"
                    disabled={isLoading || !rejectionReason.trim()}
                    onClick={() => handleRejectAttachment(selectedAttachment.id)}
                    className="w-full rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Select a pending document to review and approve or reject.</p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
