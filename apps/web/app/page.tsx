'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import NumberCounter from '../src/components/NumberCounter';
import Revealer from '../src/components/Revealer';
import ForceRevealButton from '../src/components/ForceRevealButton';
import RentalCreditModelCard from './components/credit/RentalCreditModelCard';

const services = [
  {
    key: 'Rent Payments',
    title: 'Rent Payments',
    description:
      'Streamline rent collection, automate receipts, and provide tenants with an on-time payment record that can be reported for credit building.',
    highlight: 'Fast reconciliation and verified payment history.',
  },
  {
    key: 'Credit Score',
    title: 'Credit Score',
    description:
      'Turn every verified rent payment into a trusted credit data point so tenants can build strong financial profiles and access better lending terms.',
    highlight: 'Transparent scoring backed by rental behavior.',
  },
  {
    key: 'Deposit Management',
    title: 'Deposit Management',
    description:
      'Manage tenant deposits securely while giving tenants confidence that their funds are held and returned fairly.',
    highlight: 'Secure flow for landlords and renters.',
  },
  {
    key: 'KYC & Identity',
    title: 'KYC & Identity',
    description:
      'Verify tenant identity in minutes with document capture and streamlined onboarding for landlords and partners.',
    highlight: 'Reduce fraud and speed approvals.',
  },
  {
    key: 'Market Data',
    title: 'Market Data',
    description:
      'Access verified rent and occupancy trends across Namibia to power smarter pricing, underwriting, and portfolio decisions.',
    highlight: 'Actionable insights for market-leading decisions.',
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('Credit Score');
  const [showDemo, setShowDemo] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(300);

  useEffect(() => {
    const start = performance.now();
    const durationMs = 1400;
    const from = 300;
    const to = 780;
    let rafId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const needle = useMemo(() => {
    const ratio = Math.max(0, Math.min(1, (animatedScore - 300) / 600));
    const angle = Math.PI - ratio * Math.PI;
    const length = 64;
    return {
      x: 120 + Math.cos(angle) * length,
      y: 100 - Math.sin(angle) * length,
    };
  }, [animatedScore]);

  return (
    <main className="bg-[#F3F4F6] text-[#111827]">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-[#F3F4F6]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <Link href="/" className="text-lg font-semibold tracking-wide text-[#1A1A1A]">RentCredit</Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a href="#services" className="hover:text-[#1A1A1A]">Services</a>
            <a href="#market-data" className="hover:text-[#1A1A1A]">Market Data</a>
            <a href="#get-started" className="hover:text-[#1A1A1A]">Get Started</a>
          </nav>
          <Link
            href="/auth"
            className="inline-flex items-center justify-center rounded-full bg-[#C0392B] px-5 py-2 text-sm font-semibold text-white shadow-md shadow-[#C0392B]/25 transition hover:bg-[#992d24]"
          >
            Login
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-8 sm:py-6">
        <section id="about" className="rounded-[2rem] bg-white px-6 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.08)] sm:px-12 sm:py-14">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 inline-flex rounded-full border border-[#C0392B]/20 bg-[#FDEDEC] px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#C0392B]">
              PARTNER LANDLORDS NOW ACCEPTING APPLICATIONS
            </div>
            <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">RentCredit</p>
                <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-[#1A1A1A] sm:text-5xl">
                  Every Payment Builds Your <span className="text-[#C0392B]">Credit Story</span>
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                  RentCredit helps landlords manage portfolios while tenants build verified credit from rent payments.
                </p>
                <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                  <Link
                    href="/auth"
                    className="inline-flex items-center justify-center rounded-full bg-[#C0392B] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-[#C0392B]/20 transition hover:bg-[#992d24]"
                  >
                    Get Started Free
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowDemo(true)}
                    className="inline-flex items-center justify-center rounded-full border border-[#1A1A1A] px-7 py-3 text-sm font-semibold text-[#1A1A1A] transition hover:bg-slate-100"
                  >
                    Watch Demo
                  </button>
                </div>
                <div className="mt-12 stat-grid">
                  {[
                    { label: 'Tracked', value: 'N$2.8B+' },
                    { label: 'Tenants', value: '3.5M+' },
                    { label: 'On-Time Rate', value: '95%' },
                    { label: 'Avg Score Lift', value: '48 pts' },
                  ].map((stat, idx) => (
                    <Revealer key={stat.label} delay={idx * 80} className="stat-card">
                      {(inView: boolean) => (
                        <>
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{stat.label}</p>
                          <NumberCounter value={stat.value} play={inView} className="stat-value" />
                        </>
                      )}
                    </Revealer>
                  ))}
                </div>
              </div>
              <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[#F8F8F8] p-8 shadow-sm">
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#C0392B]/10 blur-3xl" />
                <div className="rounded-[1.75rem] bg-[#1A1A1A] px-8 py-10 text-white shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
                  <p className="text-xs uppercase tracking-[0.35em] text-[#F5F5F5]/70">RentCredit Platform</p>
                  <h2 className="mt-6 text-3xl font-semibold">Build, verify and leverage rent payment history in one place.</h2>
                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    {['Verified records', 'Score-powered reports', 'Tenant onboarding', 'Portfolio oversight'].map((item) => (
                      <div key={item} className="rounded-3xl bg-[#111111]/90 p-5 text-sm text-slate-200">
                        <p>{item}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 rounded-3xl border border-white/10 bg-[#111111] p-5">
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Live score</p>
                    <div className="mt-3 flex items-end justify-between">
                      <p className="text-3xl font-semibold">{animatedScore}</p>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Good</span>
                    </div>
                    <svg viewBox="0 0 240 120" className="mt-3 h-[120px] w-full">
                      <path d="M20 100 A100 100 0 0 1 220 100" fill="none" stroke="#2a2a2a" strokeWidth="16" />
                      <path d="M30 100 A90 90 0 0 1 210 100" fill="none" stroke="#C0392B" strokeWidth="12" strokeLinecap="round" />
                      <circle cx="120" cy="100" r="7" fill="#FFFFFF" />
                      <line x1="120" y1="100" x2={needle.x} y2={needle.y} stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mt-20">
          <div className="mb-10 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">How it works</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#1A1A1A]">The Core Loop</h2>
            </div>
          </div>
          <div className="grid gap-4 overflow-x-auto pb-6 sm:grid-cols-3 lg:grid-cols-6">
            {[
              'Partner Landlord Onboards',
              'Tenant Pays Via Platform',
              'Commission Earned',
              'Payment Verified & Recorded',
              'Credit Score Updated',
              'Score Used for Loan / Mortgage',
            ].map((step, idx) => (
              <Revealer key={step} delay={idx * 60} className="group relative rounded-[1.75rem] border border-slate-200 bg-white p-6 text-center shadow-sm">
                {(inView: boolean) => (
                  <>
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#C0392B]/10 text-[#C0392B] font-semibold">{idx + 1}</div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">{step}</p>
                    {idx < 5 ? (
                      <div className="pointer-events-none absolute right-[-15px] top-1/2 hidden h-8 w-8 -translate-y-1/2 rotate-45 border-r border-b border-slate-200 sm:block" />
                    ) : null}
                  </>
                )}
              </Revealer>
            ))}
          </div>
        </section>

        <section id="services" className="mt-20">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Our Services</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#1A1A1A]">Our Services</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {services.map((service) => (
                <button
                  key={service.key}
                  type="button"
                  onClick={() => setActiveTab(service.key)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    activeTab === service.key
                      ? 'border-[#C0392B] bg-[#C0392B] text-white'
                      : 'border-slate-300 bg-white text-[#1A1A1A] hover:border-[#C0392B]/60'
                  }`}
                >
                  {service.key}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm">
              <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">{activeTab}</p>
              <h3 className="text-3xl font-semibold text-[#1A1A1A]">{services.find((service) => service.key === activeTab)?.title}</h3>
              <p className="max-w-xl text-lg leading-8 text-slate-600">{services.find((service) => service.key === activeTab)?.description}</p>
              <p className="text-sm font-semibold text-[#C0392B]">{services.find((service) => service.key === activeTab)?.highlight}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-[#F5F5F5] p-5">
                  <p className="text-sm font-semibold text-[#1A1A1A]">Workflow</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">A single experience for landlords, tenants, and financial partners.</p>
                </div>
                <div className="rounded-3xl bg-[#F5F5F5] p-5">
                  <p className="text-sm font-semibold text-[#1A1A1A]">Verified Data</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">Every value comes from rental behavior and verified transaction records.</p>
                </div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-[#F8F8F8] p-6 shadow-sm sm:p-10">
              {activeTab === 'Credit Score' ? (
                <div className="space-y-4">
                  <RentalCreditModelCard />
                  <div className="relative overflow-hidden rounded-[1.75rem] bg-white p-8 shadow-lg">
                  <div className="absolute inset-x-0 top-0 h-1 bg-[#C0392B]/20" />
                  <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Score Gauge</p>
                  <div className="mt-8 flex items-end justify-between gap-6">
                    <div className="text-5xl font-semibold text-[#1A1A1A]">{animatedScore}</div>
                    <div className="rounded-3xl bg-[#F5F5F5] px-4 py-2 text-sm font-semibold text-[#1A1A1A]">Good</div>
                  </div>
                  <div className="mt-8 flex items-center justify-center">
                    <svg viewBox="0 0 240 120" className="h-[220px] w-full">
                      <path d="M20 100 A100 100 0 0 1 220 100" fill="none" stroke="#E5E7EB" strokeWidth="18" />
                      <path d="M30 100 A90 90 0 0 1 210 100" fill="none" stroke="#C0392B" strokeWidth="14" strokeLinecap="round" />
                      <circle cx="120" cy="100" r="8" fill="#1A1A1A" />
                      <line x1="120" y1="100" x2={needle.x} y2={needle.y} stroke="#1A1A1A" strokeWidth="6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-4 text-center text-sm text-slate-600">
                    <div>
                      <p className="font-semibold text-[#1A1A1A]">300</p>
                      <p>Min</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#1A1A1A]">{animatedScore}</p>
                      <p>Current</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#1A1A1A]">900</p>
                      <p>Max</p>
                    </div>
                  </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.75rem] bg-white p-10 text-center text-sm text-slate-600 shadow-lg">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#C0392B]/10 text-[#C0392B] text-3xl">{activeTab.charAt(0)}</div>
                  <p className="text-lg font-semibold text-[#1A1A1A]">{activeTab} Preview</p>
                  <p className="mt-4 leading-7">A polished illustration of the platform experience for {activeTab.toLowerCase()} partners.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="market-data" className="mt-20 rounded-[2rem] bg-[#1A1A1A] px-6 py-10 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)] sm:px-10">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/80">Verified rent data</p>
              <h2 className="mt-3 text-3xl font-semibold">Real Verified Rent Data — Nowhere Else in Namibia</h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              Our proprietary dataset is built from actual tenant payments, not advertised listings. That means lenders and landlords can rely on transactional performance, not estimates.
            </p>
          </div>
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-700 bg-[#111111]">
            <table className="min-w-full border-collapse text-left text-sm text-slate-200">
              <thead className="bg-[#141414] text-slate-400">
                <tr>
                  <th className="px-6 py-4">Suburb</th>
                  <th className="px-6 py-4">Verified Avg Rent (2BR)</th>
                  <th className="px-6 py-4">On-Time Rate</th>
                  <th className="px-6 py-4">Key Uses</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Khomasdal', 'N$8,200', '92%', 'Rental pricing'],
                  ['Pioneerspark', 'N$7,450', '94%', 'Underwriting'],
                  ['Katutura', 'N$6,900', '91%', 'Tenant screening'],
                  ['Klein Windhoek', 'N$10,300', '96%', 'Deposit analytics'],
                  ['Olympia', 'N$9,050', '95%', 'Portfolio insights'],
                  ['Eros', 'N$11,100', '97%', 'Market forecasting'],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-slate-800 hover:bg-[#181818]">
                    <td className="px-6 py-4 font-semibold text-white">{row[0]}</td>
                    <td className="px-6 py-4">{row[1]}</td>
                    <td className="px-6 py-4">{row[2]}</td>
                    <td className="px-6 py-4 text-slate-300">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="social-proof" className="mt-20">
          <div className="mb-10">
            <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">What Our Partners Say</p>
            <h2 className="mt-3 text-3xl font-semibold text-[#1A1A1A]">What Our Partners Say</h2>
          </div>
            <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                quote: 'RentCredit made rent payments transparent and helped us show renters as credible borrowers.',
                name: 'Linda N.',
                role: 'Property Manager',
              },
              {
                quote: 'Our tenants now have a way to build credit history while we get cleaner reporting.',
                name: 'Tomas K.',
                role: 'Landlord',
              },
              {
                quote: 'The verified data has changed how we underwrite rental-backed lending products.',
                name: 'Sarah M.',
                role: 'Banking Partner',
              },
            ].map((testimonial, idx) => (
              <div
                key={testimonial.name}
                className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm reveal"
                style={{ animationDelay: `${idx * 90}ms` }}
              >
                <p className="text-lg leading-8 text-slate-700">“{testimonial.quote}”</p>
                <div className="mt-6">
                  <p className="font-semibold text-[#1A1A1A]">{testimonial.name}</p>
                  <p className="text-sm text-slate-500">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="get-started" className="mt-20 grid gap-6 lg:grid-cols-2">
          <div id="for-tenants" className="rounded-[2rem] bg-[#1A1A1A] p-10 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
            <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Are You a Tenant?</p>
            <h3 className="mt-4 text-3xl font-semibold">Find credit strength in every on-time payment.</h3>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
              Sign up as a tenant to start building a verified credit profile from rent payments and make stronger applications for future housing.
            </p>
            <Link
              href="/auth"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-[#1A1A1A] shadow-lg shadow-[#000000]/10 transition hover:bg-slate-100"
            >
              Sign Up as Tenant
            </Link>
          </div>
          <div id="for-landlords" className="rounded-[2rem] bg-white p-10 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
            <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Are You a Landlord?</p>
            <h3 className="mt-4 text-3xl font-semibold text-[#1A1A1A]">Manage your portfolio with verified rent finance.</h3>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
              Partner with RentCredit to improve portfolio insights, reduce risk, and help your tenants build financial identity.
            </p>
            <Link
              href="/auth"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#C0392B] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-[#C0392B]/20 transition hover:bg-[#992d24]"
            >
              Partner With Us
            </Link>
          </div>
        </section>

        <footer className="mt-20 rounded-[2rem] bg-[#1A1A1A] px-8 py-14 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
          <div className="footer-grid">
            <div>
              <p className="text-2xl font-semibold text-white">RentCredit</p>
              <p className="mt-4 max-w-xs text-sm leading-7 text-slate-400">Turning Rent Payments Into Financial Identity</p>
            </div>
            {[
              { title: 'Products', links: ['Rent Payments', 'Credit Score', 'Deposit Management', 'Market Data'] },
              { title: 'Solutions', links: ['For Tenants', 'For Landlords', 'For Banks & Lenders', 'For Developers'] },
              { title: 'Company', links: ['About Us', 'How It Works', 'Blog', 'Contact'] },
              { title: 'Support', links: ['Help Center', 'Terms', 'Privacy', 'Partners'] },
            ].map((column) => (
              <div key={column.title}>
                <p className="mb-5 text-sm uppercase tracking-[0.35em] text-slate-500">{column.title}</p>
                <ul className="space-y-3 text-sm text-slate-300">
                  {column.links.map((link) => (
                    <li key={link}>{link}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col gap-4 border-t border-slate-700 pt-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between" id="contact">
            <p>rentcredit.co · hello@rentcredit.co · Windhoek, Namibia</p>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-600">Build Credit</p>
          </div>
        </footer>
      </div>

      {showDemo ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10">
    <div className="w-full max-w-3xl rounded-[2rem] bg-white p-6 shadow-2xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-[#C0392B]/90">Demo</p>
          <h3 className="mt-2 text-2xl font-semibold text-[#1A1A1A]">Watch RentCredit in action</h3>
        </div>
        <button
          type="button"
          onClick={() => setShowDemo(false)}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-[#1A1A1A] hover:bg-slate-100 transition-colors"
        >
          Close
        </button>
      </div>
      <div className="mt-6 aspect-video overflow-hidden rounded-[1.5rem] bg-slate-900">
        <iframe
          className="h-full w-full"
          src="https://youtu.be/o0Bpq_v5dM4"
          title="RentCredit Demo"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  </div>
) : null}
      {process.env.NODE_ENV === 'development' ? <ForceRevealButton /> : null}
    </main>
  );
}
