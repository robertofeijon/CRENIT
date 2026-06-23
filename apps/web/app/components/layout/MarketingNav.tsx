'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

const navGroups = [
  {
    label: 'Products',
    items: [
      { label: 'Rent payments', href: '/products/rent-payments', desc: 'Collect rent and verify payment history' },
      { label: 'Credit score', href: '/products/credit-score', desc: 'Build credit from on-time rent' },
      { label: 'Deposit management', href: '/products/deposit-management', desc: 'Secure deposits for landlords and tenants' },
      { label: 'Market data', href: '/products/market-data', desc: 'Verified rent trends by suburb' },
    ],
  },
  {
    label: 'Solutions',
    items: [
      { label: 'For tenants', href: '/solutions/for-tenants', desc: 'Build financial identity with every payment' },
      { label: 'For landlords', href: '/solutions/for-landlords', desc: 'Portfolio tools and resident engagement' },
      { label: 'Banks & lenders', href: '/solutions/for-banks-lenders', desc: 'Underwrite with verified rental data' },
      { label: 'For developers', href: '/solutions/for-developers', desc: 'API access to rent and credit signals' },
    ],
  },
  {
    label: 'Company',
    items: [
      { label: 'About us', href: '/company/about-us', desc: 'Our mission' },
      { label: 'How it works', href: '/company/how-it-works', desc: 'The rent-to-credit loop' },
      { label: 'Blog', href: '/company/blog', desc: 'News and financial education' },
      { label: 'Contact', href: '/company/contact', desc: 'Talk to our team' },
    ],
  },
];

export default function MarketingNav({ compact = false }: { compact?: boolean }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  return (
    <nav
      ref={wrapperRef}
      className={`flex items-center gap-0.5 text-sm ${compact ? 'flex-col items-stretch' : ''}`}
    >
      {navGroups.map((group) => (
        <div key={group.label} className={`relative ${compact ? 'w-full' : ''}`}>
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === group.label ? null : group.label)}
            className={`inline-flex w-full items-center gap-1 rounded-lg px-3 py-2 font-medium transition hover:bg-[var(--rc-hover)] ${
              compact ? 'justify-between' : ''
            }`}
            style={{ color: 'var(--rc-text-secondary)' }}
          >
            {group.label}
            <ChevronDown className={`h-4 w-4 opacity-60 transition ${openMenu === group.label ? 'rotate-180' : ''}`} />
          </button>
          {openMenu === group.label ? (
            <div
              className={
                compact
                  ? 'mt-1 space-y-1 rounded-xl border p-2'
                  : 'absolute left-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border p-2 shadow-xl'
              }
              style={{
                borderColor: 'var(--rc-border)',
                background: 'var(--rc-card)',
              }}
            >
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {group.label}
              </p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl px-3 py-2.5 transition hover:bg-[var(--rc-hover)] ${
                    pathname === item.href ? 'bg-[var(--rc-hover)]' : ''
                  }`}
                >
                  <span
                    className={`block text-sm font-medium ${pathname === item.href ? 'text-[#C0392B]' : ''}`}
                    style={pathname === item.href ? undefined : { color: 'var(--rc-text)' }}
                  >
                    {item.label}
                  </span>
                  {!compact ? (
                    <span className="mt-0.5 block text-xs leading-5" style={{ color: 'var(--rc-text-muted)' }}>
                      {item.desc}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </nav>
  );
}
