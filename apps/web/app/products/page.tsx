import Link from 'next/link';

const products = [
  {
    title: 'Rent Payments',
    description: 'Collect rent seamlessly, automate receipts, and track every payment in one verified ledger.',
  },
  {
    title: 'Credit Score',
    description: 'Convert on-time rental payments into a trusted credit history for tenants and lenders.',
  },
  {
    title: 'Deposit Management',
    description: 'Securely manage tenant deposits from move-in to move-out with automated reconciliation.',
  },
  {
    title: 'Market Data',
    description: 'Access verified rental pricing and performance insights from across Namibia.',
  },
];

export default function ProductsPage() {
  return (
    <main className="bg-[#F5F5F5] text-[#1A1A1A]">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8">
        <section className="rounded-[2rem] bg-white px-8 py-12 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Products</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#1A1A1A] sm:text-5xl">
            One platform for rent, credit, deposits, and market intelligence.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            RentCredit brings together the key products landlords and tenants need to manage rental payments, build verified credit,
            and make smarter decisions with local market data.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => (
              <div key={product.title} className="rounded-[1.5rem] border border-slate-200 bg-[#F8F8F8] p-6">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">{product.title}</h2>
                <p className="mt-4 text-sm leading-6 text-slate-600">{product.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] bg-white p-10 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
            <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">How it works</p>
            <h2 className="mt-4 text-3xl font-semibold text-[#1A1A1A]">Streamlined rental workflows for every stakeholder.</h2>
            <p className="mt-6 text-base leading-7 text-slate-600">
              From landlords collecting rent to tenants building credit and lenders underwriting rental borrowers, RentCredit connects the full rental lifecycle.
            </p>
            <div className="mt-10 space-y-4">
              {[
                'Automated rent collection and receipts',
                'Verified credit reporting from rent history',
                'Secure deposit tracking and claims',
                'Localized market insights for underwriting',
              ].map((item) => (
                <div key={item} className="flex gap-4 rounded-3xl bg-[#F5F5F5] p-5">
                  <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#C0392B]/10 text-[#C0392B]">✓</span>
                  <p className="text-sm leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] bg-[#1A1A1A] p-10 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
            <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Product focus</p>
            <h2 className="mt-4 text-3xl font-semibold">Trusted infrastructure for rental credit.</h2>
            <p className="mt-6 text-base leading-7 text-slate-300">
              Build lasting tenant relationships, improve portfolio transparency, and give financial partners a new way to underwrite rentals.
            </p>
            <div className="mt-10 grid gap-6">
              <div className="rounded-[1.5rem] bg-[#111111] p-6">
                <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Trusted data</p>
                <p className="mt-4 text-xl font-semibold text-white">Verified payments, verified performance.</p>
              </div>
              <div className="rounded-[1.5rem] bg-[#111111] p-6">
                <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Reliable score updates</p>
                <p className="mt-4 text-xl font-semibold text-white">Score improvements from real rental behavior.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 rounded-[2rem] bg-white p-10 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Get started</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#1A1A1A]">See how RentCredit can work for your portfolio.</h2>
            </div>
            <Link
              href="/auth"
              className="inline-flex items-center justify-center rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white hover:bg-[#992d24]"
            >
              Schedule a Demo
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
