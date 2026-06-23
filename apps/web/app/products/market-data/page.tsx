import type { Metadata } from 'next';
import Link from 'next/link';
import B2bSampleKeyForm from '../../components/marketing/B2bSampleKeyForm';
import MarketingCtaBand from '../../components/marketing/MarketingCtaBand';
import MarketingDataTable from '../../components/marketing/MarketingDataTable';
import MarketingPageHero from '../../components/marketing/MarketingPageHero';
import { B2B_WINDHOEK_DEMO_SUBURBS, B2B_DEMO_DISCLAIMER } from '../../../src/content/b2b-demo-suburbs';

export const metadata: Metadata = {
  title: 'Data Intelligence',
  description:
    'Licensed Windhoek rental market data for developers, estate agents, banks, and contractors — verified from real payments.',
};

function formatN$(value: number) {
  return `N$${value.toLocaleString('en-NA')}`;
}

export default function MarketDataProductPage() {
  return (
    <main>
      <MarketingPageHero
        eyebrow="Data Intelligence"
        title={
          <>
            Know the rent range before you build, list, or <em>lend</em>
          </>
        }
        lead="CRENIT licenses anonymised rental market statistics from verified platform payments — suburb price bands, on-time behaviour, and feasibility packs. Individual tenants are never exposed."
      >
        <Link href="/data" className="marketing-btn-primary">
          View public dashboard
        </Link>
        <Link href="/data/methodology" className="marketing-btn-outline">
          Methodology
        </Link>
      </MarketingPageHero>

      <section className="marketing-section border-b border-slate-200/60 dark:border-[var(--rc-border)]">
        <div className="marketing-container grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="marketing-panel">
            <p className="marketing-eyebrow">Pilot suburbs</p>
            <h2 className="marketing-h2 mt-4">Illustrative demo aggregates</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--rc-text-secondary)]">{B2B_DEMO_DISCLAIMER}</p>
            <div className="mt-8">
              <MarketingDataTable
                columns={[
                  { key: 'suburb', header: 'Suburb' },
                  { key: 'type', header: 'Type' },
                  { key: 'median', header: 'Median rent' },
                  { key: 'ontime', header: 'On-time' },
                ]}
                rows={B2B_WINDHOEK_DEMO_SUBURBS.map((row) => ({
                  key: row.suburb,
                  cells: [
                    row.suburb,
                    `${row.bedrooms} bed ${row.property_type}`,
                    formatN$(row.median_rent),
                    `${row.on_time_rate_pct}%`,
                  ],
                }))}
              />
            </div>
          </div>
          <B2bSampleKeyForm />
        </div>
      </section>

      <section className="marketing-section-muted border-b border-slate-200/60 dark:border-[var(--rc-border)]">
        <div className="marketing-container">
          <div className="marketing-accent-panel">
            <p className="marketing-eyebrow">Sample key</p>
            <h2 className="marketing-h2 mt-4">What you get with a sample key</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                'JSON suburb endpoint per pilot suburb',
                'Sample suburb PDF with confidence and suppression notes',
                '14-day evaluation window for sales and integration tests',
              ].map((item) => (
                <li key={item} className="marketing-bullet-tile">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <MarketingCtaBand
        eyebrow="Public data"
        title="Explore live Windhoek aggregates"
        href="/data"
        ctaLabel="Open dashboard"
      />
    </main>
  );
}
