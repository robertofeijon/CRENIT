"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@rentcredit.demo', password: 'DemoAdmin123!', role: 'ADMIN' as const },
  { label: 'Landlord', email: 'landlord@rentcredit.demo', password: 'DemoLandlord123!', role: 'LANDLORD' as const },
  { label: 'Tenant', email: 'tenant@rentcredit.demo', password: 'DemoTenant123!', role: 'TENANT' as const },
];

function getDashboardRoute(roleValue: string | null | undefined) {
  const role = roleValue?.toString().toUpperCase();
  if (role === 'ADMIN') return '/admin';
  if (role === 'LANDLORD') return '/landlord';
  return '/tenant';
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'TENANT' | 'LANDLORD'>('TENANT');
  const [marketDataConsent, setMarketDataConsent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user, role: sessionRole, login, register, logout } = useAuth();

  useEffect(() => {
    if (user && sessionRole) {
      router.replace(getDashboardRoute(sessionRole));
    }
  }, [user, sessionRole, router]);

  const handleRegister = async () => {
    setMessage(null);
    setSubmitting(true);
    try {
      if (!marketDataConsent) {
        setMessage('Please agree to anonymised market intelligence data use to register.');
        setSubmitting(false);
        return;
      }
      await register(email, password, fullName, role, marketDataConsent);
      setMessage('Registration successful. Please login.');
      setMode('login');
      setPassword('');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      setMessage(err?.response?.data?.message || err?.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setMessage(null);
    if (!email || !password) {
      setMessage('Email and password are required.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
      setMessage(null);
    } catch (error: unknown) {
      const err = error as {
        response?: {
          data?: { message?: string | string[]; error?: string };
        };
        message?: string;
      };
      const serverMessage = err?.response?.data?.message;
      const errorText = Array.isArray(serverMessage) ? serverMessage.join(' ') : serverMessage;
      setMessage(errorText || err?.response?.data?.error || err?.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setMessage(`Demo ${account.label} credentials filled. Click Login.`);
  };

  const handleLogout = async () => {
    await logout();
    setMessage('Logged out.');
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          <p className="font-semibold">Admin dashboard login</p>
          <p className="mt-2">
            Run <code className="rounded bg-white px-1">npm run seed:demo</code> once, restart the API, then log in as Admin below.
            You will land on <strong>/admin</strong>.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-4 text-sm font-semibold text-slate-700">
            <button type="button" className={mode === 'login' ? 'text-brand-red' : ''} onClick={() => setMode('login')}>
              Login
            </button>
            <button type="button" className={mode === 'register' ? 'text-brand-red' : ''} onClick={() => setMode('register')}>
              Register
            </button>
          </div>

          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Quick demo login</p>
          <div className="mb-6 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemo(account)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                {account.label}
              </button>
            ))}
          </div>

          {mode === 'register' && (
            <>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded border px-3 py-2"
                  placeholder="Jane Doe"
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'TENANT' | 'LANDLORD')}
                  className="w-full rounded border px-3 py-2"
                >
                  <option value="TENANT">Tenant</option>
                  <option value="LANDLORD">Landlord</option>
                </select>
              </div>
            </>
          )}

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="you@example.com"
            />
          </div>

          {mode === 'register' ? (
            <label className="mb-6 flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={marketDataConsent}
                onChange={(e) => setMarketDataConsent(e.target.checked)}
                className="mt-1"
              />
              <span>
                I agree that anonymised, aggregated property and payment data may be used for Namibian rental market
                intelligence (platform terms). No individual data is sold.
              </span>
            </label>
          ) : null}

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="••••••••"
            />
          </div>

          <div className="flex gap-3">
            {mode === 'login' ? (
              <button
                type="button"
                onClick={handleLogin}
                disabled={submitting}
                className="rounded bg-brand-red px-5 py-3 text-white disabled:opacity-60"
              >
                {submitting ? 'Logging in…' : 'Login'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRegister}
                disabled={submitting}
                className="rounded bg-brand-red px-5 py-3 text-white disabled:opacity-60"
              >
                {submitting ? 'Registering…' : 'Register'}
              </button>
            )}
            {user ? (
              <button type="button" onClick={handleLogout} className="rounded border px-5 py-3 text-slate-700">
                Logout
              </button>
            ) : null}
          </div>

          {message ? <p className="mt-4 text-sm text-slate-700">{message}</p> : null}
        </div>
      </div>
    </main>
  );
}
