import Link from 'next/link';

const columns = [
  {
    title: 'Products',
    links: [
      { label: 'Rent payments', href: '/products/rent-payments' },
      { label: 'Credit score', href: '/products/credit-score' },
      { label: 'Deposits', href: '/products/deposit-management' },
      { label: 'Market data', href: '/products/market-data' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'For tenants', href: '/solutions/for-tenants' },
      { label: 'For landlords', href: '/solutions/for-landlords' },
      { label: 'Banks & lenders', href: '/solutions/for-banks-lenders' },
      { label: 'Developers', href: '/solutions/for-developers' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/company/about-us' },
      { label: 'How it works', href: '/company/how-it-works' },
      { label: 'Blog', href: '/company/blog' },
      { label: 'Contact', href: '/company/contact' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help center', href: '/company/contact' },
      { label: 'Privacy', href: '/company/contact' },
      { label: 'Terms', href: '/company/contact' },
    ],
  },
];

export default function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="marketing-container py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <p className="text-2xl font-semibold text-[#1A1A1A]">CRENIT</p>
            <p className="mt-4 max-w-xs text-sm leading-7 text-slate-600">
              Recording rent payments to build verified rental credit and market intelligence.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-slate-600 transition hover:text-[#1A1A1A]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-slate-100 pt-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CRENIT. All rights reserved.</p>
          <p>crenit.co · hello@crenit.co</p>
        </div>
      </div>
    </footer>
  );
}
