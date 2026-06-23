'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import MarketingNav from '../layout/MarketingNav';
import Logo from '../ui/Logo';
import ThemeToggle from '../ui/ThemeToggle';

export default function MarketingHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`marketing-header rc-glass-header sticky top-0 z-50 w-full border-b transition-shadow duration-300 ${
        scrolled ? 'marketing-header--scrolled' : ''
      }`}
    >
      <div className="marketing-header__glow" aria-hidden />
      <div className="marketing-container flex h-[72px] items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <button
            type="button"
            className="rounded-lg p-2 transition hover:bg-[var(--rc-hover)] lg:hidden"
            style={{ color: 'var(--rc-text)' }}
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
          <ThemeToggle compact className="hidden sm:inline-flex" />
          <Link href="/auth" className="marketing-btn-ghost hidden sm:inline-flex">
            Login
          </Link>
          <Link href="/company/contact" className="marketing-btn-outline hidden md:inline-flex">
            Talk to sales
          </Link>
          <Link href="/auth?mode=register" className="marketing-btn-primary marketing-btn-primary--glow">
            Get started
          </Link>
        </div>
      </div>

      {mobileOpen ? (
        <div
          className="border-t px-4 py-4 lg:hidden"
          style={{ borderColor: 'var(--rc-border)', background: 'var(--rc-card)' }}
        >
          <MarketingNav compact />
          <div className="mt-4 flex flex-col gap-2">
            <ThemeToggle className="w-full justify-center" />
            <Link href="/auth" className="marketing-btn-ghost w-full justify-center">
              Login
            </Link>
            <Link href="/auth?mode=register" className="marketing-btn-primary w-full justify-center">
              Get started
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
