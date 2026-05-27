"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function VerifyReportPage() {
  const params = useParams<{ reference: string }>();
  const reference = params?.reference;
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/reports/verify/${reference}`);
        const json = await res.json();
        if (active) setResult(json?.data || null);
      } catch {
        if (active) setResult({ authentic: false, message: 'Report not found' });
      } finally {
        if (active) setLoading(false);
      }
    };
    if (reference) load();
    return () => {
      active = false;
    };
  }, [reference]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">RentCredit Report Verification</h1>
        <p className="mt-2 text-sm text-slate-600">Reference: {reference}</p>
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading data...</p> : null}
        {!loading && result?.authentic ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="font-semibold text-emerald-800">This report is authentic.</p>
            <p className="mt-2 text-sm text-emerald-900">Score: {result.score}</p>
            <p className="text-sm text-emerald-900">Tier: {result.tier}</p>
            <p className="text-sm text-emerald-900">Generated: {new Date(result.generated_at).toLocaleString()}</p>
            <p className="mt-2 text-sm text-emerald-900">Tenant verified: Yes</p>
          </div>
        ) : null}
        {!loading && !result?.authentic ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <p className="font-semibold text-rose-800">Report not found.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
