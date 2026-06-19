import type { Metadata } from 'next';
import Link from 'next/link';
import B2bSampleKeyForm from '../components/marketing/B2bSampleKeyForm';
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

  return (
    <main className="py-12">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <header className="rounded-[2rem] bg-white p-10 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">CRENIT Market Intelligence</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#1A1A1A] sm:text-5xl">Windhoek rental aggregates</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Median rent and on-time payment behaviour by suburb. Only suburbs with at least {minSample} verified
            observations are shown — smaller markets are suppressed to protect privacy.
          </p>
          {dashboard?.illustrative_disclaimer ? (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
              {dashboard.illustrative_disclaimer}
            </p>
          ) : null}
          {(dashboard?.suppressed_suburb_count ?? 0) > 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              {dashboard?.suppressed_suburb_count} suburb(s) hidden — below minimum sample size.
            </p>
          ) : null}
        </header>

        <section className="mt-10 overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          {suburbs.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#F8F8F8] text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Suburb</th>
                    <th className="px-6 py-4">Median rent</th>
                    <th className="px-6 py-4">On-time rate</th>
                    <th className="px-6 py-4">Observations</th>
                    <th className="px-6 py-4">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {suburbs.map((row) => (
                    <tr key={row.suburb} className="border-t border-slate-100">
                      <td className="px-6 py-4 font-medium text-[#1A1A1A]">{row.suburb}</td>
                      <td className="px-6 py-4">{formatN$(row.median_rent)}</td>
                      <td className="px-6 py-4">{Math.round(row.on_time_rate)}%</td>
                      <td className="px-6 py-4 text-slate-600">{row.transaction_count}</td>
                      <td className="px-6 py-4 capitalize text-slate-600">{row.trend || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-8 py-16 text-center text-slate-600">
              <p className="text-lg font-medium">No public suburbs meet the minimum sample rule yet.</p>
              <p className="mt-2 text-sm">
                Apply migration 0043 on staging or wait for live payment volume.{' '}
                <Link href="/products/market-data" className="font-semibold text-[#C0392B] hover:underline">
                  Request a B2B sample key
                </Link>{' '}
                for illustrative pilot data.
              </p>
            </div>
          )}
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="rounded-[2rem] bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold">Licensed access</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Banks, developers, and estate agencies can license deeper cuts — sale comps, feasibility packs, and API
              feeds with confidence metadata.
            </p>
            <Link href="/products/market-data" className="mt-4 inline-flex text-sm font-semibold text-[#C0392B] hover:underline">
              Explore Data Intelligence →
            </Link>
          </div>
          <B2bSampleKeyForm compact />
        </section>
      </div>
    </main>
  );
}
