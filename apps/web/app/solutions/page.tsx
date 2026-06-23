import type { Metadata } from 'next';
import { Building2, HardHat, Landmark, UserRound } from 'lucide-react';
import MarketingCtaBand from '../components/marketing/MarketingCtaBand';
import MarketingLinkCard from '../components/marketing/MarketingLinkCard';
import MarketingPageHero from '../components/marketing/MarketingPageHero';
import MarketingSectionReveal from '../components/marketing/MarketingSectionReveal';

export const metadata: Metadata = {
  title: 'Solutions',
  description: 'Tailored CRENIT solutions for tenants, landlords, banks, lenders, and property developers.',
};

const solutions = [
  {
    title: 'For Tenants',
    slug: 'for-tenants',
    description: 'Build credit from rent history, access better housing, and prove rental reliability.',
    icon: UserRound,
  },
  {
    title: 'For Landlords',
    slug: 'for-landlords',
    description: 'Portfolio oversight, verified tenant reports, and a clearer path to stable rental income.',
    icon: Building2,
  },
  {
    title: 'For Banks & Lenders',
    slug: 'for-banks-lenders',
    description: 'Underwrite rental-backed borrowers using verified rent payment signals.',
    icon: Landmark,
    featured: true,
  },
  {
    title: 'For Developers',
    slug: 'for-developers',
    description: 'Rent market data and tenant credit insight to plan stronger rental communities.',
    icon: HardHat,
  },
];

export default function SolutionsPage() {
  return (
    <main>
      <MarketingPageHero
        eyebrow="Solutions"
        title={
          <>
            Tailored paths for every <em>rental stakeholder</em>
          </>
        }
        lead="CRENIT enables tenants, landlords, lenders, and developers to use verified rental payments and market data to make smarter, more confident decisions."
      />

      <section className="marketing-section border-b border-slate-200/60 dark:border-[var(--rc-border)]">
        <div className="marketing-container">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {solutions.map((solution, index) => (
              <MarketingSectionReveal key={solution.title} delay={index * 70}>
                <MarketingLinkCard
                  href={`/solutions/${solution.slug}`}
                  title={solution.title}
                  description={solution.description}
                  icon={solution.icon}
                  featured={solution.featured}
                />
              </MarketingSectionReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section-muted border-b border-slate-200/60 dark:border-[var(--rc-border)]">
        <div className="marketing-container">
          <MarketingSectionReveal>
            <div className="marketing-accent-panel">
              <p className="marketing-eyebrow">How CRENIT fits</p>
              <h2 className="marketing-h2-display mt-4">One verified payment layer, four outcomes</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                'Tenants build a defensible rental credit profile',
                'Landlords see portfolio performance and reduce arrears risk',
                'Lenders access payment-backed signals for underwriting',
                'Developers price and phase projects with live suburb data',
              ].map((item) => (
                <div key={item} className="marketing-check-row">
                  <span className="marketing-check-row__icon" aria-hidden>
                    ✓
                  </span>
                  <p className="text-sm leading-6 text-[var(--rc-text-secondary)]">{item}</p>
                </div>
              ))}
            </div>
            </div>
          </MarketingSectionReveal>
        </div>
      </section>

      <MarketingCtaBand
        eyebrow="Ready to move forward?"
        title={
          <>
            Start using CRENIT for your <em>rental business</em>
          </>
        }
        href="/auth?mode=register"
        ctaLabel="Create free account"
        secondaryHref="/company/contact"
        secondaryLabel="Contact sales"
      />
    </main>
  );
}
