'use client';

import type { ReactNode } from 'react';
import Revealer from '../../../src/components/Revealer';

type MarketingSectionRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/** Scroll-triggered fade-up for marketing sections (respects reduced motion via Revealer). */
export default function MarketingSectionReveal({ children, className = '', delay = 0 }: MarketingSectionRevealProps) {
  return (
    <Revealer className={className} delay={delay}>
      {children}
    </Revealer>
  );
}
