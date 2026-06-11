'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import api from '../../src/lib/api';
import { useAuth } from '../../src/contexts/AuthContext';
import DashboardShell from '../components/layout/DashboardShell';
import { landlordNavItems } from '../components/landlord/landlordNav';
import LandlordPartnerBanner, { type PartnerBannerState } from '../components/landlord/LandlordPartnerBanner';
import LandlordVerificationBanner from '../components/landlord/LandlordVerificationBanner';
import LandlordVerificationBadge, {
  type VerificationDisplayStatus,
} from '../components/landlord/LandlordVerificationBadge';
import LandlordKycPanel from '../components/landlord/LandlordKycPanel';
import LandlordLockedRouteGuard from '../components/landlord/LandlordLockedRouteGuard';
import {
  isLandlordVerificationLockedPath,
  LANDLORD_VERIFICATION_LOCK_REASON,
} from '../components/landlord/landlordVerificationPaths';

const BANNER_DISMISS_KEY = 'crenit_landlord_kyc_banner_dismissed';

function mapPartnerToDisplay(partnerStatus?: string | null): VerificationDisplayStatus {
  const s = (partnerStatus || '').toUpperCase();
  if (s === 'APPROVED') return 'VERIFIED';
  if (s === 'REJECTED') return 'REJECTED';
  if (s === 'PENDING_REVIEW' || s === 'PENDING_APPROVAL' || s === 'PENDING') return 'PENDING_REVIEW';
  return 'UNVERIFIED';
}

export default function LandlordShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, loading, roleReady, twoFactorRequired, twoFactorSetupRequired } = useAuth();
  const [partnerState, setPartnerState] = useState<PartnerBannerState | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationDisplayStatus>('UNVERIFIED');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelStep, setPanelStep] = useState<1 | 2 | 3>(1);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const loadVerification = useCallback(async () => {
    try {
      const res = await api.get('/landlords/kyc/status');
      const data = res.data?.data;
      const display =
        (data?.verification_status as VerificationDisplayStatus) ||
        mapPartnerToDisplay(data?.partner_approval_status);
      setVerificationStatus(display);
      setRejectionReason(data?.profile?.kyc_rejection_reason ?? null);
    } catch {
      setVerificationStatus(mapPartnerToDisplay(partnerState?.partnerStatus));
    }
  }, [partnerState?.partnerStatus]);

  useEffect(() => {
    if (!loading && roleReady && !user) router.replace('/auth');
    if (!loading && roleReady && user && role && role !== 'LANDLORD' && role !== 'ADMIN') {
      router.replace('/tenant/home');
    }
    if (!loading && roleReady && role === 'LANDLORD') {
      if (twoFactorSetupRequired && !pathname?.startsWith('/landlord/settings')) {
        router.replace('/landlord/settings');
        return;
      }
      if (twoFactorRequired) {
        router.replace('/auth/verify-2fa');
      }
    }
  }, [loading, roleReady, user, role, router, twoFactorRequired, twoFactorSetupRequired, pathname]);

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

  useEffect(() => {
    if (user && role === 'LANDLORD') void loadVerification();
  }, [user, role, loadVerification]);

  useEffect(() => {
    try {
      setBannerDismissed(localStorage.getItem(BANNER_DISMISS_KEY) === '1');
    } catch {
      setBannerDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('verify') === '1') {
      const step = Number(params.get('step'));
      setPanelStep(step >= 1 && step <= 3 ? (step as 1 | 2 | 3) : 1);
      setPanelOpen(true);
    }
  }, [pathname]);

  const verified = verificationStatus === 'VERIFIED';
  const routeBlocked =
    role === 'LANDLORD' && !verified && isLandlordVerificationLockedPath(pathname);

  const navItems = useMemo(
    () =>
      landlordNavItems.map((item) => ({
        ...item,
        locked: !verified && isLandlordVerificationLockedPath(item.href),
        lockReason: LANDLORD_VERIFICATION_LOCK_REASON,
      })),
    [verified],
  );

  const openVerification = (step: 1 | 2 | 3 = 1) => {
    setPanelStep(step);
    setPanelOpen(true);
  };

  const dismissBanner = () => {
    setBannerDismissed(true);
    try {
      localStorage.setItem(BANNER_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  if (loading || !roleReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6]">
        <p className="text-sm text-slate-500">Loading partner workspace…</p>
      </div>
    );
  }

  if (!user) return null;

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
    <>
      <DashboardShell
        role="landlord"
        roleLabel="CRENIT Partner"
        sectionTitle="Landlord portal"
        sectionDescription="Manage properties, tenants, rent collection, and verified reports — built for trusted partners."
        navItems={navItems}
        headerBadge={<LandlordVerificationBadge status={verificationStatus} />}
        banner={
          <>
            {!bannerDismissed && (verificationStatus === 'UNVERIFIED' || verificationStatus === 'REJECTED') ? (
              <LandlordVerificationBanner
                status={verificationStatus}
                rejectionReason={rejectionReason}
                onOpenVerification={() => openVerification(verificationStatus === 'REJECTED' ? panelStep : 1)}
                onDismiss={dismissBanner}
              />
            ) : null}
            <LandlordPartnerBanner state={partnerState} verificationStatus={verificationStatus} />
          </>
        }
      >
        {routeBlocked ? (
          <LandlordLockedRouteGuard onOpenVerification={() => openVerification(1)} />
        ) : (
          children
        )}
      </DashboardShell>
      <LandlordKycPanel
        open={panelOpen}
        initialStep={panelStep}
        onClose={() => setPanelOpen(false)}
        onStatusChange={() => void loadVerification()}
      />
    </>
  );
}
