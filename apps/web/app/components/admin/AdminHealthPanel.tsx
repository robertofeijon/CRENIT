'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type AdminHealthPanelProps = {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'spotlight';
  children: ReactNode;
  className?: string;
};

export default function AdminHealthPanel({
  title,
  subtitle,
  icon: Icon,
  badge,
  variant = 'default',
  children,
  className = '',
}: AdminHealthPanelProps) {
  const variantClass = {
    default: 'admin-health-panel',
    success: 'admin-health-panel admin-health-panel--success',
    warning: 'admin-health-panel admin-health-panel--warning',
    spotlight: 'admin-health-panel admin-health-panel--spotlight',
  }[variant];

  return (
    <section className={`${variantClass} ${className}`.trim()}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="admin-health-panel__title">
            {Icon ? <Icon className="h-5 w-5 text-[#C0392B]" aria-hidden /> : null}
            {title}
          </h2>
          {subtitle ? <p className="admin-health-panel__subtitle">{subtitle}</p> : null}
        </div>
        {badge}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
