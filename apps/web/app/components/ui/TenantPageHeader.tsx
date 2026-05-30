import type { ReactNode } from 'react';

export default function TenantPageHeader({
  title,
  subtitle,
  actions,
  badge,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {badge ? (
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#C0392B]/90">{badge}</p>
        ) : null}
        <h1 className={`font-semibold tracking-tight text-[#1A1A1A] ${badge ? 'mt-3 text-3xl' : 'text-3xl'}`}>
          {title}
        </h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
