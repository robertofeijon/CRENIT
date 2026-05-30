'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, UserCheck, Users, UserPlus, Clock } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import LandlordPageHeader from '../../components/ui/LandlordPageHeader';
import LandlordStatCard from '../../components/ui/LandlordStatCard';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import { formatN$, landlordInputClass, landlordSelectClass, statusPillClass } from '../../components/landlord/landlordUi';

export default function LandlordTenantsPage() {
  const { user, role, loading } = useAuth();
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

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role && role !== 'LANDLORD' && role !== 'ADMIN') router.replace('/tenant/home');
  }, [loading, user, role, router]);

  const loadTenants = useCallback(async () => {
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
  }, []);

  const loadInvites = useCallback(async () => {
    setInvitesLoading(true);
    try {
      const res = await api.get('/landlords/invites');
      setInvites(res.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load invites.');
    } finally {
      setInvitesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) {
      void loadTenants();
      void loadInvites();
    }
  }, [user, role, loadTenants, loadInvites]);

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

  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      const matchesName = tenant.tenantName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || tenant.kycStatus === statusFilter;
      return matchesName && matchesStatus;
    });
  }, [tenants, searchQuery, statusFilter]);

  const kycStats = useMemo(() => {
    const pending = tenants.filter((t) => t.kycStatus === 'PENDING').length;
    const approved = tenants.filter((t) => t.kycStatus === 'APPROVED').length;
    return { total: tenants.length, pending, approved, invites: invites.length };
  }, [tenants, invites]);

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
      if (status !== 'REJECTED') setRejectionReason('');
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
    return <p className="text-sm text-slate-500">Loading partner workspace…</p>;
  }

  return (
    <div className="space-y-6">
      <LandlordPageHeader
        badge="Tenants"
        title="Tenant KYC review"
        subtitle="Review tenant documents, approve or reject KYC status, and monitor the current tenant queue."
        actions={
          <button type="button" onClick={() => void loadTenants()} disabled={loadingList} className="landlord-btn-secondary">
            <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={loadTenants} /> : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <LandlordStatCard label="Active tenants" value={kycStats.total} icon={Users} />
        <LandlordStatCard label="KYC approved" value={kycStats.approved} icon={UserCheck} accent="success" />
        <LandlordStatCard label="Pending review" value={kycStats.pending} icon={Clock} accent={kycStats.pending > 0 ? 'warning' : 'default'} />
        <LandlordStatCard label="Open invites" value={kycStats.invites} icon={UserPlus} accent="dark" />
      </section>

      <section className="landlord-panel">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Send tenant invite</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="tenant@email.com" className={landlordInputClass} />
          <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Tenant full name" className={landlordInputClass} />
          <input type="text" value={inviteUnitId} onChange={(e) => setInviteUnitId(e.target.value)} placeholder="Unit ID (optional)" className={landlordInputClass} />
          <button type="button" onClick={sendInvite} disabled={inviteLoading} className="landlord-btn-primary">
            {inviteLoading ? 'Sending…' : 'Send invite'}
          </button>
        </div>
        {inviteMessage ? <p className="mt-3 text-sm text-emerald-700">{inviteMessage}</p> : null}

        <div className="mt-6 border-t border-slate-100 pt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1A1A1A]">Recent invites</h3>
            <button type="button" onClick={() => void loadInvites()} disabled={invitesLoading} className="landlord-btn-secondary py-2 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 ${invitesLoading ? 'animate-spin' : ''}`} aria-hidden />
              Refresh
            </button>
          </div>
          {invitesLoading ? (
            <SkeletonBlocks rows={2} />
          ) : invites.length ? (
            <div className="space-y-2">
              {invites.slice(0, 6).map((invite) => (
                <div key={invite.id} className="rounded-xl border border-slate-100 bg-[#F3F4F6] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">{invite.invited_email}</p>
                      <p className="text-xs text-slate-600">
                        {invite.unit_label || 'No unit'} • Expires {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClass(invite.status)}`}>{invite.status}</span>
                      {invite.status !== 'ACCEPTED' ? (
                        <>
                          <button type="button" onClick={() => resendInvite(invite.id)} className="landlord-btn-secondary py-1.5 text-xs">
                            Resend
                          </button>
                          <button type="button" onClick={() => cancelInvite(invite.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                            Cancel
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyStateCard title="No invites yet" description="Send an invite above to onboard a new tenant." />
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.95fr]">
        <section className="landlord-panel">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Tenant queue</h2>
          <p className="mt-1 text-sm text-slate-500">All tenants with active leases for your portfolio.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1.6fr_0.9fr]">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tenant name…" className={landlordInputClass} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className={landlordSelectClass}>
              <option value="ALL">All statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
              <option value="NOT_SUBMITTED">Not submitted</option>
            </select>
          </div>
          <div className="mt-4 space-y-3">
            {loadingList ? (
              <SkeletonBlocks rows={4} />
            ) : filteredTenants.length ? (
              filteredTenants.map((tenant) => (
                <button
                  key={`${tenant.tenantId}-${tenant.leaseId}`}
                  type="button"
                  onClick={() => loadTenantDetails(tenant.tenantId)}
                  className={`w-full rounded-xl border p-4 text-left transition hover:border-slate-300 ${
                    selectedTenantId === tenant.tenantId ? 'border-[#C0392B]/40 bg-[#FDEDEC]/40' : 'border-slate-100 bg-[#F3F4F6]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#1A1A1A]">{tenant.tenantName}</p>
                      <p className="mt-1 text-sm text-slate-600">Lease {tenant.leaseId} • Unit {tenant.unitId ?? 'N/A'}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClass(tenant.kycStatus)}`}>{tenant.kycStatus}</span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <p className="text-sm text-slate-600">Monthly rent: {formatN$(tenant.monthlyRent)}</p>
                    <p className="text-sm text-slate-600">Lease status: {tenant.status || 'Unknown'}</p>
                  </div>
                </button>
              ))
            ) : tenants.length ? (
              <EmptyStateCard title="No matches" description="Try adjusting your search or filter." />
            ) : (
              <EmptyStateCard title="No tenants" description="No active tenant leases found for your portfolio." />
            )}
          </div>
        </section>

        <section className="landlord-panel">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Review details</h2>
          <p className="mt-1 text-sm text-slate-500">Select a tenant to inspect KYC documents and update approval status.</p>

          {!selectedTenantId ? (
            <div className="mt-6">
              <EmptyStateCard title="No tenant selected" description="Choose a tenant from the queue to view details." />
            </div>
          ) : loadingTenant ? (
            <div className="mt-6">
              <SkeletonBlocks rows={5} />
            </div>
          ) : selectedTenant ? (
            <div className="mt-6 space-y-5">
              <div className="rounded-xl border border-slate-100 bg-[#F3F4F6] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tenant name</p>
                <p className="mt-1 text-lg font-semibold text-[#1A1A1A]">{selectedTenant.profile.full_name}</p>
                <p className="mt-2 text-sm text-slate-600">
                  KYC status:{' '}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusPillClass(selectedTenant.profile.kyc_status)}`}>
                    {selectedTenant.profile.kyc_status}
                  </span>
                </p>
              </div>

              {selectedTenant.score ? (
                <div className="rounded-xl border border-slate-100 bg-[#F3F4F6] p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Credit profile</h3>
                  <p className="mt-3 text-lg font-semibold text-[#1A1A1A]">
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

              <div className="rounded-xl border border-slate-100 bg-[#F3F4F6] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Lease summary</h3>
                {selectedTenant.leases.map((lease: any) => (
                  <div key={lease.id} className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
                    <p className="text-sm text-slate-600">Lease ID: {lease.id}</p>
                    <p className="mt-1 text-sm text-slate-700">Unit: {lease.unit_id ?? 'N/A'}</p>
                    <p className="mt-1 text-sm text-slate-700">Rent: {formatN$(lease.monthly_rent)}</p>
                    <p className="mt-1 text-sm text-slate-700">
                      Status:{' '}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusPillClass(lease.status)}`}>{lease.status}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-700">Term: {lease.start_date ?? 'N/A'} → {lease.end_date ?? 'N/A'}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-100 bg-[#F3F4F6] p-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Uploaded documents</h3>
                  <span className="text-xs text-slate-500">{selectedTenant.documents.length} files</span>
                </div>
                <div className="mt-3 space-y-2">
                  {selectedTenant.documents.length ? (
                    selectedTenant.documents.map((doc: any) => (
                      <div key={`${doc.storage_path}-${doc.uploaded_at}`} className="rounded-xl border border-slate-100 bg-white p-3">
                        <p className="font-semibold text-[#1A1A1A]">{doc.file_name}</p>
                        <p className="mt-1 text-sm text-slate-600">Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                        <a href={doc.publicUrl ?? doc.storage_path} target="_blank" rel="noreferrer" className="landlord-btn-primary mt-3 inline-flex py-2 text-xs">
                          View document
                        </a>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-600">No documents have been uploaded yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-[#F3F4F6] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Decision</h3>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Rejection reason (required for REJECTED)"
                  className={`${landlordInputClass} mt-3 min-h-[100px]`}
                />
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={() => updateKycStatus('APPROVED')} disabled={actionLoading} className="landlord-btn-primary bg-emerald-600 hover:bg-emerald-700">
                    Approve KYC
                  </button>
                  <button type="button" onClick={() => updateKycStatus('REJECTED')} disabled={actionLoading} className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                    Reject KYC
                  </button>
                </div>
              </div>

              {selectedTenant.kycAudit?.length ? (
                <div className="rounded-xl border border-slate-100 bg-[#F3F4F6] p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">KYC audit history</h3>
                  <div className="mt-3 space-y-2">
                    {selectedTenant.kycAudit.map((entry: any) => (
                      <div key={entry.id} className="rounded-xl border border-slate-100 bg-white p-3">
                        <p className="text-sm font-semibold text-[#1A1A1A]">{entry.action}</p>
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
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Previous rejection reason</p>
                  <p className="mt-2 text-sm text-amber-900">{selectedTenant.profile.kyc_rejection_reason}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyStateCard title="Details unavailable" description="Unable to load tenant details." />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
