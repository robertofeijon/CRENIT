"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function LandlordLeasesPage() {
  const { user, loading, role } = useAuth();
  const router = useRouter();
  const [leases, setLeases] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedLease, setSelectedLease] = useState<any>(null);
  const [form, setForm] = useState({
    tenant_id: '',
    tenant_email: '',
    unit_id: '',
    monthly_rent: '',
    start_date: '',
    end_date: '',
    status: 'ACTIVE',
  });
  const [updateForm, setUpdateForm] = useState({
    monthly_rent: '',
    end_date: '',
    status: '',
  });

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
    loadLeases();
    loadUnits();
  }, [user, role]);

  const loadLeases = async () => {
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
  };

  const loadUnits = async () => {
    try {
      const res = await api.get('/landlords/properties');
      const properties = res.data.data || [];
      const allUnits = properties.flatMap((property: any) =>
        (property.units || []).map((unit: any) => ({
          ...unit,
          property_name: property.property_name,
        })),
      );
      setUnits(allUnits);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load units.');
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
      };

      if (form.tenant_id) {
        payload.tenant_id = form.tenant_id;
      }
      if (form.tenant_email) {
        payload.tenant_email = form.tenant_email;
      }
      if (form.start_date) {
        payload.start_date = form.start_date;
      }
      if (form.end_date) {
        payload.end_date = form.end_date;
      }

      await api.post('/landlords/leases', payload);
      setMessage('Lease created successfully.');
      setForm({ tenant_id: '', tenant_email: '', unit_id: '', monthly_rent: '', start_date: '', end_date: '', status: 'ACTIVE' });
      await loadLeases();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to create lease.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectLease = (lease: any) => {
    setSelectedLease(lease);
    setUpdateForm({
      monthly_rent: lease.monthly_rent?.toString() ?? '',
      end_date: lease.end_date || '',
      status: lease.status || 'ACTIVE',
    });
    setMessage(null);
    setError(null);
  };

  const handleUpdateLease = async () => {
    if (!selectedLease) {
      setError('Pick a lease to update.');
      return;
    }

    const payload: Record<string, unknown> = {};
    if (updateForm.monthly_rent) {
      payload.monthly_rent = Number(updateForm.monthly_rent);
    }
    if (updateForm.end_date) {
      payload.end_date = updateForm.end_date;
    }
    if (updateForm.status) {
      payload.status = updateForm.status;
    }

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
      if (selectedLease?.id === leaseId) {
        setSelectedLease(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to delete lease.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-slate-50 p-8">Loading landlord workspace...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Lease management</p>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Leases</h1>
              <p className="mt-2 text-sm text-slate-600">
                Create, update, and manage active leases for your portfolio.
              </p>
            </div>
            <button onClick={() => router.push('/landlord')} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
              Back
            </button>
          </div>
        </div>

        {(error || message) && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Create new lease</h2>
                <p className="mt-2 text-sm text-slate-500">Link a tenant to an available unit and schedule rent details.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                placeholder="Tenant ID"
                value={form.tenant_id}
                onChange={(e) => setForm((prev) => ({ ...prev, tenant_id: e.target.value }))}
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />
              <input
                placeholder="Tenant email (optional)"
                value={form.tenant_email}
                onChange={(e) => setForm((prev) => ({ ...prev, tenant_email: e.target.value }))}
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />
              <select
                value={form.unit_id}
                onChange={(e) => setForm((prev) => ({ ...prev, unit_id: e.target.value }))}
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              >
                <option value="">Select an available unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unit_identifier} — {unit.property_name} — N${Number(unit.monthly_rent || 0).toLocaleString()}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Monthly rent"
                value={form.monthly_rent}
                onChange={(e) => setForm((prev) => ({ ...prev, monthly_rent: e.target.value }))}
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />
              <input
                type="date"
                placeholder="Start date"
                value={form.start_date}
                onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />
              <input
                type="date"
                placeholder="End date"
                value={form.end_date}
                onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />
            </div>
            <button
              onClick={handleCreateLease}
              disabled={isLoading}
              className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isLoading ? 'Saving...' : 'Create lease'}
            </button>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Selected lease</h2>
              <p className="mt-2 text-sm text-slate-500">Update rent, term, or status for an existing lease.</p>
            </div>
            {!selectedLease ? (
              <div className="rounded-3xl bg-slate-50 p-6 text-sm text-slate-600">Select a lease from the list to manage it.</div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-600">Lease ID</p>
                  <p className="mt-1 font-semibold text-slate-900">{selectedLease.id}</p>
                  <p className="mt-2 text-sm text-slate-600">Tenant: {selectedLease.tenant_name || selectedLease.tenant_id}</p>
                  <p className="mt-1 text-sm text-slate-600">Unit: {selectedLease.unit_identifier || selectedLease.unit_id}</p>
                </div>
                <div className="grid gap-4">
                  <input
                    type="number"
                    placeholder="Monthly rent"
                    value={updateForm.monthly_rent}
                    onChange={(e) => setUpdateForm((prev) => ({ ...prev, monthly_rent: e.target.value }))}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                  />
                  <input
                    type="date"
                    value={updateForm.end_date}
                    onChange={(e) => setUpdateForm((prev) => ({ ...prev, end_date: e.target.value }))}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                  />
                  <select
                    value={updateForm.status}
                    onChange={(e) => setUpdateForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ENDED">Ended</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleUpdateLease}
                    disabled={isLoading}
                    className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isLoading ? 'Saving...' : 'Update lease'}
                  </button>
                  <button
                    onClick={() => selectedLease && handleEndLease(selectedLease.id)}
                    disabled={isLoading}
                    className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Terminate lease
                  </button>
                  <button
                    onClick={() => selectedLease && handleDeleteLease(selectedLease.id)}
                    disabled={isLoading}
                    className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Delete lease
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Lease roster</h2>
              <p className="mt-2 text-sm text-slate-500">All leases in your portfolio, including active, ended, and terminated contracts.</p>
            </div>
            <button
              type="button"
              onClick={loadLeases}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-4">
            {leases.length ? (
              leases.map((lease) => (
                <button
                  key={lease.id}
                  type="button"
                  onClick={() => handleSelectLease(lease)}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-slate-300"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{lease.tenant_name || lease.tenant_id}</p>
                      <p className="mt-1 text-sm text-slate-600">Unit {lease.unit_identifier || lease.unit_id}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700">
                      {lease.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <p className="text-sm text-slate-600">Rent: N${Number(lease.monthly_rent || 0).toLocaleString()}</p>
                    <p className="text-sm text-slate-600">Start: {lease.start_date || 'N/A'}</p>
                    <p className="text-sm text-slate-600">End: {lease.end_date || 'N/A'}</p>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-500">No leases found. Create one to get started.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
