'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../../src/contexts/AuthContext';
import MarketingNav from '../layout/MarketingNav';
import AuthModal from '../auth/AuthModal';
import Logo from '../ui/Logo';

type MarketingHeaderProps = {
  onOpenAuth?: (mode: 'login' | 'register') => void;
};

export default function MarketingHeader({ onOpenAuth }: MarketingHeaderProps) {
  const { user, role, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [internalAuthOpen, setInternalAuthOpen] = useState(false);
  const [internalAuthMode, setInternalAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const dashboardLink = role === 'ADMIN' ? '/admin' : role === 'LANDLORD' ? '/landlord/overview' : '/tenant/home';
  const dashboardLabel = role === 'ADMIN' ? 'Admin' : role === 'LANDLORD' ? 'Partner portal' : 'My account';

  const openAuth = (mode: 'login' | 'register') => {
    if (onOpenAuth) {
      onOpenAuth(mode);
    } else {
      setInternalAuthMode(mode);
      setInternalAuthOpen(true);
    }
    setMobileOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="marketing-container flex h-[72px] items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-700 lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Logo />
            <div className="hidden lg:block">
              <MarketingNav />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <Link href={dashboardLink} className="marketing-btn-primary hidden sm:inline-flex">
                  {dashboardLabel}
                </Link>
                <button type="button" onClick={() => void logout()} className="marketing-btn-ghost text-sm">
                  Logout
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => openAuth('login')} className="marketing-btn-ghost hidden sm:inline-flex">
                  Login
                </button>
                <Link href="/company/contact" className="marketing-btn-outline hidden md:inline-flex">
                  Talk to sales
                </Link>
                <button type="button" onClick={() => openAuth('register')} className="marketing-btn-primary">
                  Get started
                </button>
              </>
            )}
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-slate-100 bg-white px-4 py-4 lg:hidden">
            <MarketingNav compact />
            {!user ? (
              <div className="mt-4 flex flex-col gap-2">
                <button type="button" className="marketing-btn-ghost w-full justify-center" onClick={() => openAuth('login')}>
                  Login
                </button>
                <button type="button" className="marketing-btn-primary w-full justify-center" onClick={() => openAuth('register')}>
                  Get started
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>
      {!onOpenAuth ? (
        <AuthModal open={internalAuthOpen} mode={internalAuthMode} onClose={() => setInternalAuthOpen(false)} />
      ) : null}
    </>
  );
}
