'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type LandlordPortfolioChartsProps = {
  stats: {
    monthlyRentExpected?: number;
    collectedThisMonth?: number;
    outstanding?: number;
  };
  recentPayments?: Array<{ status?: string; amount_gross?: number }>;
};

const STATUS_COLORS: Record<string, string> = {
  PAID: '#16a34a',
  PENDING: '#f59e0b',
  OVERDUE: '#c0392b',
  PARTIAL: '#6366f1',
};

export default function LandlordPortfolioCharts({ stats, recentPayments = [] }: LandlordPortfolioChartsProps) {
  const expected = Number(stats.monthlyRentExpected || 0);
  const collected = Number(stats.collectedThisMonth || 0);
  const outstanding = Number(stats.outstanding || 0);
  const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

  const collectionData = [
    { name: 'Collected', value: collected, fill: '#16a34a' },
    { name: 'Outstanding', value: outstanding, fill: '#c0392b' },
  ].filter((d) => d.value > 0);

  const statusCounts = recentPayments.reduce<Record<string, number>>((acc, p) => {
    const key = (p.status || 'PENDING').toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
    fill: STATUS_COLORS[name] || '#94a3b8',
  }));

  const hasCollection = expected > 0 || collected > 0 || outstanding > 0;
  const hasStatus = statusData.length > 0;

  if (!hasCollection && !hasStatus) {
    return (
      <section className="chart-card">
        <p className="text-sm text-[var(--rc-text-muted)]">Charts appear once rent is expected or payments are recorded.</p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="chart-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rc-text-muted)]">This month</p>
            <h2 className="mt-2 text-lg font-semibold text-[var(--rc-text)]">Rent collection</h2>
          </div>
          <span className="rounded-full bg-[var(--rc-accent-surface)] px-3 py-1 text-sm font-semibold text-[#C0392B]">
            {collectionRate}%
          </span>
        </div>
        {hasCollection ? (
          <div className="mt-4 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { label: 'Expected', amount: expected },
                  { label: 'Collected', amount: collected },
                  { label: 'Outstanding', amount: outstanding },
                ]}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--rc-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--rc-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--rc-text-muted)' }} axisLine={false} tickLine={false} width={48} />
                <Tooltip
                  formatter={(v: number) => [`N$${v.toLocaleString()}`, 'Amount']}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--rc-border)',
                    background: 'var(--rc-card)',
                  }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {['#1a1a2e', '#16a34a', '#c0392b'].map((fill, i) => (
                    <Cell key={i} fill={fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-6 text-sm text-[var(--rc-text-muted)]">Set expected rent on active leases to see collection.</p>
        )}
        {collectionData.length > 0 ? (
          <div className="mt-2 flex h-[120px] items-center justify-center gap-6">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie data={collectionData} dataKey="value" innerRadius={36} outerRadius={52} paddingAngle={3}>
                  {collectionData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `N$${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="space-y-1 text-xs text-[var(--rc-text-secondary)]">
              {collectionData.map((d) => (
                <li key={d.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} />
                  {d.name}: N${d.value.toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </article>

      <article className="chart-card">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rc-text-muted)]">Recent activity</p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--rc-text)]">Payment status mix</h2>
        {hasStatus ? (
          <div className="mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--rc-border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={72} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-6 text-sm text-[var(--rc-text-muted)]">Status breakdown from your latest payment ledger entries.</p>
        )}
      </article>
    </section>
  );
}
