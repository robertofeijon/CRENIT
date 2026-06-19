'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../../src/contexts/AuthContext';
import { NotificationsProvider } from '../../../src/contexts/NotificationsContext';
import MarketingNav from './MarketingNav';
import Logo from '../ui/Logo';
import NotificationBell from '../ui/NotificationBell';
import ThemeToggle from '../ui/ThemeToggle';

export type NavItem = {
  label: string;
  href: string;
  icon?: string | LucideIcon;
  section?: string;
  locked?: boolean;
  lockReason?: string;
};

/** Lucide icons can be functions or forward-ref objects ({ $$typeof, render }) */
function resolveNavIcon(icon: NavItem['icon']): LucideIcon | null {
  if (!icon || typeof icon === 'string') return null;
  return icon as LucideIcon;
}

export type DashboardShellProps = {
  role: 'landlord' | 'tenant' | 'admin';
  roleLabel: string;
  sectionTitle: string;
  sectionDescription: string;
  navItems: NavItem[];
  children: ReactNode;
  banner?: ReactNode;
  headerBadge?: ReactNode;
};

function dashboardPill(role: DashboardShellProps['role']) {
  if (role === 'admin') return { label: 'Admin Portal', href: '/admin', className: 'bg-[#1A1A1A] text-white hover:bg-[#111111]' };
  if (role === 'landlord')
    return {
      label: 'Partner portal',
      href: '/landlord/overview',
      className: 'bg-[#C0392B] text-white hover:bg-[#992d24]',
    };
  return { label: 'Tenant home', href: '/tenant/home', className: 'bg-[#C0392B] text-white hover:bg-[#992d24]' };
}

export default function DashboardShell({
  role,
  roleLabel,
  sectionTitle,
  sectionDescription,
  navItems,
  children,
  banner,
  headerBadge,
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

  const isAdminShell = role === 'admin';
  const isPartnerShell = role === 'landlord';
  const isTenantShell = role === 'tenant';
  const isPolishedShell = isAdminShell || isPartnerShell || isTenantShell;

  const sidebar = (
    <aside
      className={`flex h-full w-[260px] flex-col border-r ${
        isPolishedShell ? 'border-[var(--rc-border)] bg-[var(--rc-card)]' : 'border-gray-200 bg-[var(--rc-card-alt)]'
      }`}
    >
      <div className={`border-b p-5 ${isPolishedShell ? 'border-slate-200' : 'border-gray-200'}`}>
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.35em] ${
            isPolishedShell ? 'text-[#C0392B]/90' : 'text-gray-500'
          }`}
        >
          {roleLabel}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-[#1A1A1A]">{sectionTitle}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{sectionDescription}</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item, index) => {
          const hasMoreSpecificMatch = navItems.some(
            (other) =>
              other.href !== item.href &&
              other.href.length > item.href.length &&
              (pathname === other.href || pathname.startsWith(`${other.href}/`)) &&
              (other.href === item.href || other.href.startsWith(`${item.href}/`)),
          );
          const active =
            !hasMoreSpecificMatch &&
            (pathname === item.href ||
              (item.href === '/admin' && pathname === '/admin') ||
              (item.href === '/landlord/overview' && (pathname === '/landlord' || pathname === '/landlord/overview')) ||
              (item.href === '/tenant/home' && (pathname === '/tenant' || pathname === '/tenant/home')) ||
              (item.href !== `/${role}` &&
                item.href !== '/admin' &&
                item.href !== '/landlord/overview' &&
                item.href !== '/tenant/home' &&
                pathname.startsWith(`${item.href}/`)));
          const NavIcon = resolveNavIcon(item.icon);
          return (
            <div key={item.href}>
              {item.section ? (
                <p
                  className={`px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 ${
                    index === 0 ? 'pt-0' : 'pt-4'
                  }`}
                >
                  {item.section}
                </p>
              ) : null}
            {item.locked ? (
              <span
                title={item.lockReason || 'Complete verification to unlock'}
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400"
              >
                {NavIcon ? <NavIcon className="h-4 w-4 shrink-0 opacity-50" aria-hidden /> : null}
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? isPolishedShell
                      ? 'bg-[#C0392B] text-white shadow-md shadow-[#C0392B]/20'
                      : 'bg-[#1A1A2E] text-white'
                    : isPolishedShell
                      ? 'text-slate-700 hover:bg-[#FDEDEC]'
                      : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {NavIcon ? (
                  <NavIcon className="h-4 w-4 shrink-0" aria-hidden />
                ) : typeof item.icon === 'string' ? (
                  <span className="text-base" aria-hidden>
                    {item.icon}
                  </span>
                ) : null}
                {item.label}
              </Link>
            )}
            </div>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <NotificationsProvider>
    <div className="min-h-screen bg-[var(--rc-bg,#F3F4F6)]">
      <header
        className={`fixed left-0 right-0 top-0 z-50 h-16 border-b backdrop-blur ${
          isPolishedShell ? 'border-[var(--rc-border)] bg-[var(--rc-bg)]/95' : 'border-[var(--rc-border)] bg-[var(--rc-card)]'
        }`}
      >
        <div className="flex h-full items-center justify-between gap-4 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <Logo />
            <div className="hidden lg:block">
              <MarketingNav compact />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerBadge}
            <ThemeToggle compact />
            {isPolishedShell ? <NotificationBell role={role} /> : null}
            <Link href={pill.href} className={`rounded-full px-4 py-2 text-sm font-semibold ${pill.className}`}>
              {pill.label}
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#1A1A1A] hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="hidden md:fixed md:left-0 md:top-16 md:z-40 md:block md:h-[calc(100vh-4rem)] md:w-[260px]">
        {sidebar}
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-label="Close menu" />
          <div className="absolute left-0 top-0 flex h-full w-[min(280px,88vw)] flex-col shadow-xl">
            <div className="flex justify-end border-b border-slate-200 bg-white p-2">
              <button
                type="button"
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">{sidebar}</div>
          </div>
        </div>
      ) : null}

      <main className="mt-16 min-h-[calc(100vh-4rem)] p-4 md:ml-[260px] md:p-8">
        {banner}
        {children}
      </main>
    </div>
    </NotificationsProvider>
  );
}
