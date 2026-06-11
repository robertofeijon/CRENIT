import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Company',
  description: 'About CRENIT — building verified rental credit and market intelligence in Namibia.',
};

const companyHighlights = [
  {
    title: 'About Us',
    slug: 'about-us',
    description: 'CRENIT records rent payments to build verified rental credit and market intelligence.',
  },
  {
    title: 'How It Works',
    slug: 'how-it-works',
    description: 'We connect landlords, tenants, and lenders through verified rental payment data and credit reporting.',
  },
  {
    title: 'Blog',
    slug: 'blog',
    description: 'Read the latest market insights, product updates, and stories from our partner network.',
  },
  {
    title: 'Contact',
    slug: 'contact',
    description: 'Reach out for partnerships or support from the CRENIT team.',
  },
];

export default function CompanyPage() {
  return (
    <main className="bg-[#F5F5F5] text-[#1A1A1A]">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8">
        <section className="rounded-[2rem] bg-white px-8 py-12 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Company</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#1A1A1A] sm:text-5xl">
            Building a better rental finance experience with verified payment data.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            CRENIT helps landlords and tenants unlock financial identity through verified rent payments while supporting lenders with trusted rental signals.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {companyHighlights.map((item) => (
              <Link
                key={item.title}
                href={`/company/${item.slug}`}
                className="group rounded-[1.5rem] border border-slate-200 bg-[#F8F8F8] p-6 transition hover:border-[#C0392B]/30 hover:shadow-md"
              >
                <h2 className="text-xl font-semibold text-[#1A1A1A] group-hover:text-[#C0392B]">{item.title}</h2>
                <p className="mt-4 text-sm leading-6 text-slate-600">{item.description}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-[#C0392B]">Learn more →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-[2rem] bg-white p-10 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Start a conversation</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#1A1A1A]">Talk to the CRENIT team today.</h2>
            </div>
            <Link
              href="/company/contact"
              className="inline-flex items-center justify-center rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white hover:bg-[#992d24]"
            >
              Contact us
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
