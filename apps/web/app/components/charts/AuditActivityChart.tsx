'use client';

import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Point = { day: string; admin_actions: number; errors: number };

export default function AuditActivityChart({ data }: { data: Point[] }) {
  if (!data.length) {
    return <p className="flex h-full items-center justify-center text-sm text-[var(--rc-text-muted)]">No audit data</p>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="auditActionsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1a2e" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#1a1a2e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="auditErrorsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c0392b" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#c0392b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--rc-border)" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--rc-text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--rc-text-muted)' }} axisLine={false} tickLine={false} width={32} />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: '1px solid var(--rc-border)',
            background: 'var(--rc-card)',
          }}
        />
        <Area type="monotone" dataKey="admin_actions" stroke="#1a1a2e" strokeWidth={2} fill="url(#auditActionsFill)" name="Actions" />
        <Line type="monotone" dataKey="errors" stroke="#C0392B" strokeWidth={2.5} dot={false} name="Errors" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
