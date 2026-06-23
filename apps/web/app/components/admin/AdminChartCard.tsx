import type { ReactNode } from 'react';

export default function AdminChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`chart-card ${className}`.trim()}>
      <h3 className="chart-card__title">{title}</h3>
      {subtitle ? <p className="chart-card__subtitle">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </article>
  );
}
