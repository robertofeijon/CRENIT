import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Logo from '../ui/Logo';
import { CONTACT_EMAIL } from '../../../src/lib/site';

const columns = [
  {
    title: 'Products',
    links: [
      { label: 'Rent payments', href: '/products/rent-payments' },
      { label: 'Credit score', href: '/products/credit-score' },
      { label: 'Deposits', href: '/products/deposit-management' },
      { label: 'Market data', href: '/products/market-data' },
      { label: 'Public data dashboard', href: '/data' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'For tenants', href: '/solutions/for-tenants' },
      { label: 'For landlords', href: '/solutions/for-landlords' },
      { label: 'Banks & lenders', href: '/solutions/for-banks-lenders' },
      { label: 'For developers', href: '/solutions/for-developers' },
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
    <footer className="marketing-footer w-full border-t border-white/10 text-white">
      <div className="marketing-container py-14 sm:py-16">
        <div className="marketing-footer-cta">
          <p className="marketing-cta-band__eyebrow">Ready to start?</p>
          <h2 className="marketing-footer-cta__title mt-3">
            Turn verified rent into credit and <em className="text-[#f87171] not-italic">market intelligence</em>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/70">
            Join tenants building scores and landlords contributing payment-backed suburb data across Namibia.
          </p>
          <div className="marketing-cta-band__actions mx-auto mt-8 w-fit">
            <Link href="/auth?mode=register" className="marketing-cta-band__btn-primary">
              Create free account
            </Link>
            <Link href="/company/contact" className="marketing-cta-band__btn-ghost">
              Talk to sales
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[1.1fr_2fr] lg:gap-16">
          <div className="marketing-footer__brand">
            <div className="[&_img]:brightness-0 [&_img]:invert">
              <Logo />
            </div>
            <p className="marketing-footer__tagline">
              Verified rental finance for tenants, landlords, and partners licensing anonymised market data.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white/85 transition hover:text-white"
            >
              {CONTACT_EMAIL}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-8 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CRENIT. All rights reserved.</p>
          <p>Windhoek, Namibia · crenit.co</p>
        </div>
      </div>
    </footer>
  );
}
