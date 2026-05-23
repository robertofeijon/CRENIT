'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const navGroups = [
  {
    label: 'Products',
    items: [
      { label: 'Rent Payments', href: '/products/rent-payments' },
      { label: 'Credit Score', href: '/products/credit-score' },
      { label: 'Deposit Management', href: '/products/deposit-management' },
      { label: 'Market Data', href: '/products/market-data' },
    ],
  },
  {
    label: 'Solutions',
    items: [
      { label: 'For Tenants', href: '/solutions/for-tenants' },
      { label: 'For Landlords', href: '/solutions/for-landlords' },
      { label: 'For Banks & Lenders', href: '/solutions/for-banks-lenders' },
      { label: 'For Developers', href: '/solutions/for-developers' },
    ],
  },
  {
    label: 'Company',
    items: [
      { label: 'About Us', href: '/company/about-us' },
      { label: 'How It Works', href: '/company/how-it-works' },
      { label: 'Blog', href: '/company/blog' },
      { label: 'Contact', href: '/company/contact' },
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

  return (
    <nav ref={wrapperRef} className={`flex items-center gap-1 text-sm ${compact ? '' : ''}`}>
      {navGroups.map((group) => (
        <div key={group.label} className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === group.label ? null : group.label)}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 font-medium text-gray-700 transition hover:bg-gray-100"
          >
            {group.label}
            <span className="text-xs opacity-60">▾</span>
          </button>
          {openMenu === group.label ? (
            <div className="absolute left-0 top-full z-50 mt-1 w-52 translate-y-0 rounded-xl border border-gray-200 bg-white py-2 opacity-100 shadow-lg transition-all duration-150">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-2 text-sm transition hover:bg-gray-50 ${
                    pathname === item.href ? 'font-semibold text-[#C0392B]' : 'text-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </nav>
  );
}
