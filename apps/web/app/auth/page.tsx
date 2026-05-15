"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'TENANT' | 'LANDLORD'>('TENANT');
  const [message, setMessage] = useState<string | null>(null);
  const { user, login, register, logout } = useAuth();

  const getDashboardRoute = (roleValue: string | undefined) => {
    if (roleValue?.toString().toUpperCase() === 'LANDLORD') {
      return '/landlord';
    }
    return '/tenant';
  };

  useEffect(() => {
    if (user) {
      const roleValue = (user.user_metadata as any)?.role;
      router.replace(getDashboardRoute(roleValue));
    }
  }, [user, router]);

  const handleRegister = async () => {
    setMessage(null);
    try {
      await register(email, password, fullName, role);
      setMessage('Registration successful. Please login.');
      setMode('login');
      setPassword('');
    } catch (error: any) {
      setMessage(error?.response?.data?.message || error?.message || 'Registration failed.');
    }
  };

  const handleLogin = async () => {
    setMessage(null);
    try {
      const res = await login(email, password);
      if (!res || res.error) {
        throw res?.error || new Error('Login failed.');
      }
      const roleValue = (res?.user?.user_metadata as any)?.role;
      router.replace(getDashboardRoute(roleValue));
    } catch (error: any) {
      setMessage(error?.message || 'Login failed.');
    }
  };

  const handleLogout = async () => {
    await logout();
    setMessage('Logged out.');
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-4 text-sm font-semibold text-slate-700">
          <button className={mode === 'login' ? 'text-brand-red' : ''} onClick={() => setMode('login')}>
            Login
          </button>
          <button className={mode === 'register' ? 'text-brand-red' : ''} onClick={() => setMode('register')}>
            Register
          </button>
        </div>

        {mode === 'register' && (
          <>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="Jane Doe" />
            </div>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as 'TENANT' | 'LANDLORD')} className="w-full rounded border px-3 py-2">
                <option value="TENANT">Tenant</option>
                <option value="LANDLORD">Landlord</option>
              </select>
            </div>
          </>
        )}

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="you@example.com" />
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="••••••••" />
        </div>

        <div className="flex gap-3">
          {mode === 'login' ? (
            <button onClick={handleLogin} className="rounded bg-brand-red px-5 py-3 text-white">Login</button>
          ) : (
            <button onClick={handleRegister} className="rounded bg-brand-red px-5 py-3 text-white">Register</button>
          )}
          {user && (
            <button onClick={handleLogout} className="rounded border px-5 py-3 text-slate-700">Logout</button>
          )}
        </div>

        {message && <p className="mt-4 text-sm text-slate-700">{message}</p>}
        {user && (
          <div className="mt-6 rounded border bg-slate-50 p-4">
            <p className="font-semibold">Logged in as:</p>
            <pre className="text-sm">{JSON.stringify(user, null, 2)}</pre>
          </div>
        )}
      </div>
    </main>
  );
}
