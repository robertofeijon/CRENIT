import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL } from '../../../src/lib/site';
import ContactForm from './ContactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact the CRENIT team for partnerships, market data access, and support.',
};

export default function ContactPage() {
  return (
    <main className="min-h-[80vh] bg-[#F5F5F5] py-20">
      <div className="mx-auto max-w-3xl px-6 sm:px-8">
        <div className="rounded-[2rem] bg-white p-10 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
          <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Contact</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#1A1A1A]">Get in touch with the CRENIT team</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Sales, partnerships, market intelligence access, or general questions — we typically respond within one business day.
          </p>
          <p className="mt-4 text-sm text-slate-600">
            Prefer email?{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-[#C0392B] hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
          <ContactForm />
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/auth" className="text-sm font-semibold text-[#C0392B] hover:underline">
              Sign in to your account
            </Link>
            <Link href="/company" className="text-sm font-semibold text-slate-600 hover:text-[#1A1A1A]">
              ← Back to company
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
