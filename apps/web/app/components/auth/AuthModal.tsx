"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  const { user, role: sessionRole, roleReady, twoFactorRequired, login, register } = useAuth();
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
    if (user && roleReady && sessionRole && open && !twoFactorRequired) {
      onClose();
      router.replace(getDashboardRoute(sessionRole));
    }
  }, [user, sessionRole, roleReady, twoFactorRequired, open, onClose, router]);

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
      const result = await login(email, password);
      if (result?.requires_two_factor) {
        onClose();
        router.replace('/auth/verify-2fa');
        return;
      }
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-md">
      <div className="shimmer-border w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/20 bg-[var(--rc-card)] shadow-[0_30px_100px_rgba(0,0,0,0.4)] dark:border-[var(--rc-border)]">
        <div className="grid lg:grid-cols-[1fr_1.05fr]">
          <div className="auth-panel-side hidden lg:block">
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#C0392B]/25 blur-3xl"
              aria-hidden
            />
            <p className="text-xs uppercase tracking-[0.35em] text-[#f4a9a3]">CRENIT Access</p>
            <h2 className="auth-panel-side__title">Secure access for tenants, landlords, and admins.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Your payment records, KYC status, and credit progress remain protected under verified role-based access.
            </p>
            <div className="mt-8 space-y-3">
              {['Verified payment history', 'Real-time dashboard updates', 'Audit-ready data controls'].map((item) => (
                <div key={item} className="marketing-check-row !bg-white/5 !text-slate-200">
                  <span className="marketing-check-row__icon !bg-[#C0392B]/25 !text-white" aria-hidden>
                    ✓
                  </span>
                  <p className="text-sm leading-6">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative px-6 py-8 sm:px-8 sm:py-10">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full border px-3 py-1 text-xs font-semibold transition hover:bg-[var(--rc-hover)]"
              style={{ borderColor: 'var(--rc-border)', color: 'var(--rc-text-secondary)' }}
            >
              Close
            </button>

            <div className="auth-tab-pill mb-6">
              <button
                type="button"
                onClick={() => setActiveMode('login')}
                className={`px-5 py-2 transition ${activeMode === 'login' ? 'auth-tab-pill__btn--active' : ''}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('register')}
                className={`px-5 py-2 transition ${activeMode === 'register' ? 'auth-tab-pill__btn--active' : ''}`}
              >
                Sign up
              </button>
            </div>

            {activeMode === 'register' ? (
              <>
                <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--rc-text)' }}>
                  Full name
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="auth-input"
                  placeholder="Jane Doe"
                />
                <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--rc-text)' }}>
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'TENANT' | 'LANDLORD')}
                  className="auth-input"
                >
                  <option value="TENANT">Tenant</option>
                  <option value="LANDLORD">Landlord</option>
                </select>
              </>
            ) : null}

            <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--rc-text)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="you@example.com"
              autoComplete="email"
            />

            <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--rc-text)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input !mb-0"
              placeholder="••••••••"
              autoComplete={activeMode === 'login' ? 'current-password' : 'new-password'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !submitting) {
                  void (activeMode === 'login' ? handleLogin() : handleRegister());
                }
              }}
            />

            {activeMode === 'login' ? (
              <Link href="/auth/forgot-password" className="mt-2 inline-block text-sm font-semibold text-[#C0392B] hover:underline">
                Forgot password?
              </Link>
            ) : null}

            {activeMode === 'register' ? (
              <label className="mt-4 flex items-start gap-3 text-sm" style={{ color: 'var(--rc-text-secondary)' }}>
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
