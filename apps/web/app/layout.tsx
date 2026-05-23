import type { ReactNode } from 'react';
import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '../src/contexts/AuthContext';
import AppShell from './components/layout/AppShell';

export const metadata: Metadata = {
  title: 'RentCredit',
  description: 'RentCredit fintech platform for rent payments and credit score building.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
