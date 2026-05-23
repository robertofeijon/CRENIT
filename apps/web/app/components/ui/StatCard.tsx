import type { ReactNode } from 'react';

export default function StatCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  sub?: string;
}) {
  return (
    <div className="rc-card flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        {icon ? <span className="text-gray-400">{icon}</span> : null}
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-gray-500">{sub}</p> : null}
    </div>
  );
}
