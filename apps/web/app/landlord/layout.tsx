"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Overview', href: '/landlord/overview', icon: '📈' },
  { label: 'Payments', href: '/landlord/payments', icon: '💳' },
  { label: 'Tenants', href: '/landlord/tenants', icon: '👥' },
  { label: 'Deposits', href: '/landlord/deposits', icon: '🏦' },
  { label: 'Properties', href: '/landlord/properties', icon: '🏠' },
  { label: 'Reports', href: '/landlord/reports', icon: '📄' },
  { label: 'Settings', href: '/landlord/settings', icon: '⚙️' },
];

export default function LandlordLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Landlord workspace</p>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900">Portfolio</h2>
          <p className="mt-3 text-sm text-slate-600">Manage invites, tenants, payments, and reporting.</p>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
