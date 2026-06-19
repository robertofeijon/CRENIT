import type { Metadata } from 'next';
import Link from 'next/link';
import B2bSampleKeyForm from '../../components/marketing/B2bSampleKeyForm';
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
    <main className="bg-[#F5F5F5] text-[#1A1A1A]">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8">
        <section className="rounded-[2rem] bg-white px-8 py-12 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Data Intelligence</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Know the rent range before you build, list, or lend.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            CRENIT licenses anonymised rental market statistics from verified platform payments — suburb price bands,
            on-time behaviour, and feasibility packs. Individual tenants are never exposed; only aggregates that meet
            minimum sample rules are published or licensed.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/data"
              className="inline-flex items-center justify-center rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white hover:bg-[#992d24]"
            >
              View public dashboard
            </Link>
            <Link
              href="/data/methodology"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold hover:bg-slate-50"
            >
              Methodology
            </Link>
          </div>
        </section>

        <section className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
            <h2 className="text-2xl font-semibold">Pilot suburbs (illustrative demo)</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{B2B_DEMO_DISCLAIMER}</p>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-3 pr-4">Suburb</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Median rent</th>
                    <th className="py-3">On-time rate</th>
                  </tr>
                </thead>
                <tbody>
                  {B2B_WINDHOEK_DEMO_SUBURBS.map((row) => (
                    <tr key={row.suburb} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-medium">{row.suburb}</td>
                      <td className="py-3 pr-4 text-slate-600">
                        {row.bedrooms} bed {row.property_type}
                      </td>
                      <td className="py-3 pr-4">{formatN$(row.median_rent)}</td>
                      <td className="py-3">{row.on_time_rate_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <B2bSampleKeyForm />
        </section>

        <section className="mt-12 rounded-[2rem] border border-[#C0392B]/15 bg-gradient-to-br from-[#FDEDEC] to-white p-8">
          <h2 className="text-2xl font-semibold">What you get with a sample key</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              'JSON suburb endpoint per pilot suburb',
              'Sample suburb PDF with confidence and suppression notes',
              '14-day evaluation window for sales and integration tests',
            ].map((item) => (
              <li key={item} className="rounded-2xl bg-white/80 p-5 text-sm text-slate-700 shadow-sm">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
