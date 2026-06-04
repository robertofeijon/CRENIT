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
      { label: 'Privacy', href: '/company/privacy' },
      { label: 'Terms', href: '/company/terms' },
    ],
  },
];

export default function MarketingFooter() {
  return (
    <footer className="w-full border-t border-white/10 bg-black text-white">
      <div className="marketing-container py-16">
        <div className="grid gap-10 lg:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-white/85 transition hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-8 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CRENIT. All rights reserved.</p>
          <p>crenit.co · hello@crenit.co</p>
        </div>
      </div>
    </footer>
  );
}
