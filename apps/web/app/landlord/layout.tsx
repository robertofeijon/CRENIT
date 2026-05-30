'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import api from '../../src/lib/api';
import { useAuth } from '../../src/contexts/AuthContext';
import DashboardShell from '../components/layout/DashboardShell';
import { landlordNavItems } from '../components/landlord/landlordNav';
import LandlordPartnerBanner, { type PartnerBannerState } from '../components/landlord/LandlordPartnerBanner';

export default function LandlordLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, loading, roleReady } = useAuth();
  const [partnerState, setPartnerState] = useState<PartnerBannerState | null>(null);

  useEffect(() => {
    if (!loading && roleReady && !user) router.replace('/auth');
    if (
      !loading &&
      roleReady &&
      user &&
      role &&
      role !== 'LANDLORD' &&
      role !== 'ADMIN'
    ) {
      router.replace('/tenant/home');
    }
  }, [loading, roleReady, user, role, router]);

  useEffect(() => {
    if (pathname === '/landlord') {
      router.replace('/landlord/overview');
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!user || (role !== 'LANDLORD' && role !== 'ADMIN')) return;
    let active = true;
    api
      .get('/landlords/overview')
      .then((res) => {
        if (!active) return;
        const data = res.data?.data;
        setPartnerState({
          partnerStatus: data?.landlord?.partnerStatus,
          awaitingDirectConfirmations: data?.stats?.awaitingDirectConfirmations,
          businessName: data?.landlord?.businessName,
        });
      })
      .catch(() => {
        if (active) setPartnerState(null);
      });
    return () => {
      active = false;
    };
  }, [user, role]);

  if (loading || !roleReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6]">
        <p className="text-sm text-slate-500">Loading partner workspace…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (role !== 'LANDLORD' && role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] p-6">
        <p className="max-w-md text-center text-sm text-slate-600">
          This account is not a landlord partner.{' '}
          <a href="/auth" className="font-semibold text-[#C0392B] hover:underline">
            Sign in with a different account
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <DashboardShell
      role="landlord"
      roleLabel="CRENIT Partner"
      sectionTitle="Landlord portal"
      sectionDescription="Manage properties, tenants, rent collection, and verified reports — built for trusted partners."
      navItems={landlordNavItems}
      banner={<LandlordPartnerBanner state={partnerState} />}
    >
      {children}
    </DashboardShell>
  );
}
