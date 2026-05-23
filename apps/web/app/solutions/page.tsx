import Link from 'next/link';

const solutions = [
  {
    title: 'For Tenants',
    description: 'Help tenants build credit from rent history, access better housing, and prove their rental reliability.',
  },
  {
    title: 'For Landlords',
    description: 'Give landlords portfolio oversight, verified tenant reports, and a better route to stable income.',
  },
  {
    title: 'For Banks & Lenders',
    description: 'Enable lenders to underwrite rental-backed borrowers using verified rent payment signals.',
  },
  {
    title: 'For Developers',
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
            RentCredit enables tenants, landlords, lenders, and developers to use verified rental payments and market data to make smarter, more confident decisions.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {solutions.map((solution) => (
              <div key={solution.title} className="rounded-[1.5rem] border border-slate-200 bg-[#F8F8F8] p-6">
                <h2 className="text-xl font-semibold text-[#1A1A1A]">{solution.title}</h2>
                <p className="mt-4 text-sm leading-6 text-slate-600">{solution.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] bg-[#1A1A1A] p-10 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
            <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">What we deliver</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">A rental ecosystem built on trust.</h2>
            <p className="mt-6 text-base leading-7 text-slate-300">
              Our platform bridges payments, credit reporting, and market intelligence so every participant can move faster with verified rental data.
            </p>
            <div className="mt-10 grid gap-6">
              {[
                'Tenant credit visibility',
                'Landlord performance dashboards',
                'Lender risk signals',
                'Developer market analytics',
              ].map((item) => (
                <div key={item} className="rounded-[1.5rem] bg-[#111111] p-6 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] bg-white p-10 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
            <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Solutions in action</p>
            <h2 className="mt-4 text-3xl font-semibold text-[#1A1A1A]">Built for real rental businesses.</h2>
            <p className="mt-6 text-base leading-7 text-slate-600">
              RentCredit combines operational efficiency with verified financial identity so lenders, owners, and tenants all gain more clarity and confidence.
            </p>
            <div className="mt-10 space-y-4">
              <div className="rounded-[1.5rem] border border-slate-200 bg-[#F8F8F8] p-6">
                <p className="font-semibold text-[#1A1A1A]">Tenant onboarding</p>
                <p className="mt-2 text-sm text-slate-600">Fast approval and verified rent reporting for new renters.</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-[#F8F8F8] p-6">
                <p className="font-semibold text-[#1A1A1A]">Portfolio insights</p>
                <p className="mt-2 text-sm text-slate-600">Actionable data for more resilient rental investments.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 rounded-[2rem] bg-white p-10 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Ready to move forward?</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#1A1A1A]">Start using RentCredit for your rental business.</h2>
            </div>
            <Link
              href="/auth"
              className="inline-flex items-center justify-center rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white hover:bg-[#992d24]"
            >
              Request a Demo
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
