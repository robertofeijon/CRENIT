"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function LandlordMarketDataPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [suburbs, setSuburbs] = useState<any[]>([]);
  const [selectedSuburb, setSelectedSuburb] = useState('');
  const [suburbDetails, setSuburbDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user) loadMarketData();
  }, [loading, user, router]);

  const loadMarketData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryRes, suburbsRes] = await Promise.all([api.get('/market-data/summary'), api.get('/market-data/suburbs')]);
      setSummary(summaryRes.data.data);
      const list = suburbsRes.data.data || [];
      setSuburbs(list);
      if (list.length && !selectedSuburb) {
        setSelectedSuburb(list[0].suburb);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load market data.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuburbDetails = async (suburb: string) => {
    if (!suburb) return;
    setSelectedSuburb(suburb);
    setIsLoading(true);
    try {
      const res = await api.get(`/market-data/suburbs/${encodeURIComponent(suburb)}`);
      setSuburbDetails(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load suburb details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSuburb) loadSuburbDetails(selectedSuburb);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSuburb]);

  if (loading || !user) {
    return <div className="min-h-screen bg-slate-50 p-8">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Market intelligence</h1>
              <p className="mt-3 text-sm text-slate-600">Suburb rent benchmarks, on-time rates, and trends.</p>
            </div>
            <button onClick={() => router.push('/landlord')} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
              Back
            </button>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {summary ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-widest text-slate-500">Suburbs tracked</p>
              <p className="mt-2 text-2xl font-semibold">{summary.suburb_count}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-widest text-slate-500">Avg rent</p>
              <p className="mt-2 text-2xl font-semibold">N${Number(summary.average_rent || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-widest text-slate-500">On-time rate</p>
              <p className="mt-2 text-2xl font-semibold">{Math.round(Number(summary.on_time_rate || 0))}%</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-widest text-slate-500">Sample size</p>
              <p className="mt-2 text-2xl font-semibold">{summary.total_sample_count}</p>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Suburb explorer</h2>
          {isLoading && !suburbs.length ? (
            <p className="mt-4 text-sm text-slate-500">Loading...</p>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {suburbs.map((entry) => (
                  <button
                    key={`${entry.suburb}-${entry.city}`}
                    onClick={() => setSelectedSuburb(entry.suburb)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      selectedSuburb === entry.suburb ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-white'
                    }`}
                  >
                    <p className="font-semibold">{entry.suburb}</p>
                    <p className="mt-1 text-xs opacity-80">{entry.city} · N${Number(entry.avg_rent || 0).toLocaleString()} avg</p>
                  </button>
                ))}
              </div>
              {suburbDetails ? (
                <div className="rounded-3xl bg-slate-50 p-6">
                  <p className="text-lg font-semibold text-slate-900">{suburbDetails.suburb}, {suburbDetails.city}</p>
                  <p className="mt-2 text-sm capitalize text-slate-600">Trend: {suburbDetails.trend}</p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <p className="text-sm">Avg rent: N${Number(suburbDetails.latest_snapshot?.avg_rent || 0).toLocaleString()}</p>
                    <p className="text-sm">Median: N${Number(suburbDetails.latest_snapshot?.median_rent || 0).toLocaleString()}</p>
                    <p className="text-sm">On-time: {Math.round(Number(suburbDetails.latest_snapshot?.on_time_rate || 0))}%</p>
                    <p className="text-sm">Avg days to pay: {suburbDetails.latest_snapshot?.avg_days_to_pay}</p>
                  </div>
                  {suburbDetails.price_history?.length ? (
                    <div className="mt-8 flex items-end gap-1" style={{ minHeight: 120 }}>
                      {suburbDetails.price_history.slice(-8).map((point: any, i: number) => (
                        <div key={i} className="flex flex-1 flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t bg-brand-red/80"
                            style={{ height: `${Math.max(8, (Number(point.avg_rent) / Number(suburbDetails.latest_snapshot?.max_rent || point.avg_rent || 1)) * 80)}px` }}
                          />
                          <span className="text-[10px] text-slate-500">{point.snapshot_date?.slice(5)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Select a suburb to view details.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
