'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileText, RefreshCw } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import TenantPageHeader from '../../components/ui/TenantPageHeader';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import { TenantWorkspaceLoading } from '../../components/ui/WorkspaceLoading';

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

type ReportMeta = {
  storage_path?: string;
  generated_at?: string;
};

export default function TenantReportsPage() {
  const { user, loading, roleReady } = useAuth();
  const router = useRouter();
  const [latestReport, setLatestReport] = useState<ReportMeta | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [creditLoading, setCreditLoading] = useState(false);
  const [shareExpiryDays, setShareExpiryDays] = useState(30);
  const [shareRef, setShareRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!loading && roleReady && !user) router.replace('/auth');
    if (!loading && roleReady && user) void loadLatestReport();
  }, [loading, roleReady, user, router]);

  const loadLatestReport = useCallback(async () => {
    setPageLoading(true);
    try {
      const res = await api.get('/tenants/me');
      setLatestReport(res.data?.data?.latestReport ?? null);
    } catch {
      setLatestReport(null);
    } finally {
      setPageLoading(false);
    }
  }, []);

  const handleDownloadTenantReport = async () => {
    setDownloadLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await api.get('/reports/tenant/download', { responseType: 'blob' });
      downloadPdf(new Blob([response.data], { type: 'application/pdf' }), 'crenit-tenant-report.pdf');
      setMessage('Rent payment report downloaded.');
      await loadLatestReport();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Unable to download tenant report.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleDownloadCreditReport = async () => {
    setCreditLoading(true);
    setError(null);
    setMessage(null);
    setShareRef(null);
    try {
      const response = await api.post('/reports/credit-score/share', { expiry_days: shareExpiryDays }, { responseType: 'blob' });
      downloadPdf(new Blob([response.data], { type: 'application/pdf' }), 'crenit-credit-report.pdf');
      const ref = response.headers?.['x-report-reference'];
      const exp = response.headers?.['x-report-expires-at'];
      setShareRef(ref ? `Reference ${ref}${exp ? ` · valid until ${new Date(exp).toLocaleDateString()}` : ''}` : null);
      setMessage('Shareable credit report downloaded — includes verification QR.');
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Unable to download credit score report.');
    } finally {
      setCreditLoading(false);
    }
  };

  if (loading || !roleReady || !user) {
    return <TenantWorkspaceLoading />;
  }

  return (
    <div className="space-y-6">
      <TenantPageHeader
        badge="Reports"
        title="My reports"
        subtitle="Download bank-ready PDFs for your rent payment history and CRENIT credit score."
        actions={
          <button type="button" onClick={() => void loadLatestReport()} className="tenant-btn-secondary">
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={() => void loadLatestReport()} /> : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p>
      ) : null}

      {pageLoading ? (
        <SkeletonBlocks rows={3} />
      ) : !latestReport?.generated_at ? (
        <EmptyStateCard
          title="No reports generated yet"
          description="Download your first payment or credit score report below. PDFs are formatted for landlords and lenders."
        />
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="tenant-panel">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#C0392B]" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Rent payment report</p>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Verified payment history and lease summary formatted for lenders and landlords.
          </p>
          <button
            type="button"
            onClick={() => void handleDownloadTenantReport()}
            disabled={downloadLoading}
            className="tenant-btn-primary mt-6"
          >
            <Download className="h-4 w-4" aria-hidden />
            {downloadLoading ? 'Generating…' : 'Download payment report'}
          </button>
        </section>

        <section className="tenant-panel">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#C0392B]" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Credit score report</p>
          </div>
          <p className="mt-3 text-sm text-slate-600">Polished PDF with tier badge, QR verification, and expiry for landlords or lenders.</p>
          <label className="mt-4 block text-sm text-slate-600">
            Link valid for (days):{' '}
            <select
              value={shareExpiryDays}
              onChange={(e) => setShareExpiryDays(Number(e.target.value))}
              className="ml-2 rounded-lg border border-slate-300 px-2 py-1"
            >
              <option value={14}>14</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
              <option value={90}>90</option>
            </select>
          </label>
          {shareRef ? <p className="mt-2 text-xs text-emerald-800">{shareRef}</p> : null}
          <button
            type="button"
            onClick={() => void handleDownloadCreditReport()}
            disabled={creditLoading}
            className="tenant-btn-secondary mt-6"
          >
            <Download className="h-4 w-4" aria-hidden />
            {creditLoading ? 'Generating…' : 'Download score report'}
          </button>
        </section>
      </div>

      {latestReport?.generated_at ? (
        <p className="text-sm text-slate-500">
          Last payment report generated: {new Date(latestReport.generated_at).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}
