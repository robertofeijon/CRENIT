"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

const downloadPdf = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default function LandlordReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [tenantReportLoading, setTenantReportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
      return;
    }

    if (!loading && user) {
      loadTenants();
    }
  }, [loading, user, router]);

  const loadTenants = async () => {
    setIsLoadingTenants(true);
    setError(null);
    try {
      const response = await api.get('/landlords/tenants');
      const list = response.data.data || [];
      setTenants(list);
      if (list.length && !selectedTenantId) {
        setSelectedTenantId(list[0].tenantId);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load tenants.');
    } finally {
      setIsLoadingTenants(false);
    }
  };

  const handleDownloadPortfolio = async () => {
    setPortfolioLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await api.get('/reports/landlord/portfolio', {
        params: reportMonth ? { month: reportMonth } : undefined,
        responseType: 'blob',
      });
      downloadPdf(new Blob([response.data], { type: 'application/pdf' }), `rentcredit-portfolio-${reportMonth || 'all'}.pdf`);
      setMessage('Portfolio report downloaded.');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to download portfolio report.');
    } finally {
      setPortfolioLoading(false);
    }
  };

  const handleDownloadTenantReport = async () => {
    if (!selectedTenantId) {
      setError('Select a tenant for the per-tenant report.');
      return;
    }

    setTenantReportLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await api.get(`/reports/landlord/tenant/${selectedTenantId}`, {
        responseType: 'blob',
      });
      downloadPdf(new Blob([response.data], { type: 'application/pdf' }), `rentcredit-tenant-${selectedTenantId}.pdf`);
      setMessage('Tenant payment report downloaded.');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to download tenant report.');
    } finally {
      setTenantReportLoading(false);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-slate-50 p-8">Preparing reports...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
              <p className="mt-3 text-sm text-slate-600">Export portfolio and per-tenant payment reports as PDF.</p>
            </div>
            <button
              onClick={() => router.push('/landlord')}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Back to dashboard
            </button>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Portfolio summary report</h2>
          <p className="mt-2 text-sm text-slate-500">Download a PDF summary of rent collections for a selected month.</p>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700">Report month</label>
              <input
                type="month"
                value={reportMonth}
                onChange={(event) => setReportMonth(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleDownloadPortfolio}
              disabled={portfolioLoading}
              className="rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {portfolioLoading ? 'Generating...' : 'Download portfolio PDF'}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Per-tenant payment report</h2>
          <p className="mt-2 text-sm text-slate-500">Export payment history for a specific tenant in your portfolio.</p>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700">Tenant</label>
              <select
                value={selectedTenantId}
                onChange={(event) => setSelectedTenantId(event.target.value)}
                disabled={isLoadingTenants || !tenants.length}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none disabled:opacity-60"
              >
                {tenants.length ? (
                  tenants.map((tenant) => (
                    <option key={tenant.tenantId} value={tenant.tenantId}>
                      {tenant.tenantName}
                    </option>
                  ))
                ) : (
                  <option value="">No tenants available</option>
                )}
              </select>
            </div>
            <button
              onClick={handleDownloadTenantReport}
              disabled={tenantReportLoading || !selectedTenantId}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {tenantReportLoading ? 'Generating...' : 'Download tenant PDF'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
