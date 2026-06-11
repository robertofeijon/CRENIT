'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Point = { day: string; admin_actions: number; errors: number };

export default function AuditActivityChart({ data }: { data: Point[] }) {
  if (!data.length) {
    return <p className="flex h-full items-center justify-center text-sm text-slate-400">No audit data</p>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
        <Tooltip />
        <Line type="monotone" dataKey="admin_actions" stroke="#1A1A1A" strokeWidth={2} dot={false} name="Actions" />
        <Line type="monotone" dataKey="errors" stroke="#C0392B" strokeWidth={2} dot={false} name="Errors" />
      </LineChart>
    </ResponsiveContainer>
  );
}
