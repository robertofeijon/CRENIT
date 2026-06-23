import type { LucideIcon } from 'lucide-react';

export default function LandlordStatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'default',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  accent?: 'default' | 'warning' | 'success' | 'dark';
}) {
  const cardClass = {
    default: 'dashboard-stat-card',
    warning: 'dashboard-stat-card dashboard-stat-card--warning',
    success: 'dashboard-stat-card dashboard-stat-card--success',
    dark: 'dashboard-stat-card dashboard-stat-card--dark',
  }[accent];

  const labelClass = accent === 'dark' ? 'text-slate-400' : 'text-[var(--rc-text-muted)]';
  const valueClass = accent === 'dark' ? 'text-white' : 'text-[var(--rc-text)]';
  const subClass = accent === 'dark' ? 'text-slate-400' : 'text-[var(--rc-text-secondary)]';

  return (
    <div className={cardClass}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${labelClass}`}>{label}</p>
        {Icon ? (
          <span className="dashboard-stat-card__icon">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className={`mt-4 text-2xl font-semibold tabular-nums ${valueClass}`}>{value}</p>
      {sub ? <p className={`mt-1 text-xs ${subClass}`}>{sub}</p> : null}
    </div>
  );
}
