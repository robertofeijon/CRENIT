import type { ReactNode } from 'react';

type DashboardPageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: string;
  /** Use Instrument Serif for the page title */
  display?: boolean;
};

export default function DashboardPageHeader({
  title,
  subtitle,
  actions,
  badge,
  display = false,
}: DashboardPageHeaderProps) {
  return (
    <div className="dashboard-page-header mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="dashboard-page-header__accent" aria-hidden />
        {badge ? <p className="dashboard-page-header__badge">{badge}</p> : null}
        <h1 className={display ? 'dashboard-page-header__title-display' : 'dashboard-page-header__title'}>
          {title}
        </h1>
        {subtitle ? <p className="dashboard-page-header__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
