import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Solutions',
  description: 'Tailored CRENIT solutions for tenants, landlords, banks, lenders, and property developers.',
};

const solutions = [
  {
    title: 'For Tenants',
    slug: 'for-tenants',
    description: 'Help tenants build credit from rent history, access better housing, and prove their rental reliability.',
  },
  {
    title: 'For Landlords',
    slug: 'for-landlords',
    description: 'Give landlords portfolio oversight, verified tenant reports, and a better route to stable income.',
  },
  {
    title: 'For Banks & Lenders',
    slug: 'for-banks-lenders',
    description: 'Enable lenders to underwrite rental-backed borrowers using verified rent payment signals.',
  },
  {
    title: 'For Developers',
    slug: 'for-developers',
    description: 'Use rent market data and tenant credit insight to plan stronger rental communities.',
  },
];

export default function SolutionsPage() {
  return (
    <main className="bg-[#F5F5F5] text-[#1A1A1A]">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8">
        <section className="rounded-[2rem] bg-white px-8 py-12 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Solutions</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#1A1A1A] sm:text-5xl">
            Tailored solutions for every rental stakeholder.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            CRENIT enables tenants, landlords, lenders, and developers to use verified rental payments and market data to make smarter, more confident decisions.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {solutions.map((solution) => (
              <Link
                key={solution.title}
                href={`/solutions/${solution.slug}`}
                className="group rounded-[1.5rem] border border-slate-200 bg-[#F8F8F8] p-6 transition hover:border-[#C0392B]/30 hover:shadow-md"
              >
                <h2 className="text-xl font-semibold text-[#1A1A1A] group-hover:text-[#C0392B]">{solution.title}</h2>
                <p className="mt-4 text-sm leading-6 text-slate-600">{solution.description}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-[#C0392B]">Learn more →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-[2rem] bg-white p-10 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Ready to move forward?</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#1A1A1A]">Start using CRENIT for your rental business.</h2>
            </div>
            <Link
              href="/auth"
              className="inline-flex items-center justify-center rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white hover:bg-[#992d24]"
            >
              Get started
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
