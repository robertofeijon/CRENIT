'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import MarketingNav from '../layout/MarketingNav';
import Logo from '../ui/Logo';
import ThemeToggle from '../ui/ThemeToggle';

export default function MarketingHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--rc-border,#e2e8f0)] bg-[var(--rc-card,#fff)]">
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
          <ThemeToggle compact className="hidden sm:inline-flex" />
          <Link href="/auth" className="marketing-btn-ghost hidden sm:inline-flex">
            Login
          </Link>
          <Link href="/company/contact" className="marketing-btn-outline hidden md:inline-flex">
            Talk to sales
          </Link>
          <Link href="/auth?mode=register" className="marketing-btn-primary">
            Get started
          </Link>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-[var(--rc-border,#f1f5f9)] bg-[var(--rc-card,#fff)] px-4 py-4 lg:hidden">
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
