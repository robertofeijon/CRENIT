'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Percent, RefreshCw, TrendingUp, Users } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import LandlordPageHeader from '../../components/ui/LandlordPageHeader';
import LandlordStatCard from '../../components/ui/LandlordStatCard';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import { formatN$ } from '../../components/landlord/landlordUi';

export default function LandlordMarketDataPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [suburbs, setSuburbs] = useState<any[]>([]);
  const [selectedSuburb, setSelectedSuburb] = useState('');
  const [suburbDetails, setSuburbDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role && role !== 'LANDLORD' && role !== 'ADMIN') router.replace('/tenant/home');
  }, [loading, user, role, router]);

  const loadMarketData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryRes, suburbsRes] = await Promise.all([api.get('/market-data/summary'), api.get('/market-data/suburbs')]);
      setSummary(summaryRes.data.data);
      const list = suburbsRes.data.data || [];
      setSuburbs(list);
      if (list.length && !selectedSuburb) setSelectedSuburb(list[0].suburb);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load market data.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSuburb]);

  const loadSuburbDetails = useCallback(async (suburb: string) => {
    if (!suburb) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/market-data/suburbs/${encodeURIComponent(suburb)}`);
      setSuburbDetails(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load suburb details.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) void loadMarketData();
  }, [user, role, loadMarketData]);

  useEffect(() => {
    if (selectedSuburb) void loadSuburbDetails(selectedSuburb);
  }, [selectedSuburb, loadSuburbDetails]);

  if (loading || !user) {
    return <p className="text-sm text-slate-500">Loading partner workspace…</p>;
  }

  return (
    <div className="space-y-6">
      <LandlordPageHeader
        badge="Intelligence"
        title="Market intelligence"
        subtitle="Suburb rent benchmarks, on-time rates, and trends."
        actions={
          <button type="button" onClick={() => void loadMarketData()} disabled={isLoading} className="landlord-btn-secondary">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={loadMarketData} /> : null}

      {summary ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <LandlordStatCard label="Suburbs tracked" value={summary.suburb_count} icon={MapPin} />
          <LandlordStatCard label="Avg rent" value={formatN$(summary.average_rent)} icon={TrendingUp} accent="dark" />
          <LandlordStatCard label="On-time rate" value={`${Math.round(Number(summary.on_time_rate || 0))}%`} icon={Percent} accent="success" />
          <LandlordStatCard label="Sample size" value={summary.total_sample_count} icon={Users} />
        </section>
      ) : null}

      <section className="landlord-panel">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Suburb explorer</h2>
        {isLoading && !suburbs.length ? (
          <div className="mt-4">
            <SkeletonBlocks rows={4} />
          </div>
        ) : suburbs.length ? (
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {suburbs.map((entry) => (
                <button
                  key={`${entry.suburb}-${entry.city}`}
                  type="button"
                  onClick={() => setSelectedSuburb(entry.suburb)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                    selectedSuburb === entry.suburb
                      ? 'border-[#C0392B] bg-[#FDEDEC] text-[#1A1A1A]'
                      : 'border-slate-100 bg-[#F3F4F6] text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <p className="font-semibold">{entry.suburb}</p>
                  <p className="mt-1 text-xs opacity-80">
                    {entry.city} · {formatN$(entry.avg_rent)} avg
                  </p>
                </button>
              ))}
            </div>
            {suburbDetails ? (
              <div className="rounded-xl border border-slate-100 bg-[#F3F4F6] p-5">
                <p className="text-lg font-semibold text-[#1A1A1A]">
                  {suburbDetails.suburb}, {suburbDetails.city}
                </p>
                <p className="mt-2 text-sm capitalize text-slate-600">Trend: {suburbDetails.trend}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <p className="text-sm">Avg rent: {formatN$(suburbDetails.latest_snapshot?.avg_rent)}</p>
                  <p className="text-sm">Median: {formatN$(suburbDetails.latest_snapshot?.median_rent)}</p>
                  <p className="text-sm">On-time: {Math.round(Number(suburbDetails.latest_snapshot?.on_time_rate || 0))}%</p>
                  <p className="text-sm">Avg days to pay: {suburbDetails.latest_snapshot?.avg_days_to_pay}</p>
                </div>
                {suburbDetails.price_history?.length ? (
                  <div className="mt-6 flex items-end gap-1" style={{ minHeight: 120 }}>
                    {suburbDetails.price_history.slice(-8).map((point: any, i: number) => (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-[#C0392B]/80"
                          style={{
                            height: `${Math.max(8, (Number(point.avg_rent) / Number(suburbDetails.latest_snapshot?.max_rent || point.avg_rent || 1)) * 80)}px`,
                          }}
                        />
                        <span className="text-[10px] text-slate-500">{point.snapshot_date?.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyStateCard title="Select a suburb" description="Choose a suburb from the list to view details." />
            )}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyStateCard title="No market data" description="Market intelligence data is not yet available." />
          </div>
        )}
      </section>
    </div>
  );
}
