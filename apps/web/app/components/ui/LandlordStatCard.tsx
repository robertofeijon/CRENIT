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
  const accentClasses = {
    default: 'border-slate-200 bg-white',
    warning: 'border-amber-200 bg-amber-50',
    success: 'border-emerald-200 bg-emerald-50',
    dark: 'border-[#1A1A1A] bg-[#1A1A1A] text-white',
  }[accent];

  const labelClass = accent === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const valueClass = accent === 'dark' ? 'text-white' : 'text-[#1A1A1A]';
  const subClass = accent === 'dark' ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`rounded-[1.5rem] border p-5 shadow-sm ${accentClasses}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${labelClass}`}>{label}</p>
        {Icon ? (
          <span className={`rounded-full p-2 ${accent === 'dark' ? 'bg-white/10' : 'bg-[#FDEDEC]'}`}>
            <Icon className={`h-4 w-4 ${accent === 'dark' ? 'text-white' : 'text-[#C0392B]'}`} aria-hidden />
          </span>
        ) : null}
      </div>
      <p className={`mt-4 text-2xl font-semibold tabular-nums ${valueClass}`}>{value}</p>
      {sub ? <p className={`mt-1 text-xs ${subClass}`}>{sub}</p> : null}
    </div>
  );
}
