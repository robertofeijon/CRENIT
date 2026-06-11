'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileBarChart, RefreshCw, Users } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import LandlordPageHeader from '../../components/ui/LandlordPageHeader';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import { LandlordWorkspaceLoading } from '../../components/ui/WorkspaceLoading';
import { landlordInputClass, landlordSelectClass } from '../../components/landlord/landlordUi';

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
  const { user, role, loading } = useAuth();
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
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role && role !== 'LANDLORD' && role !== 'ADMIN') router.replace('/tenant/home');
  }, [loading, user, role, router]);

  const loadTenants = useCallback(async () => {
    setIsLoadingTenants(true);
    setError(null);
    try {
      const response = await api.get('/landlords/tenants');
      const list = response.data.data || [];
      setTenants(list);
      if (list.length && !selectedTenantId) setSelectedTenantId(list[0].tenantId);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load tenants.');
    } finally {
      setIsLoadingTenants(false);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) void loadTenants();
  }, [user, role, loadTenants]);

  const handleDownloadPortfolio = async () => {
    setPortfolioLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await api.get('/reports/landlord/portfolio', {
        params: reportMonth ? { month: reportMonth } : undefined,
        responseType: 'blob',
      });
      downloadPdf(new Blob([response.data], { type: 'application/pdf' }), `crenit-portfolio-${reportMonth || 'all'}.pdf`);
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
      const response = await api.get(`/reports/landlord/tenant/${selectedTenantId}`, { responseType: 'blob' });
      downloadPdf(new Blob([response.data], { type: 'application/pdf' }), `crenit-tenant-${selectedTenantId}.pdf`);
      setMessage('Tenant payment report downloaded.');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to download tenant report.');
    } finally {
      setTenantReportLoading(false);
    }
  };

  if (loading || !user) {
    return <LandlordWorkspaceLoading />;
  }

  return (
    <div className="space-y-6">
      <LandlordPageHeader
        badge="Finance"
        title="Reports"
        subtitle="Export portfolio and per-tenant payment reports as PDF."
        actions={
          <button type="button" onClick={() => void loadTenants()} disabled={isLoadingTenants} className="landlord-btn-secondary">
            <RefreshCw className={`h-4 w-4 ${isLoadingTenants ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={loadTenants} /> : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p>
      ) : null}

      <section className="landlord-panel">
        <div className="flex items-center gap-2">
          <FileBarChart className="h-5 w-5 text-[#C0392B]" aria-hidden />
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Portfolio summary report</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">Download a PDF summary of rent collections for a selected month.</p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Report month</label>
            <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className={`${landlordInputClass} mt-2`} />
          </div>
          <button type="button" onClick={handleDownloadPortfolio} disabled={portfolioLoading} className="landlord-btn-primary">
            <Download className="h-4 w-4" aria-hidden />
            {portfolioLoading ? 'Generating…' : 'Download portfolio PDF'}
          </button>
        </div>
      </section>

      <section className="landlord-panel">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#C0392B]" aria-hidden />
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Per-tenant payment report</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">Export payment history for a specific tenant in your portfolio.</p>
        {isLoadingTenants ? (
          <div className="mt-4">
            <SkeletonBlocks rows={2} />
          </div>
        ) : tenants.length ? (
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tenant</label>
              <select value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)} className={`${landlordSelectClass} mt-2`}>
                {tenants.map((tenant) => (
                  <option key={tenant.tenantId} value={tenant.tenantId}>{tenant.tenantName}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={handleDownloadTenantReport} disabled={tenantReportLoading || !selectedTenantId} className="landlord-btn-secondary">
              <Download className="h-4 w-4" aria-hidden />
              {tenantReportLoading ? 'Generating…' : 'Download tenant PDF'}
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyStateCard title="No tenants" description="Add tenants with active leases to generate per-tenant reports." />
          </div>
        )}
      </section>
    </div>
  );
}
