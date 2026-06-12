'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, RefreshCw, Repeat, ScrollText } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import LandlordPageHeader from '../../components/ui/LandlordPageHeader';
import LandlordStatCard from '../../components/ui/LandlordStatCard';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import { LandlordWorkspaceLoading } from '../../components/ui/WorkspaceLoading';
import RenewalProposalCard from '../../components/renewals/RenewalProposalCard';
import { countActionableRenewals } from '../../../src/lib/renewalUi';
import { formatN$, landlordInputClass, landlordSelectClass, statusPillClass } from '../../components/landlord/landlordUi';

export default function LandlordLeasesPage() {
  const { user, loading, role } = useAuth();
  const router = useRouter();
  const [leases, setLeases] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedLease, setSelectedLease] = useState<any>(null);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [form, setForm] = useState({
    tenant_id: '',
    tenant_email: '',
    unit_id: '',
    monthly_rent: '',
    start_date: '',
    end_date: '',
    status: 'ACTIVE',
    payment_method: 'PLATFORM',
  });
  const [updateForm, setUpdateForm] = useState({ monthly_rent: '', end_date: '', status: '' });
  const [counterByRenewal, setCounterByRenewal] = useState<Record<string, { proposed_rent: string; proposed_end_date: string }>>({});
  const [renewalBusyId, setRenewalBusyId] = useState<string | null>(null);
  const [proposeRenewalForm, setProposeRenewalForm] = useState({ proposed_rent: '', proposed_end_date: '' });
  const [proposingRenewal, setProposingRenewal] = useState(false);
  const [leaseAgreements, setLeaseAgreements] = useState<any[]>([]);
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [agreementTitle, setAgreementTitle] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role && role !== 'LANDLORD' && role !== 'ADMIN') router.replace('/tenant/home');
  }, [loading, user, role, router]);

  const loadLeases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/landlords/leases');
      setLeases(res.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load leases.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadUnits = useCallback(async () => {
    try {
      const res = await api.get('/landlords/properties');
      const properties = res.data.data || [];
      const allUnits = properties.flatMap((property: any) =>
        (property.units || []).map((unit: any) => ({ ...unit, property_name: property.property_name })),
      );
      setUnits(allUnits);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load units.');
    }
  }, []);

  const loadRenewals = useCallback(async () => {
    try {
      const res = await api.get('/landlords/renewals');
      setRenewals(res.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load renewal proposals.');
    }
  }, []);

  useEffect(() => {
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) {
      void loadLeases();
      void loadUnits();
      void loadRenewals();
    }
  }, [user, role, loadLeases, loadUnits, loadRenewals]);

  const leaseStats = useMemo(() => {
    const active = leases.filter((l) => l.status === 'ACTIVE').length;
    const pendingRenewals = renewals.filter((r) => r.status !== 'APPROVED' && r.status !== 'REJECTED').length;
    return { total: leases.length, active, pendingRenewals };
  }, [leases, renewals]);

  const respondRenewal = async (renewalId: string, action: 'APPROVE' | 'REJECT') => {
    setRenewalBusyId(renewalId);
    setError(null);
    setMessage(null);
    try {
      await api.post(`/landlords/renewals/${renewalId}/respond`, { action });
      setMessage(action === 'APPROVE' ? 'Renewal approved — lease terms will update.' : 'Renewal declined.');
      await loadRenewals();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to update renewal.');
    } finally {
      setRenewalBusyId(null);
    }
  };

  const submitCounterRenewal = async (renewalId: string) => {
    const counter = counterByRenewal[renewalId];
    if (!counter?.proposed_rent && !counter?.proposed_end_date) {
      setError('Provide a counter rent or counter end date before sending.');
      return;
    }
    setRenewalBusyId(renewalId);
    setError(null);
    setMessage(null);
    try {
      await api.post(`/landlords/renewals/${renewalId}/respond`, {
        action: 'COUNTER',
        proposed_rent: counter?.proposed_rent ? Number(counter.proposed_rent) : undefined,
        proposed_end_date: counter?.proposed_end_date || undefined,
      });
      setMessage('Counter-offer sent to tenant.');
      await loadRenewals();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to send counter-offer.');
    } finally {
      setRenewalBusyId(null);
    }
  };

  const handleCreateLease = async () => {
    if (!form.unit_id || !form.monthly_rent || (!form.tenant_id && !form.tenant_email)) {
      setError('Unit, tenant information, and monthly rent are required.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {
        unit_id: form.unit_id,
        monthly_rent: Number(form.monthly_rent),
        status: form.status,
        payment_method: form.payment_method,
      };
      if (form.tenant_id) payload.tenant_id = form.tenant_id;
      if (form.tenant_email) payload.tenant_email = form.tenant_email;
      if (form.start_date) payload.start_date = form.start_date;
      if (form.end_date) payload.end_date = form.end_date;

      await api.post('/landlords/leases', payload);
      setMessage('Lease created successfully.');
      setForm({ tenant_id: '', tenant_email: '', unit_id: '', monthly_rent: '', start_date: '', end_date: '', status: 'ACTIVE', payment_method: 'PLATFORM' });
      await loadLeases();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to create lease.');
    } finally {
      setIsLoading(false);
    }
  };

  const defaultProposedEndDate = (endDate?: string | null) => {
    if (!endDate) return '';
    const d = new Date(endDate);
    if (Number.isNaN(d.getTime())) return '';
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  };

  const handleSelectLease = (lease: any) => {
    setSelectedLease(lease);
    setUpdateForm({
      monthly_rent: lease.monthly_rent?.toString() ?? '',
      end_date: lease.end_date || '',
      status: lease.status || 'ACTIVE',
    });
    setProposeRenewalForm({
      proposed_rent: lease.monthly_rent?.toString() ?? '',
      proposed_end_date: defaultProposedEndDate(lease.end_date),
    });
    setMessage(null);
    setError(null);
    void loadLeaseAgreements(lease.id);
  };

  const selectedLeaseHasOpenRenewal = selectedLease
    ? renewals.some(
        (r) =>
          r.lease_id === selectedLease.id &&
          r.status !== 'REJECTED' &&
          r.status !== 'EXPIRED' &&
          (r.status === 'PROPOSED' || r.status === 'PENDING_APPROVAL' || r.status === 'APPROVED'),
      )
    : false;

  const handleProposeRenewal = async () => {
    if (!selectedLease?.id) return;
    setProposingRenewal(true);
    setError(null);
    setMessage(null);
    try {
      await api.post(`/landlords/leases/${selectedLease.id}/renewals`, {
        proposed_rent: proposeRenewalForm.proposed_rent ? Number(proposeRenewalForm.proposed_rent) : undefined,
        proposed_end_date: proposeRenewalForm.proposed_end_date || undefined,
      });
      setMessage('Renewal proposal sent — tenant will be notified.');
      await loadRenewals();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to propose renewal.');
    } finally {
      setProposingRenewal(false);
    }
  };

  const loadLeaseAgreements = async (leaseId: string) => {
    try {
      const res = await api.get(`/landlords/leases/${leaseId}/agreements`);
      setLeaseAgreements(res.data?.data || []);
    } catch {
      setLeaseAgreements([]);
    }
  };

  const handleUploadAgreement = async () => {
    if (!selectedLease?.id || !agreementFile) {
      setError('Select a lease and file first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', agreementFile);
      if (agreementTitle) formData.append('title', agreementTitle);
      formData.append('document_type', 'LEASE_AGREEMENT');
      await api.post(`/landlords/leases/${selectedLease.id}/agreements/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAgreementFile(null);
      setAgreementTitle('');
      setMessage('Lease agreement uploaded.');
      await loadLeaseAgreements(selectedLease.id);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to upload lease agreement.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateLease = async () => {
    if (!selectedLease) {
      setError('Pick a lease to update.');
      return;
    }
    const payload: Record<string, unknown> = {};
    if (updateForm.monthly_rent) payload.monthly_rent = Number(updateForm.monthly_rent);
    if (updateForm.end_date) payload.end_date = updateForm.end_date;
    if (updateForm.status) payload.status = updateForm.status;
    if (!Object.keys(payload).length) {
      setError('At least one field is required to update lease.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      await api.patch(`/landlords/leases/${selectedLease.id}`, payload);
      setMessage('Lease updated successfully.');
      await loadLeases();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to update lease.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndLease = async (leaseId: string) => {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.patch(`/landlords/leases/${leaseId}`, { status: 'TERMINATED', end_date: today });
      setMessage('Lease terminated successfully.');
      await loadLeases();
      setSelectedLease(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to terminate lease.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLease = async (leaseId: string) => {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      await api.delete(`/landlords/leases/${leaseId}`);
      setMessage('Lease deleted successfully.');
      await loadLeases();
      if (selectedLease?.id === leaseId) setSelectedLease(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to delete lease.');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAll = () => {
    void loadLeases();
    void loadRenewals();
  };

  if (loading || !user) {
    return <LandlordWorkspaceLoading />;
  }

  const pendingRenewalCount = countActionableRenewals(renewals);

  return (
    <div className="space-y-6">
      <LandlordPageHeader
        badge="Portfolio"
        title="Leases"
        subtitle="Create, update, and manage active leases for your portfolio."
        actions={
          <button type="button" onClick={refreshAll} disabled={isLoading} className="landlord-btn-secondary">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={loadLeases} /> : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p>
      ) : null}

      {pendingRenewalCount > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-950">
            {pendingRenewalCount === 1
              ? 'One renewal proposal needs your review.'
              : `${pendingRenewalCount} renewal proposals need your review.`}
          </p>
          <p className="mt-1 text-sm text-amber-900/80">Approve, reject, or counter tenant responses below.</p>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <LandlordStatCard label="Total leases" value={leaseStats.total} icon={ScrollText} />
        <LandlordStatCard label="Active" value={leaseStats.active} icon={FileText} accent="success" />
        <LandlordStatCard label="Pending renewals" value={leaseStats.pendingRenewals} icon={Repeat} accent={leaseStats.pendingRenewals > 0 ? 'warning' : 'default'} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="landlord-panel">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Create new lease</h2>
          <p className="mt-1 text-sm text-slate-500">Link a tenant to an available unit and schedule rent details.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input placeholder="Tenant ID" value={form.tenant_id} onChange={(e) => setForm((prev) => ({ ...prev, tenant_id: e.target.value }))} className={landlordInputClass} />
            <select value={form.payment_method} onChange={(e) => setForm((prev) => ({ ...prev, payment_method: e.target.value }))} className={landlordSelectClass}>
              <option value="PLATFORM">Platform Payments</option>
              <option value="DIRECT">Direct Payments</option>
            </select>
            <input placeholder="Tenant email (optional)" value={form.tenant_email} onChange={(e) => setForm((prev) => ({ ...prev, tenant_email: e.target.value }))} className={landlordInputClass} />
            <select value={form.unit_id} onChange={(e) => setForm((prev) => ({ ...prev, unit_id: e.target.value }))} className={landlordSelectClass}>
              <option value="">Select an available unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.unit_identifier} — {unit.property_name} — {formatN$(unit.monthly_rent)}
                </option>
              ))}
            </select>
            <input type="number" placeholder="Monthly rent" value={form.monthly_rent} onChange={(e) => setForm((prev) => ({ ...prev, monthly_rent: e.target.value }))} className={landlordInputClass} />
            <input type="date" value={form.start_date} onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))} className={landlordInputClass} aria-label="Start date" />
            <input type="date" value={form.end_date} onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))} className={landlordInputClass} aria-label="End date" />
          </div>
          <button type="button" onClick={handleCreateLease} disabled={isLoading} className="landlord-btn-primary mt-4">
            {isLoading ? 'Saving…' : 'Create lease'}
          </button>
        </section>

        <section className="landlord-panel">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Selected lease</h2>
          <p className="mt-1 text-sm text-slate-500">Update rent, term, or status for an existing lease.</p>
          {!selectedLease ? (
            <div className="mt-4">
              <EmptyStateCard title="No lease selected" description="Select a lease from the roster below to manage it." />
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-100 bg-[#F3F4F6] p-4">
                <p className="text-sm text-slate-600">Lease ID</p>
                <p className="mt-1 font-semibold text-[#1A1A1A]">{selectedLease.id}</p>
                <p className="mt-2 text-sm text-slate-600">Tenant: {selectedLease.tenant_name || selectedLease.tenant_id}</p>
                <p className="mt-1 text-sm text-slate-600">Unit: {selectedLease.unit_identifier || selectedLease.unit_id}</p>
                <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClass(selectedLease.payment_method === 'PLATFORM' ? 'ACTIVE' : 'PENDING')}`}>
                  {selectedLease.payment_method === 'PLATFORM' ? 'Platform Payments' : 'Direct Payments'}
                </span>
              </div>
              <div className="grid gap-3">
                <input type="number" placeholder="Monthly rent" value={updateForm.monthly_rent} onChange={(e) => setUpdateForm((prev) => ({ ...prev, monthly_rent: e.target.value }))} className={landlordInputClass} />
                <input type="date" value={updateForm.end_date} onChange={(e) => setUpdateForm((prev) => ({ ...prev, end_date: e.target.value }))} className={landlordInputClass} aria-label="End date" />
                <select value={updateForm.status} onChange={(e) => setUpdateForm((prev) => ({ ...prev, status: e.target.value }))} className={landlordSelectClass}>
                  <option value="ACTIVE">Active</option>
                  <option value="ENDED">Ended</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button type="button" onClick={handleUpdateLease} disabled={isLoading} className="landlord-btn-primary bg-emerald-600 hover:bg-emerald-700">
                  {isLoading ? 'Saving…' : 'Update lease'}
                </button>
                <button type="button" onClick={() => selectedLease && handleEndLease(selectedLease.id)} disabled={isLoading} className="rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  Terminate lease
                </button>
                <button type="button" onClick={() => selectedLease && handleDeleteLease(selectedLease.id)} disabled={isLoading} className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  Delete lease
                </button>
              </div>
              {selectedLease.status === 'ACTIVE' && selectedLease.end_date ? (
                <div className="rounded-xl border border-[#C0392B]/20 bg-gradient-to-br from-white to-[#FDEDEC]/30 p-4">
                  <p className="text-sm font-semibold text-[#1A1A1A]">Propose renewal</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Send new terms to the tenant. They can accept, decline, or counter — you will get a notification.
                  </p>
                  {selectedLeaseHasOpenRenewal ? (
                    <p className="mt-3 text-sm text-amber-800">An open renewal already exists for this lease — see proposals below.</p>
                  ) : (
                    <>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <input
                          type="number"
                          min={0}
                          placeholder="Proposed rent"
                          value={proposeRenewalForm.proposed_rent}
                          onChange={(e) => setProposeRenewalForm((prev) => ({ ...prev, proposed_rent: e.target.value }))}
                          className={landlordInputClass}
                          disabled={proposingRenewal}
                        />
                        <input
                          type="date"
                          value={proposeRenewalForm.proposed_end_date}
                          onChange={(e) => setProposeRenewalForm((prev) => ({ ...prev, proposed_end_date: e.target.value }))}
                          className={landlordInputClass}
                          aria-label="Proposed end date"
                          disabled={proposingRenewal}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleProposeRenewal()}
                        disabled={proposingRenewal || !proposeRenewalForm.proposed_end_date}
                        className="landlord-btn-primary mt-3"
                      >
                        {proposingRenewal ? 'Sending…' : 'Send renewal proposal'}
                      </button>
                    </>
                  )}
                </div>
              ) : null}
              <div className="rounded-xl border border-slate-100 bg-[#F3F4F6] p-4">
                <p className="text-sm font-semibold text-[#1A1A1A]">Lease agreements</p>
                <p className="mt-1 text-xs text-slate-500">Upload signed leases and addendum documents as separate records.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input value={agreementTitle} onChange={(e) => setAgreementTitle(e.target.value)} placeholder="Agreement title (optional)" className={landlordInputClass} />
                  <label className={`${landlordInputClass} flex cursor-pointer items-center gap-2 py-2 text-xs`}>
                    <span className="truncate text-slate-600">{agreementFile ? agreementFile.name : 'Choose file…'}</span>
                    <input type="file" className="hidden" onChange={(e) => setAgreementFile(e.target.files?.[0] || null)} />
                  </label>
                  <button type="button" onClick={handleUploadAgreement} disabled={isLoading || !agreementFile} className="landlord-btn-primary py-2 text-xs">
                    Upload
                  </button>
                </div>
                {leaseAgreements.length ? (
                  <div className="mt-3 space-y-1">
                    {leaseAgreements.slice(0, 5).map((agreement) => (
                      <p key={agreement.id} className="text-xs text-slate-600">
                        v{agreement.version} — {agreement.file_name} ({agreement.signature_status})
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">No agreement documents for this lease yet.</p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="landlord-panel">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Lease roster</h2>
        <p className="mt-1 text-sm text-slate-500">All leases in your portfolio, including active, ended, and terminated contracts.</p>
        <div className="mt-4 space-y-3">
          {isLoading && !leases.length ? (
            <SkeletonBlocks rows={3} />
          ) : leases.length ? (
            leases.map((lease) => (
              <button
                key={lease.id}
                type="button"
                onClick={() => handleSelectLease(lease)}
                className={`w-full rounded-xl border p-4 text-left transition hover:border-slate-300 ${
                  selectedLease?.id === lease.id ? 'border-[#C0392B]/40 bg-[#FDEDEC]/40' : 'border-slate-100 bg-[#F3F4F6]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">{lease.tenant_name || lease.tenant_id}</p>
                    <p className="mt-1 text-sm text-slate-600">Unit {lease.unit_identifier || lease.unit_id}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClass(lease.status)}`}>{lease.status}</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <p className="text-sm text-slate-600">Rent: {formatN$(lease.monthly_rent)}</p>
                  <p className="text-sm text-slate-600">Start: {lease.start_date || 'N/A'}</p>
                  <p className="text-sm text-slate-600">End: {lease.end_date || 'N/A'}</p>
                </div>
              </button>
            ))
          ) : (
            <EmptyStateCard title="No leases" description="Create one above to get started." />
          )}
        </div>
      </section>

      <section className="landlord-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Lease renewal proposals</h2>
            <p className="mt-1 text-sm text-slate-500">Review and respond to upcoming lease renewals.</p>
          </div>
          <button type="button" onClick={() => void loadRenewals()} className="landlord-btn-secondary py-2 text-xs">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Refresh
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {renewals.length ? (
            renewals.slice(0, 10).map((renewal) => (
              <RenewalProposalCard
                key={renewal.id}
                renewal={renewal}
                role="landlord"
                busy={renewalBusyId === renewal.id}
                counter={counterByRenewal[renewal.id] ?? { proposed_rent: '', proposed_end_date: '' }}
                onCounterChange={(patch) =>
                  setCounterByRenewal((prev) => ({
                    ...prev,
                    [renewal.id]: { ...(prev[renewal.id] ?? { proposed_rent: '', proposed_end_date: '' }), ...patch },
                  }))
                }
                onApprove={() => respondRenewal(renewal.id, 'APPROVE')}
                onReject={() => respondRenewal(renewal.id, 'REJECT')}
                onCounter={() => submitCounterRenewal(renewal.id)}
              />
            ))
          ) : (
            <EmptyStateCard
              title="No renewal proposals"
              description="When a lease nears its end, renewal drafts and tenant counter-offers appear here and in the notification bell."
            />
          )}
        </div>
      </section>
    </div>
  );
}
