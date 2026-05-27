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

type ReportMeta = {
  storage_path?: string;
  generated_at?: string;
};

export default function TenantReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [latestReport, setLatestReport] = useState<ReportMeta | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [creditLoading, setCreditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
      return;
    }

    if (!loading && user) {
      loadLatestReport();
    }
  }, [loading, user, router]);

  const loadLatestReport = async () => {
    try {
      const res = await api.get('/tenants/me');
      setLatestReport(res.data?.data?.latestReport ?? null);
    } catch {
      setLatestReport(null);
    }
  };

  const handleDownloadTenantReport = async () => {
    setDownloadLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await api.get('/reports/tenant/download', { responseType: 'blob' });
      downloadPdf(new Blob([response.data], { type: 'application/pdf' }), 'rentcredit-tenant-report.pdf');
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

    try {
      const response = await api.get('/reports/credit-score', { responseType: 'blob' });
      downloadPdf(new Blob([response.data], { type: 'application/pdf' }), 'rentcredit-score-report.pdf');
      setMessage('Credit score report downloaded.');
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Unable to download credit score report.');
    } finally {
      setCreditLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
        <p className="mt-3 text-sm text-slate-600">
          Download bank-ready PDFs for your rent payment history and RentCredit score.
        </p>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Rent payment report</p>
            <p className="mt-3 text-sm text-slate-600">
              Verified payment history and lease summary formatted for lenders and landlords.
            </p>
            <button
              type="button"
              onClick={handleDownloadTenantReport}
              disabled={downloadLoading}
              className="mt-6 rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white hover:bg-[#992d24] disabled:opacity-60"
            >
              {downloadLoading ? 'Generating report...' : 'Download payment report'}
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Credit score report</p>
            <p className="mt-3 text-sm text-slate-600">
              Score breakdown by factor, tier, and recent history for financial partners.
            </p>
            <button
              type="button"
              onClick={handleDownloadCreditReport}
              disabled={creditLoading}
              className="mt-6 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60"
            >
              {creditLoading ? 'Generating report...' : 'Download score report'}
            </button>
          </div>
        </div>

        {latestReport?.generated_at ? (
          <p className="mt-6 text-sm text-slate-500">
            Last payment report generated: {new Date(latestReport.generated_at).toLocaleString()}
          </p>
        ) : (
          <p className="mt-6 text-sm text-slate-500">No reports generated yet. Download your first report above.</p>
        )}
      </div>
    </main>
  );
}
