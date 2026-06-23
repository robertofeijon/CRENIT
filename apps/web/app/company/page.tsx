import type { Metadata } from 'next';
import { BookOpen, Info, Mail, Workflow } from 'lucide-react';
import MarketingCtaBand from '../components/marketing/MarketingCtaBand';
import MarketingLinkCard from '../components/marketing/MarketingLinkCard';
import MarketingPageHero from '../components/marketing/MarketingPageHero';

export const metadata: Metadata = {
  title: 'Company',
  description: 'About CRENIT — building verified rental credit and market intelligence in Namibia.',
};

const companyHighlights = [
  {
    title: 'About Us',
    slug: 'about-us',
    description: 'CRENIT records rent payments to build verified rental credit and market intelligence.',
    icon: Info,
  },
  {
    title: 'How It Works',
    slug: 'how-it-works',
    description: 'Landlords, tenants, and lenders connected through verified rental payment data.',
    icon: Workflow,
    featured: true,
  },
  {
    title: 'Blog',
    slug: 'blog',
    description: 'Market insights, product updates, and stories from our partner network.',
    icon: BookOpen,
  },
  {
    title: 'Contact',
    slug: 'contact',
    description: 'Partnerships, onboarding support, and general enquiries.',
    icon: Mail,
  },
];

export default function CompanyPage() {
  return (
    <main>
      <MarketingPageHero
        eyebrow="Company"
        title={
          <>
            Building rental finance on <em>verified payments</em>
          </>
        }
        lead="CRENIT helps landlords and tenants unlock financial identity through verified rent payments while giving lenders and developers trusted rental signals from Namibia."
      />

      <section className="marketing-section border-b border-slate-200/60 dark:border-[var(--rc-border)]">
        <div className="marketing-container">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {companyHighlights.map((item) => (
              <MarketingLinkCard
                key={item.title}
                href={`/company/${item.slug}`}
                title={item.title}
                description={item.description}
                icon={item.icon}
                featured={item.featured}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section-muted border-b border-slate-200/60 dark:border-[var(--rc-border)]">
        <div className="marketing-container">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="marketing-panel">
              <p className="marketing-eyebrow">Our mission</p>
              <h2 className="marketing-h2 mt-4">Accountable rental markets, built locally</h2>
              <p className="mt-5 text-base leading-7 text-[var(--rc-text-secondary)]">
                We are not copying a foreign credit bureau model. CRENIT is designed for how rent actually works in
                Namibia — EFT confirmations, landlord partnerships, and suburb-level intelligence lenders can license.
              </p>
            </div>
            <div className="marketing-spotlight">
              <p className="marketing-eyebrow text-[#f4a9a3]">Windhoek-first</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">Piloting with real partners</h2>
              <p className="mt-4 text-base leading-7 text-slate-300">
                Banks, landlords, and developers work with us on verified payment flows and anonymised market aggregates
                — with POPIA-aligned consent and minimum sample rules.
              </p>
            </div>
          </div>
        </div>
      </section>

      <MarketingCtaBand
        eyebrow="Start a conversation"
        title="Talk to the CRENIT team today"
        href="/company/contact"
        ctaLabel="Contact us"
      />
    </main>
  );
}
