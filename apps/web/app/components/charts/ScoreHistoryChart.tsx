'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Point = { recorded_at: string; score: number };

export default function ScoreHistoryChart({ data }: { data: Point[] }) {
  if (!data.length) {
    return <p className="flex h-full items-center justify-center text-xs text-slate-500">No history yet</p>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="recorded_at" tickFormatter={(v) => String(v).slice(0, 10)} fontSize={10} />
        <YAxis domain={[300, 900]} fontSize={10} />
        <Tooltip />
        <Line type="monotone" dataKey="score" stroke="#C0392B" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
