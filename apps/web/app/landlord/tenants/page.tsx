"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function LandlordTenantsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingTenant, setLoadingTenant] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'NOT_SUBMITTED'>('ALL');
  const [rejectionReason, setRejectionReason] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteUnitId, setInviteUnitId] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [invites, setInvites] = useState<any[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  const role = useMemo(() => {
    if (!user) return null;
    return (user.user_metadata as any)?.role?.toString().toUpperCase() ?? null;
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
      return;
    }

    if (!loading && user && role !== 'LANDLORD') {
      router.replace('/tenant');
      return;
    }
  }, [loading, user, role, router]);

  useEffect(() => {
    if (!user || role !== 'LANDLORD') return;
    loadTenants();
    loadInvites();
  }, [user, role]);

  const loadTenants = async () => {
    setLoadingList(true);
    setError(null);
    try {
      const res = await api.get('/landlords/tenants');
      setTenants(res.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load tenants.');
    } finally {
      setLoadingList(false);
    }
  };

  const loadTenantDetails = async (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setSelectedTenant(null);
    setLoadingTenant(true);
    setMessage(null);
    try {
      const res = await api.get(`/landlords/tenants/${tenantId}`);
      setSelectedTenant(res.data.data);
      setRejectionReason(res.data.data.profile?.kyc_rejection_reason || '');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load tenant details.');
    } finally {
      setLoadingTenant(false);
    }
  };

  const loadInvites = async () => {
    setInvitesLoading(true);
    try {
      const res = await api.get('/landlords/invites');
      setInvites(res.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load invites.');
    } finally {
      setInvitesLoading(false);
    }
  };

  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      const matchesName = tenant.tenantName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || tenant.kycStatus === statusFilter;
      return matchesName && matchesStatus;
    });
  }, [tenants, searchQuery, statusFilter]);

  const updateKycStatus = async (status: string) => {
    if (!selectedTenantId) return;
    if (status === 'REJECTED' && !rejectionReason.trim()) {
      setError('Please provide a rejection reason when rejecting KYC.');
      return;
    }

    setActionLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await api.patch(`/landlords/tenants/${selectedTenantId}/kyc`, {
        status,
        reason: status === 'REJECTED' ? rejectionReason.trim() : undefined,
      });
      setSelectedTenant((prev: any) => ({ ...prev, profile: res.data.data }));
      setMessage(`KYC status updated to ${status}.`);
      if (status !== 'REJECTED') {
        setRejectionReason('');
      }
      await loadTenants();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to update KYC status.');
    } finally {
      setActionLoading(false);
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) {
      setError('Invite email and full name are required.');
      return;
    }
    setInviteLoading(true);
    setInviteMessage(null);
    setError(null);
    try {
      const res = await api.post('/landlords/invite', {
        email: inviteEmail.trim(),
        full_name: inviteName.trim(),
        unit_id: inviteUnitId.trim() || undefined,
      });
      const invite = res.data?.data?.invite;
      const inviteUrl = invite?.invite_url ?? '';
      setInviteMessage(inviteUrl ? `Invite sent: ${window.location.origin}${inviteUrl}` : 'Invite sent successfully.');
      setInviteEmail('');
      setInviteName('');
      setInviteUnitId('');
      await loadInvites();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to send invite.');
    } finally {
      setInviteLoading(false);
    }
  };

  const resendInvite = async (inviteId: string) => {
    setError(null);
    try {
      const res = await api.post(`/landlords/invites/${inviteId}/resend`);
      const inviteUrl = res.data?.data?.invite_url;
      setInviteMessage(inviteUrl ? `Invite resent: ${window.location.origin}${inviteUrl}` : 'Invite resent.');
      await loadInvites();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to resend invite.');
    }
  };

  const cancelInvite = async (inviteId: string) => {
    setError(null);
    try {
      await api.post(`/landlords/invites/${inviteId}/cancel`);
      setInviteMessage('Invite cancelled.');
      await loadInvites();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to cancel invite.');
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-slate-50 p-8">Loading landlord workspace...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl p-8">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Tenant review</p>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Tenant KYC review</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Review tenant documents, approve or reject KYC status, and monitor the current tenant queue.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="tenant@email.com"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900"
            />
            <input
              type="text"
              value={inviteName}
              onChange={(event) => setInviteName(event.target.value)}
              placeholder="Tenant full name"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900"
            />
            <input
              type="text"
              value={inviteUnitId}
              onChange={(event) => setInviteUnitId(event.target.value)}
              placeholder="Unit ID (optional)"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900"
            />
            <button
              type="button"
              onClick={sendInvite}
              disabled={inviteLoading}
              className="rounded-2xl bg-brand-red px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {inviteLoading ? 'Sending...' : 'Send invite'}
            </button>
          </div>
          {inviteMessage ? <p className="mt-3 text-sm text-emerald-700">{inviteMessage}</p> : null}
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Recent invites</p>
              <button
                type="button"
                onClick={loadInvites}
                disabled={invitesLoading}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700"
              >
                {invitesLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            <div className="space-y-2">
              {invites.length ? (
                invites.slice(0, 6).map((invite) => (
                  <div key={invite.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{invite.invited_email}</p>
                        <p className="text-xs text-slate-600">
                          {invite.unit_label || 'No unit'} • {invite.status} • Expires {new Date(invite.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {invite.status !== 'ACCEPTED' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => resendInvite(invite.id)}
                              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
                            >
                              Resend
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelInvite(invite.id)}
                              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700"
                            >
                              Cancel
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No invites created yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.95fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Tenant queue</h2>
                <p className="mt-2 text-sm text-slate-500">All tenants with active leases for your portfolio.</p>
              </div>
              <button
                type="button"
                onClick={loadTenants}
                disabled={loadingList}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingList ? 'Refreshing...' : 'Refresh list'}
              </button>
            </div>
            <div className="mb-5 grid gap-3 sm:grid-cols-[1.6fr_0.9fr]">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tenant name..."
                className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as any)}
                className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="ALL">All statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
                <option value="NOT_SUBMITTED">Not submitted</option>
              </select>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="space-y-3">
              {filteredTenants.length ? (
                filteredTenants.map((tenant) => (
                  <button
                    key={`${tenant.tenantId}-${tenant.leaseId}`}
                    type="button"
                    onClick={() => loadTenantDetails(tenant.tenantId)}
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{tenant.tenantName}</p>
                        <p className="mt-1 text-sm text-slate-600">Lease {tenant.leaseId} • Unit {tenant.unitId ?? 'N/A'}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                        {tenant.kycStatus}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <p className="text-sm text-slate-600">Monthly rent: N${Number(tenant.monthlyRent || 0).toLocaleString()}</p>
                      <p className="text-sm text-slate-600">Lease status: {tenant.status || 'Unknown'}</p>
                    </div>
                  </button>
                ))
              ) : tenants.length ? (
                <p className="text-sm text-slate-500">No tenants match the current search or filter.</p>
              ) : (
                <p className="text-sm text-slate-500">No active tenant leases found for your portfolio.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Review details</h2>
            <p className="mt-2 text-sm text-slate-500">Select a tenant to inspect KYC documents and update approval status.</p>

            {!selectedTenantId ? (
              <div className="mt-6 rounded-3xl bg-slate-50 p-6 text-sm text-slate-600">
                Choose a tenant from the queue to view details.
              </div>
            ) : loadingTenant ? (
              <div className="mt-6 rounded-3xl bg-slate-50 p-6 text-sm text-slate-600">Loading tenant details...</div>
            ) : selectedTenant ? (
              <div className="mt-6 space-y-6">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Tenant name</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{selectedTenant.profile.full_name}</p>
                  <p className="mt-2 text-sm text-slate-600">Current KYC status: {selectedTenant.profile.kyc_status}</p>
                </div>

                {selectedTenant.score ? (
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Credit profile</h3>
                    <p className="mt-3 text-lg font-semibold text-slate-900">
                      Score {selectedTenant.score.score} ({selectedTenant.score.tier})
                    </p>
                    <div className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                      <p>Payment history (35%): {selectedTenant.score.payment_history_score}</p>
                      <p>Payment streak (20%): {selectedTenant.score.streak_score}</p>
                      <p>Tenancy history (20%): {selectedTenant.score.history_length_score}</p>
                      <p>Income-to-rent ratio (15%): {selectedTenant.score.income_rent_ratio_score}</p>
                      <p>Deposit management (10%): {selectedTenant.score.deposit_management_score}</p>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-3xl bg-slate-50 p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Lease summary</h3>
                  {selectedTenant.leases.map((lease: any) => (
                    <div key={lease.id} className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm text-slate-600">Lease ID: {lease.id}</p>
                      <p className="mt-2 text-sm text-slate-700">Unit: {lease.unit_id ?? 'N/A'}</p>
                      <p className="mt-1 text-sm text-slate-700">Rent: N${Number(lease.monthly_rent || 0).toLocaleString()}</p>
                      <p className="mt-1 text-sm text-slate-700">Status: {lease.status}</p>
                      <p className="mt-1 text-sm text-slate-700">Term: {lease.start_date ?? 'N/A'} → {lease.end_date ?? 'N/A'}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-3xl bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Uploaded documents</h3>
                    <span className="text-xs text-slate-500">{selectedTenant.documents.length} files</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {selectedTenant.documents.length ? (
                      selectedTenant.documents.map((doc: any) => (
                        <div key={`${doc.storage_path}-${doc.uploaded_at}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="font-semibold text-slate-900">{doc.file_name}</p>
                          <p className="mt-1 text-sm text-slate-600">Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                          <a
                            href={doc.publicUrl ?? doc.storage_path}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                          >
                            View document
                          </a>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-600">No documents have been uploaded yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-50 p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Decision</h3>
                  <div className="mt-4 space-y-4">
                    <textarea
                      value={rejectionReason}
                      onChange={(event) => setRejectionReason(event.target.value)}
                      placeholder="Rejection reason (required for REJECTED)"
                      className="min-h-[120px] w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
                    />
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => updateKycStatus('APPROVED')}
                        disabled={actionLoading}
                        className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Approve KYC
                      </button>
                      <button
                        type="button"
                        onClick={() => updateKycStatus('REJECTED')}
                        disabled={actionLoading}
                        className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reject KYC
                      </button>
                    </div>
                  </div>
                </div>

                {selectedTenant.kycAudit?.length ? (
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">KYC audit history</h3>
                    <div className="mt-3 space-y-2">
                      {selectedTenant.kycAudit.map((entry: any) => (
                        <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-sm font-semibold text-slate-900">{entry.action}</p>
                          <p className="mt-1 text-xs text-slate-600">
                            {entry.previous_status || 'N/A'} → {entry.next_status || 'N/A'}
                          </p>
                          {entry.reason ? <p className="mt-1 text-xs text-slate-600">Reason: {entry.reason}</p> : null}
                          <p className="mt-1 text-xs text-slate-500">{new Date(entry.created_at).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedTenant.profile.kyc_rejection_reason ? (
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">Previous rejection reason</p>
                    <p className="mt-2 text-sm text-slate-700">{selectedTenant.profile.kyc_rejection_reason}</p>
                  </div>
                ) : null}

                {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl bg-slate-50 p-6 text-sm text-slate-600">No tenant details are selected.</div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
