"use client";

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';

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

export default function Header() {
  const { user, role, loading, logout } = useAuth();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const activeGroup = useMemo(() => {
    if (!pathname) return null;
    if (pathname.startsWith('/products')) return 'Products';
    if (pathname.startsWith('/solutions')) return 'Solutions';
    if (pathname.startsWith('/company')) return 'Company';
    return null;
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const dashboardLink = role === 'LANDLORD' ? '/landlord' : '/tenant';
  const dashboardLabel = role === 'LANDLORD' ? 'Landlord Dashboard' : 'Tenant Dashboard';

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div ref={wrapperRef} className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-8">
        <div className="flex items-center gap-10">
          <Link href="/" className="text-2xl font-semibold tracking-tight text-[#1A1A1A]">
            RentCredit
          </Link>
          <nav className="hidden items-center gap-2 text-sm text-[#1A1A1A] md:flex">
            {navGroups.map((group) => (
              <div key={group.label} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(openMenu === group.label ? null : group.label)}
                  className={`inline-flex items-center gap-1 rounded-full px-4 py-2 transition hover:bg-slate-100 ${
                    activeGroup === group.label ? 'bg-[#FDEDEC] text-[#C0392B]' : 'text-[#1A1A1A]'
                  }`}
                >
                  {group.label}
                  <span className="text-xs">▾</span>
                </button>
                {openMenu === group.label && (
                  <div className="absolute left-0 top-full z-30 mt-2 w-52 rounded-[1.5rem] border border-slate-200 bg-white py-3 shadow-xl">
                    {group.items.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className={`block px-4 py-2 text-sm transition hover:bg-slate-50 ${
                          pathname === item.href ? 'bg-[#F5F5F5] font-semibold' : 'text-[#1A1A1A]'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/auth"
            className="rounded-full border border-[#C0392B] px-5 py-2 text-sm font-semibold text-[#C0392B] transition hover:bg-[#C0392B]/10"
          >
            View Demo
          </Link>
          {user ? (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={dashboardLink}
                className="rounded-full bg-[#C0392B] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#992d24]"
              >
                {dashboardLabel}
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-[#1A1A1A] transition hover:bg-slate-100"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === 'signin' ? null : 'signin')}
                className="inline-flex items-center gap-2 rounded-full bg-[#C0392B] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#992d24]"
              >
                Sign In
                <span className="text-xs">▾</span>
              </button>
              {openMenu === 'signin' && (
                <div className="absolute right-0 top-full z-30 mt-2 w-48 rounded-[1.5rem] border border-slate-200 bg-white py-3 shadow-xl">
                  <Link
                    href="/auth"
                    className="block px-4 py-2 text-sm text-[#1A1A1A] transition hover:bg-slate-50"
                  >
                    Tenant Login
                  </Link>
                  <Link
                    href="/auth"
                    className="block px-4 py-2 text-sm text-[#1A1A1A] transition hover:bg-slate-50"
                  >
                    Landlord Login
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
