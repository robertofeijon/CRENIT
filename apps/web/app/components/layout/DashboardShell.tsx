'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../src/contexts/AuthContext';
import MarketingNav from './MarketingNav';

export type NavItem = { label: string; href: string; icon: string };

export type DashboardShellProps = {
  role: 'landlord' | 'tenant' | 'admin';
  roleLabel: string;
  sectionTitle: string;
  sectionDescription: string;
  navItems: NavItem[];
  children: ReactNode;
  banner?: ReactNode;
};

function dashboardPill(role: DashboardShellProps['role']) {
  if (role === 'admin') return { label: 'Admin Portal', className: 'bg-[#1A1A2E] text-white' };
  if (role === 'landlord') return { label: 'Landlord Dashboard', className: 'bg-[#C0392B] text-white' };
  return { label: 'Tenant Dashboard', className: 'bg-[#C0392B] text-white' };
}

export default function DashboardShell({
  role,
  roleLabel,
  sectionTitle,
  sectionDescription,
  navItems,
  children,
  banner,
}: DashboardShellProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pill = dashboardPill(role);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sidebar = (
    <aside className="flex h-full w-[240px] flex-col border-r border-gray-200 bg-[#F9FAFB]">
      <div className="border-b border-gray-200 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">{roleLabel}</p>
        <h2 className="mt-2 text-lg font-bold text-gray-900">{sectionTitle}</h2>
        <p className="mt-1 text-xs leading-5 text-gray-500">{sectionDescription}</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== `/${role}` && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? 'bg-[#1A1A2E] text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-base" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <header className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-gray-200 bg-white">
        <div className="flex h-full items-center justify-between gap-4 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-gray-200 p-2 text-gray-700 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <Link href="/" className="text-lg font-bold text-gray-900">
              RentCredit
            </Link>
            <div className="hidden lg:block">
              <MarketingNav compact />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/auth" className="rc-btn-outline hidden sm:inline-flex">
              View Demo
            </Link>
            <Link href={`/${role === 'admin' ? 'admin' : role}`} className={`rounded-lg px-4 py-2 text-sm font-semibold ${pill.className}`}>
              {pill.label}
            </Link>
            <button type="button" onClick={() => logout()} className="rc-btn-outline">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="hidden md:fixed md:left-0 md:top-16 md:z-40 md:block md:h-[calc(100vh-4rem)]">
        {sidebar}
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-label="Close menu" />
          <div className="absolute left-0 top-0 h-full w-[240px] shadow-xl transition-transform">{sidebar}</div>
        </div>
      ) : null}

      <main className="mt-16 min-h-[calc(100vh-4rem)] p-4 md:ml-[240px] md:p-8">
        {banner}
        {children}
      </main>
    </div>
  );
}
