'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';
import MarketingNav from './layout/MarketingNav';

export default function Header() {
  const { user, role, logout } = useAuth();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
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
    setMobileNav(false);
    setOpenMenu(null);
  }, [pathname]);

  const dashboardLink = role === 'ADMIN' ? '/admin' : role === 'LANDLORD' ? '/landlord' : '/tenant/home';
  const dashboardLabel = role === 'ADMIN' ? 'Admin Portal' : role === 'LANDLORD' ? 'Landlord Dashboard' : 'Tenant Dashboard';
  const pillClass =
    role === 'ADMIN' ? 'bg-[#1A1A2E] text-white hover:bg-[#16213E]' : 'bg-[#C0392B] text-white hover:bg-[#A93226]';

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-gray-200 bg-white">
      <div ref={wrapperRef} className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="rounded-lg border border-gray-200 p-2 md:hidden"
            onClick={() => setMobileNav(!mobileNav)}
            aria-label="Menu"
          >
            ☰
          </button>
          <Link href="/" className="text-lg font-bold text-gray-900">
            RentCredit
          </Link>
          <div className="hidden md:block">
            <MarketingNav />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/auth" className="rc-btn-outline hidden sm:inline-flex">
            View Demo
          </Link>
          {user ? (
            <>
              <Link href={dashboardLink} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${pillClass}`}>
                {dashboardLabel}
              </Link>
              <button type="button" onClick={logout} className="rc-btn-outline">
                Logout
              </button>
            </>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === 'signin' ? null : 'signin')}
                className="rc-btn-primary inline-flex items-center gap-1"
              >
                Sign In <span className="text-xs">▾</span>
              </button>
              {openMenu === 'signin' ? (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 translate-y-0 rounded-xl border border-gray-200 bg-white py-2 opacity-100 shadow-lg transition duration-150">
                  <Link href="/auth" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Tenant Login
                  </Link>
                  <Link href="/auth" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Landlord Login
                  </Link>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {mobileNav ? (
        <div className="border-t border-gray-200 bg-white px-4 py-4 md:hidden">
          <MarketingNav />
        </div>
      ) : null}
    </header>
  );
}
