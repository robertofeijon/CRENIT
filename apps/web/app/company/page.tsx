import Link from 'next/link';

const companyHighlights = [
  {
    title: 'About Us',
    description: 'RentCredit is a Namibia-first fintech platform turning rent payments into verified credit identity.',
  },
  {
    title: 'How It Works',
    description: 'We connect landlords, tenants, and lenders through verified rental payment data and credit reporting.',
  },
  {
    title: 'Blog',
    description: 'Read the latest market insights, product updates, and stories from our partner network.',
  },
  {
    title: 'Contact',
    description: 'Reach out for demos, partnerships, or support from the RentCredit team.',
  },
];

export default function CompanyPage() {
  return (
    <main className="bg-[#F5F5F5] text-[#1A1A1A]">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8">
        <section className="rounded-[2rem] bg-white px-8 py-12 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Company</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#1A1A1A] sm:text-5xl">
            Building a better rental finance experience in Namibia.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            RentCredit helps landlords and tenants unlock financial identity through verified rent payments while supporting lenders with trusted rental signals.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {companyHighlights.map((item) => (
              <div key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-[#F8F8F8] p-6">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">{item.title}</h2>
                <p className="mt-4 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-8 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-[2rem] bg-[#1A1A1A] p-10 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
            <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Our mission</p>
            <h2 className="mt-4 text-3xl font-semibold">Deliver financial identity through everyday rental payments.</h2>
            <p className="mt-6 text-base leading-7 text-slate-300">
              We believe rental behavior should be visible, verifiable, and valuable — for tenants, landlords, and lenders alike.
            </p>
          </div>
          <div className="rounded-[2rem] bg-white p-10 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
            <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">What we value</p>
            <div className="mt-6 space-y-5">
              {[
                'Trust through verified data',
                'Accessibility for rental customers',
                'Transparency in credit outcomes',
                'Local market insight and service',
              ].map((value) => (
                <div key={value} className="rounded-[1.5rem] border border-slate-200 bg-[#F8F8F8] p-6">
                  <p className="text-sm font-semibold text-[#1A1A1A]">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16 rounded-[2rem] bg-white p-10 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Start a conversation</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#1A1A1A]">Talk to the RentCredit team today.</h2>
            </div>
            <Link
              href="/auth"
              className="inline-flex items-center justify-center rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white hover:bg-[#992d24]"
            >
              Contact Us
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
