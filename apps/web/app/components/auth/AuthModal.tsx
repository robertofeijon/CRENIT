"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../src/contexts/AuthContext';

function getDashboardRoute(roleValue: string | null | undefined) {
  const role = roleValue?.toString().toUpperCase();
  if (role === 'ADMIN') return '/admin';
  if (role === 'LANDLORD') return '/landlord/overview';
  return '/tenant/home';
}

type AuthMode = 'login' | 'register';

interface AuthModalProps {
  open: boolean;
  mode?: AuthMode;
  onClose: () => void;
}

export default function AuthModal({ open, mode = 'login', onClose }: AuthModalProps) {
  const router = useRouter();
  const { user, role: sessionRole, roleReady, login, register } = useAuth();
  const [activeMode, setActiveMode] = useState<AuthMode>(mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'TENANT' | 'LANDLORD'>('TENANT');
  const [marketDataConsent, setMarketDataConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'error' | 'success' | null>(null);

  useEffect(() => {
    if (!open) return;
    setActiveMode(mode);
  }, [mode, open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (user && roleReady && sessionRole && open) {
      onClose();
      router.replace(getDashboardRoute(sessionRole));
    }
  }, [user, sessionRole, roleReady, open, onClose, router]);

  if (!open) return null;

  const normalizeLoginError = (raw: string) => {
    const lower = raw.toLowerCase();
    if (lower.includes('fetch failed')) {
      return 'Login service is unavailable right now. Please try again shortly.';
    }
    if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
      return 'Invalid email or password. Please check your details and try again.';
    }
    return raw;
  };

  const handleLogin = async () => {
    setMessage(null);
    setMessageType(null);
    if (!email || !password) {
      setMessage('Email and password are required.');
      setMessageType('error');
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
      setMessage('Login successful. Redirecting...');
      setMessageType('success');
    } catch (error: unknown) {
      const err = error as {
        response?: {
          data?: { message?: string | string[]; error?: string };
        };
        message?: string;
      };
      const serverMessage = err?.response?.data?.message;
      const errorText = Array.isArray(serverMessage) ? serverMessage.join(' ') : serverMessage;
      const fallback = errorText || err?.response?.data?.error || err?.message || 'Login failed.';
      setMessage(normalizeLoginError(fallback));
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    setMessage(null);
    setMessageType(null);
    if (!marketDataConsent) {
      setMessage('Please agree to market data terms to continue.');
      setMessageType('error');
      return;
    }
    setSubmitting(true);
    try {
      await register(email, password, fullName, role, marketDataConsent);
      setActiveMode('login');
      setPassword('');
      setMessage('Account created. Please login with your new credentials.');
      setMessageType('success');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      setMessage(err?.response?.data?.message || err?.message || 'Registration failed.');
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
        <div className="grid lg:grid-cols-[1fr_1.05fr]">
          <div className="bg-[#1A1A1A] px-6 py-8 text-white sm:px-8 sm:py-10">
            <p className="text-xs uppercase tracking-[0.35em] text-[#C0392B]/90">CRENIT Access</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight">Secure login for tenants, landlords, and admins.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Your payment records, KYC status, and credit progress remain protected under verified role-based access.
            </p>
            <div className="mt-8 grid gap-3">
              {['Verified payment history', 'Real-time dashboard updates', 'Audit-ready data controls'].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative px-6 py-8 sm:px-8 sm:py-10">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Close
            </button>

            <div className="mb-6 inline-flex rounded-full border border-slate-200 bg-[#F8F8F8] p-1 text-sm font-semibold text-slate-700">
              <button
                type="button"
                onClick={() => setActiveMode('login')}
                className={`rounded-full px-5 py-2 transition ${activeMode === 'login' ? 'bg-white text-[#C0392B] shadow-sm' : 'text-slate-600'}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('register')}
                className={`rounded-full px-5 py-2 transition ${activeMode === 'register' ? 'bg-white text-[#C0392B] shadow-sm' : 'text-slate-600'}`}
              >
                Sign up
              </button>
            </div>

            {activeMode === 'register' ? (
              <>
                <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#C0392B]/60"
                  placeholder="Jane Doe"
                />
                <label className="mb-2 block text-sm font-medium text-slate-700">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'TENANT' | 'LANDLORD')}
                  className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#C0392B]/60"
                >
                  <option value="TENANT">Tenant</option>
                  <option value="LANDLORD">Landlord</option>
                </select>
              </>
            ) : null}

            <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#C0392B]/60"
              placeholder="you@example.com"
              autoComplete="email"
            />

            <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none transition focus:border-[#C0392B]/60"
              placeholder="••••••••"
              autoComplete={activeMode === 'login' ? 'current-password' : 'new-password'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !submitting) {
                  void (activeMode === 'login' ? handleLogin() : handleRegister());
                }
              }}
            />

            {activeMode === 'register' ? (
              <label className="mt-4 flex items-start gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={marketDataConsent}
                  onChange={(e) => setMarketDataConsent(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  I consent to anonymised and aggregated data being used for CRENIT market intelligence products.
                </span>
              </label>
            ) : null}

            <button
              type="button"
              onClick={activeMode === 'login' ? handleLogin : handleRegister}
              disabled={submitting || !email || !password || (activeMode === 'register' && !fullName)}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#C0392B]/25 transition hover:bg-[#992d24] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeMode === 'login' ? (submitting ? 'Logging in...' : 'Login') : submitting ? 'Creating account...' : 'Create account'}
            </button>

            {message ? (
              <p className={`mt-4 text-sm ${messageType === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>{message}</p>
            ) : null}
          </div>
        </div>
      </div>
      <button type="button" aria-label="Close modal backdrop" className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
