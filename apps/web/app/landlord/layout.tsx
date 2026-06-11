import type { ReactNode } from 'react';
import LandlordShell from './LandlordShell';

/** Avoid static prerender errors for authenticated landlord routes at build time. */
export const dynamic = 'force-dynamic';

export default function LandlordLayout({ children }: { children: ReactNode }) {
  return <LandlordShell>{children}</LandlordShell>;
}
