"use client";

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import api from '../../src/lib/api';

const navItems = [
  { label: 'Home', href: '/tenant/home', icon: '🏠' },
  { label: 'Payments', href: '/tenant/payments', icon: '💳' },
  { label: 'Deposit', href: '/tenant/deposit', icon: '🏦' },
  { label: 'Credit Score', href: '/tenant/credit-score', icon: '📊' },
  { label: 'Reports', href: '/tenant/reports', icon: '📄' },
  { label: 'Settings', href: '/tenant/settings', icon: '⚙️' },
];

export default function TenantLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [kycStatus, setKycStatus] = useState<string>('NOT_SUBMITTED');
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchStatus = async () => {
      try {
        const response = await api.get('/kyc/status');
        if (!active) return;
        setKycStatus(response.data?.data?.profile?.kyc_status ?? 'NOT_SUBMITTED');
      } catch {
        if (!active) return;
        setKycStatus('NOT_SUBMITTED');
      } finally {
        if (active) setLoadingStatus(false);
      }
    };

    fetchStatus();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loadingStatus && kycStatus === 'NOT_SUBMITTED' && pathname !== '/tenant/kyc') {
      router.replace('/tenant/kyc');
    }
  }, [kycStatus, loadingStatus, pathname, router]);

  const disabledNav = kycStatus !== 'APPROVED';
  const showBanner = ['PENDING', 'REJECTED'].includes(kycStatus);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Tenant workspace</p>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900">RentCredit</h2>
          <p className="mt-3 text-sm text-slate-600">Rent, credit, payments and KYC in one place.</p>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium">KYC status</p>
            <p className="mt-2">
              {kycStatus === 'APPROVED' ? 'Verified ✅' : kycStatus === 'PENDING' ? 'Under review 🟡' : kycStatus === 'REJECTED' ? 'Rejected 🔴' : 'Action required 🔴'}
            </p>
          </div>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const disabled = disabledNav && item.href !== '/tenant/settings';
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="space-y-6">
          {showBanner ? (
            <div className="rounded-3xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
              {kycStatus === 'PENDING' && (
                <p>Your verification is under review. You can view the dashboard, but payment and report actions are disabled until approval.</p>
              )}
              {kycStatus === 'REJECTED' && (
                <p>Your verification was rejected. Please correct your documents and resubmit via Settings.</p>
              )}
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
