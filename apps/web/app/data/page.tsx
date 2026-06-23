import type { Metadata } from 'next';
import Link from 'next/link';
import B2bSampleKeyForm from '../components/marketing/B2bSampleKeyForm';
import MarketingDataTable from '../components/marketing/MarketingDataTable';
import MarketingPageHero from '../components/marketing/MarketingPageHero';
import MarketingSectionReveal from '../components/marketing/MarketingSectionReveal';
import { fetchPublicMarketDashboard } from '../../src/lib/public-market-intelligence';

export const metadata: Metadata = {
  title: 'Windhoek rental market data',
  description:
    'Public aggregate rental statistics for Windhoek — median rent, on-time payment rates, and trends from verified CRENIT payments.',
};

function formatN$(value: number) {
  return `N$${Math.round(value).toLocaleString('en-NA')}`;
}

export default async function PublicDataDashboardPage() {
  const dashboard = await fetchPublicMarketDashboard();
  const suburbs = dashboard?.suburbs ?? [];
  const minSample = dashboard?.minimum_public_sample ?? 10;

  const avgOnTime =
    suburbs.length > 0
      ? Math.round(suburbs.reduce((sum, row) => sum + row.on_time_rate, 0) / suburbs.length)
      : null;
  const avgRent =
    suburbs.length > 0
      ? Math.round(suburbs.reduce((sum, row) => sum + row.median_rent, 0) / suburbs.length)
      : null;

  return (
    <main>
      <MarketingPageHero
        eyebrow="CRENIT Market Intelligence"
        title={
          <>
            Windhoek rental <em>aggregates</em>
          </>
        }
        lead={`Median rent and on-time payment behaviour by suburb. Only suburbs with at least ${minSample} verified observations are shown — smaller markets are suppressed to protect privacy.`}
      >
        <Link href="/products/market-data" className="marketing-btn-outline">
          Request B2B access
        </Link>
        <Link href="/data/methodology" className="marketing-btn-ghost">
          Methodology
        </Link>
      </MarketingPageHero>

      <section className="marketing-section border-b border-slate-200/60 dark:border-[var(--rc-border)]">
        <div className="marketing-container">
          {suburbs.length > 0 ? (
            <div className="data-summary-grid">
              <div className="data-summary-card">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rc-text-muted)]">
                  Suburbs published
                </p>
                <p className="data-summary-card__value">{suburbs.length}</p>
              </div>
              <div className="data-summary-card">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rc-text-muted)]">
                  Avg on-time rate
                </p>
                <p className="data-summary-card__value">{avgOnTime != null ? `${avgOnTime}%` : '—'}</p>
              </div>
              <div className="data-summary-card">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rc-text-muted)]">
                  Avg median rent
                </p>
                <p className="data-summary-card__value">{avgRent != null ? formatN$(avgRent) : '—'}</p>
              </div>
            </div>
          ) : null}

          {dashboard?.illustrative_disclaimer ? (
            <div className="marketing-callout marketing-callout--warning mb-8" role="note">
              {dashboard.illustrative_disclaimer}
            </div>
          ) : null}
          {(dashboard?.suppressed_suburb_count ?? 0) > 0 ? (
            <p className="mb-6 text-sm text-[var(--rc-text-muted)]">
              {dashboard?.suppressed_suburb_count} suburb(s) hidden — below minimum sample size.
            </p>
          ) : null}

          <MarketingSectionReveal>
            <MarketingDataTable
              columns={[
                { key: 'suburb', header: 'Suburb' },
                { key: 'median', header: 'Median rent' },
                { key: 'ontime', header: 'On-time rate' },
                { key: 'n', header: 'Observations' },
                { key: 'trend', header: 'Trend' },
              ]}
              rows={suburbs.map((row) => ({
                key: row.suburb,
                cells: [
                  row.suburb,
                  formatN$(row.median_rent),
                  `${Math.round(row.on_time_rate)}%`,
                  row.transaction_count,
                  <span key={`${row.suburb}-trend`} className="capitalize">
                    {row.trend || '—'}
                  </span>,
                ],
              }))}
              footer="Public aggregates · minimum sample rules apply · no tenant identifiers"
              empty={
                <>
                  <p className="text-lg font-medium text-[var(--rc-text)]">No public suburbs meet the minimum sample rule yet.</p>
                  <p className="mt-2 text-sm">
                    <Link href="/products/market-data" className="font-semibold text-[#C0392B] hover:underline">
                      Request a B2B sample key
                    </Link>{' '}
                    for illustrative pilot data.
                  </p>
                </>
              }
            />
          </MarketingSectionReveal>
        </div>
      </section>

      <section className="marketing-section-muted">
        <div className="marketing-container grid gap-8 lg:grid-cols-2">
          <MarketingSectionReveal>
            <div className="marketing-panel">
              <p className="marketing-eyebrow">Licensed access</p>
              <h2 className="marketing-h2-display mt-4">Deeper cuts for professionals</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--rc-text-secondary)]">
                Banks, developers, and estate agencies can license sale comps, feasibility packs, and API feeds with
                confidence metadata and suppression rules built in.
              </p>
              <Link href="/products/market-data" className="mt-6 inline-flex text-sm font-semibold text-[#C0392B] hover:underline">
                Explore Data Intelligence →
              </Link>
            </div>
          </MarketingSectionReveal>
          <MarketingSectionReveal delay={100}>
            <B2bSampleKeyForm compact />
          </MarketingSectionReveal>
        </div>
      </section>
    </main>
  );
}
