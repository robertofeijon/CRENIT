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
    title: 'Data Intelligence',
    description:
      'Licensed suburb rental comps for developers, estate agents, banks, and contractors — verified from real payments, not listings.',
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
            CRENIT brings together the key products landlords and tenants need to manage rental payments, build verified credit,
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
              From landlords collecting rent to tenants building credit and lenders underwriting rental borrowers, CRENIT connects the full rental lifecycle.
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

        <section className="mt-16 rounded-[2rem] border border-[#C0392B]/15 bg-gradient-to-br from-[#FDEDEC] to-white p-10 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Data Intelligence for property professionals</p>
          <h2 className="mt-4 text-3xl font-semibold text-[#1A1A1A]">Know the rent range before you build, list, or lend.</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            CRENIT sells anonymised, verified rental market data — suburb price bands, payment behaviour, and feasibility
            packs for property professionals. Individual tenants are never exposed; only aggregated
            statistics that meet minimum sample rules are licensed.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { who: 'Developers', what: 'Feasibility rent assumptions and unit-mix revenue by suburb.' },
              { who: 'Estate agents', what: 'Evidence-backed asking rent ranges for landlords and investors.' },
              { who: 'Banks & lenders', what: 'Neighbourhood on-time rates and income-to-rent stress signals.' },
              { who: 'Contractors & PM', what: 'Benchmark portfolio performance and service charges by area.' },
              { who: 'Government & research', what: 'Policy-grade rental affordability aggregates.' },
              { who: 'Investors', what: 'Compare suburbs for yield using verified median rent.' },
            ].map((item) => (
              <div key={item.who} className="rounded-[1.25rem] border border-slate-200 bg-white p-5">
                <p className="font-semibold text-[#1A1A1A]">{item.who}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.what}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-500">
            Rental comps are available today. Sale / transfer comps are on the roadmap via registry, valuer, and bank
            partners — separate from rent data so clients never mix deed values with asking rent.
          </p>
        </section>

        <section className="mt-8 rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Planned
            </span>
            <h3 className="text-xl font-semibold text-[#1A1A1A]">Sale comps (partner integration)</h3>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            For developers pricing stock, agents listing for sale, and banks on mortgage collateral — suburb sale bands and
            transfer volumes will ship through vetted partner feeds (deeds registry, valuers, MLS, collateral desks), then
            the same CRENIT API and report formats you use for rental intelligence.
          </p>
          <p className="mt-4 text-sm font-medium text-[#C0392B]">
            Partner pilot — contact CRENIT to register as a data partner or to request early access.
          </p>
        </section>

        <section className="mt-16 rounded-[2rem] bg-white p-10 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Get started</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#1A1A1A]">See how CRENIT can work for your portfolio.</h2>
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
