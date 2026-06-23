'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from '../../../src/contexts/ThemeContext';

/** Intrinsic dimensions — both assets share the same aspect ratio (~1.47:1). */
const LOGO_INTRINSIC = { width: 753, height: 512 } as const;
const LOGO_FULL_INTRINSIC = { width: 1821, height: 1237 } as const;

const LOGO_HEIGHT: Record<'nav' | 'md' | 'lg', number> = {
  nav: 36,
  md: 44,
  lg: 56,
};

export type LogoProps = {
  /** nav ≈ 36px — header/sidebar; md ≈ 44px — auth; lg ≈ 56px — marketing footer */
  size?: 'nav' | 'md' | 'lg';
  /** Always render as light-on-dark (e.g. navy marketing footer). */
  onDarkBg?: boolean;
  className?: string;
};

export default function Logo({ size = 'nav', onDarkBg = false, className = '' }: LogoProps) {
  const { theme } = useTheme();
  const height = LOGO_HEIGHT[size];
  const useFullRes = size === 'lg';
  const src = useFullRes ? '/logo/crenit-logo.png' : '/logo/crenit-logo@512h.png';
  const intrinsic = useFullRes ? LOGO_FULL_INTRINSIC : LOGO_INTRINSIC;
  const needsLightTreatment = onDarkBg || theme === 'dark';

  return (
    <Link
      href="/"
      className={`inline-flex shrink-0 items-center ${className}`.trim()}
      aria-label="CRENIT home"
    >
      <Image
        src={src}
        alt="CRENIT"
        width={intrinsic.width}
        height={intrinsic.height}
        priority={size === 'nav'}
        sizes={`${Math.round(height * (intrinsic.width / intrinsic.height))}px`}
        className={`crenit-logo crenit-logo--${size} ${needsLightTreatment ? 'crenit-logo--light' : ''}`}
        style={{ height, width: 'auto' }}
      />
    </Link>
  );
}
