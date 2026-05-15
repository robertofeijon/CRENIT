import type { ReactNode } from 'react';
import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '../src/contexts/AuthContext';
import Header from './components/Header';

export const metadata: Metadata = {
  title: 'RentCredit',
  description: 'RentCredit fintech platform for rent payments and credit score building.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Header />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
