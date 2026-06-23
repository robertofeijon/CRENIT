'use client';

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type SuburbIntelligence = {
  rent_distribution?: Array<{ range: string; count: number }>;
  on_time_trend?: Array<{ month: string; on_time_rate: number }>;
  bedroom_breakdown?: Array<{ label: string; bedrooms: number; avg_rent?: number; sample_count?: number }>;
};

type PricePoint = { snapshot_date?: string; avg_rent?: number };

type LandlordSuburbIntelligenceChartsProps = {
  intelligence?: SuburbIntelligence;
  priceHistory?: PricePoint[];
  maxRent?: number;
};

export default function LandlordSuburbIntelligenceCharts({
  intelligence,
  priceHistory = [],
  maxRent,
}: LandlordSuburbIntelligenceChartsProps) {
  const rentDist = intelligence?.rent_distribution ?? [];
  const onTimeTrend = (intelligence?.on_time_trend ?? []).slice(-8);
  const priceTrend = priceHistory.slice(-8).map((p) => ({
    month: p.snapshot_date?.slice(5, 7) ?? '—',
    rent: Number(p.avg_rent || 0),
  }));
  const bedroomData = (intelligence?.bedroom_breakdown ?? []).filter((r) => r.avg_rent != null);

  const hasAny = rentDist.length > 0 || onTimeTrend.length > 0 || priceTrend.length > 0 || bedroomData.length > 0;
  if (!hasAny) return null;

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      {rentDist.length > 0 ? (
        <article className="chart-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rc-text-muted)]">Distribution</p>
          <h3 className="mt-1 text-sm font-semibold text-[var(--rc-text)]">Rent bands</h3>
          <div className="mt-3 h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rentDist} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--rc-border)" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 9, fill: 'var(--rc-text-muted)' }} interval={0} angle={-25} textAnchor="end" height={48} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                <Tooltip />
                <Bar dataKey="count" fill="#1a1a2e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      ) : null}

      {onTimeTrend.length > 0 ? (
        <article className="chart-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rc-text-muted)]">Behaviour</p>
          <h3 className="mt-1 text-sm font-semibold text-[var(--rc-text)]">On-time rate by month</h3>
          <div className="mt-3 h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={onTimeTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--rc-border)" vertical={false} />
                <XAxis dataKey="month" tickFormatter={(v) => String(v).slice(5)} tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={32} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'On-time']} />
                <Line type="monotone" dataKey="on_time_rate" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      ) : null}

      {priceTrend.length > 0 ? (
        <article className="chart-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rc-text-muted)]">Trend</p>
          <h3 className="mt-1 text-sm font-semibold text-[var(--rc-text)]">Average rent by month</h3>
          <div className="mt-3 h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priceTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--rc-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={48} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: number) => [`N$${v.toLocaleString()}`, 'Avg rent']} />
                <Bar dataKey="rent" radius={[6, 6, 0, 0]}>
                  {priceTrend.map((_, i) => (
                    <Cell key={i} fill="#c0392b" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      ) : null}

      {bedroomData.length > 0 ? (
        <article className="chart-card">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rc-text-muted)]">Mix</p>
          <h3 className="mt-1 text-sm font-semibold text-[var(--rc-text)]">Rent by bedroom</h3>
          <div className="mt-3 h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bedroomData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--rc-border)" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={56} />
                <Tooltip formatter={(v: number) => [`N$${v.toLocaleString()}`, 'Avg rent']} />
                <Bar dataKey="avg_rent" fill="#1a1a2e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      ) : null}
    </div>
  );
}
