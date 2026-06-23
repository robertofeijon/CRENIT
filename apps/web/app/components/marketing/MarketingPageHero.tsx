import type { ReactNode } from 'react';
import MarketingAtmosphere from './MarketingAtmosphere';

type MarketingPageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  lead: string;
  children?: ReactNode;
};

export default function MarketingPageHero({ eyebrow, title, lead, children }: MarketingPageHeroProps) {
  return (
    <section className="border-b border-slate-200/60 dark:border-[var(--rc-border)]">
      <MarketingAtmosphere variant="subtle">
        <div className="marketing-container py-14 sm:py-16 lg:py-20">
          <div className="relative max-w-4xl">
            <div
              className="pointer-events-none absolute -right-4 top-0 h-24 w-24 rounded-full bg-[#C0392B]/10 blur-2xl dark:bg-[#C0392B]/20"
              aria-hidden
            />
            <div className="marketing-accent-bar" />
            <p className="marketing-eyebrow mt-6">{eyebrow}</p>
            <h1 className="marketing-h1 mt-5">{title}</h1>
            <p className="marketing-lead mt-6 max-w-3xl">{lead}</p>
            {children ? <div className="mt-8 flex flex-wrap gap-3">{children}</div> : null}
          </div>
        </div>
      </MarketingAtmosphere>
    </section>
  );
}
