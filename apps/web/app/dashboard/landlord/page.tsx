"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function LandlordDashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  const role = user ? (user.user_metadata as any)?.role?.toString().toUpperCase() : null;
  const isLandlord = role === 'LANDLORD';

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
      return;
    }

    if (!loading && user && isLandlord) {
      loadOverview();
    }
  }, [loading, user, isLandlord, router]);

  const loadOverview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.get('/landlords/overview');
      setDashboard(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load landlord overview.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth');
  };

  const handleInviteSubmit = async () => {
    if (!inviteEmail || !inviteFullName) {
      setInviteMessage('Email and full name are required to invite a tenant.');
      return;
    }

    setInviteLoading(true);
    setInviteMessage(null);

    try {
      const res = await api.post('/landlords/invite', {
        email: inviteEmail,
        full_name: inviteFullName,
      });
      const { tenant, temporaryPassword } = res.data.data;
      setInviteMessage(`Tenant ${tenant.email} invited successfully. Temporary password: ${temporaryPassword}`);
      setInviteEmail('');
      setInviteFullName('');
    } catch (err: any) {
      setInviteMessage(err?.response?.data?.message || err?.message || 'Unable to send invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-8">Loading authentication...</div>;
  }

  if (!user) {
    return null;
  }

  if (!isLandlord) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">Unauthorized</h2>
          <p className="mb-6 text-sm text-slate-600">
            Your account is registered as a tenant, so you cannot access the landlord dashboard.
          </p>
          <button
            onClick={() => router.push('/tenant')}
            className="rounded bg-brand-red px-5 py-3 text-white"
          >
            Go to Tenant Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl p-8">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Landlord dashboard</p>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Welcome back, {user.email ?? 'Landlord'}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Review portfolio performance, active tenants, deposits and the most recent backend-backed income data.
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Overview</h2>
                <p className="mt-2 text-sm text-slate-500">Key portfolio metrics powered by your tenant and payment data.</p>
              </div>
              <button
                onClick={loadOverview}
                disabled={isLoading}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Refresh
              </button>
            </div>

            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {['totalProperties', 'activeTenants', 'monthlyRentExpected', 'collectedThisMonth', 'outstanding', 'commissionEarnedThisMonth'].map((key) => {
                  const labels: Record<string, string> = {
                    totalProperties: 'Properties',
                    activeTenants: 'Active tenants',
                    monthlyRentExpected: 'Monthly rent expected',
                    collectedThisMonth: 'Collected this month',
                    outstanding: 'Outstanding balance',
                    commissionEarnedThisMonth: 'Commission earned',
                  };
                  const value = dashboard?.stats ? dashboard.stats[key] : null;
                  return (
                    <div key={key} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{labels[key]}</p>
                      <p className="mt-3 text-2xl font-semibold text-slate-900">
                        {value == null ? '—' : key.includes('Rent') || key.includes('Collected') || key.includes('Commission') || key === 'outstanding'
                          ? `N$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                          : value}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Partner status</h2>
                <p className="mt-3 text-sm text-slate-500">Your landlord partner profile and reconciled summary.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                onClick={() => router.push('/landlord/tenants')}
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Go to tenant review
              </button>
              <button
                onClick={() => router.push('/landlord/payments')}
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                View payments
              </button>
              <button
                onClick={() => router.push('/landlord/deposits')}
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Manage deposits
              </button>
            </div>
          </div>
          <div className="mt-6 rounded-3xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">Business name</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{dashboard?.landlord?.businessName ?? '—'}</p>
            <p className="mt-4 text-sm text-slate-500">Partner status</p>
            <p className="mt-2 inline-flex rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
              {dashboard?.landlord?.partnerStatus ?? 'UNKNOWN'}
            </p>
          </div>

            <div className="mt-6 rounded-3xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Total deposits</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{dashboard?.depositSummary?.totalDeposits ?? '0'}</p>
              <p className="mt-3 text-sm text-slate-500">Held / Disputed / Refunded</p>
              <p className="mt-2 text-sm text-slate-700">
                {dashboard?.depositSummary?.held ?? 0} held · {dashboard?.depositSummary?.disputed ?? 0} disputed · {dashboard?.depositSummary?.refunded ?? 0} refunded
              </p>
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] mt-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Active tenants</h2>
                <p className="mt-2 text-sm text-slate-500">Recent lease activity and tenant KYC status.</p>
              </div>
            </div>
            {dashboard?.tenants?.length ? (
              <div className="space-y-4">
                {dashboard.tenants.slice(0, 5).map((tenant: any) => (
                  <div key={tenant.leaseId} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-500">{tenant.tenantName}</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">Rent N${Number(tenant.monthlyRent || 0).toLocaleString()}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                        {tenant.status}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <p className="text-sm text-slate-600">Lease start: {tenant.startDate || '—'}</p>
                      <p className="text-sm text-slate-600">KYC: {tenant.kycStatus}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No active tenants available yet.</p>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Invite a tenant</h2>
            <p className="mt-2 text-sm text-slate-500">Create a tenant account and provide their temporary login details.</p>
            <div className="mt-6 space-y-4 rounded-3xl bg-slate-50 p-5">
              <div>
                <label className="block text-sm font-medium text-slate-700">Tenant email</label>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="tenant@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Full name</label>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
                  type="text"
                  value={inviteFullName}
                  onChange={(event) => setInviteFullName(event.target.value)}
                  placeholder="Tenant full name"
                />
              </div>
              {inviteMessage ? <p className="text-sm text-slate-700">{inviteMessage}</p> : null}
              <button
                onClick={handleInviteSubmit}
                disabled={inviteLoading}
                className="rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {inviteLoading ? 'Sending invite...' : 'Invite tenant'}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Recent payments</h2>
            <p className="mt-2 text-sm text-slate-500">The latest landlord transactions recorded by your portfolio.</p>
            <div className="mt-5 space-y-3">
              {dashboard?.recentPayments?.length ? (
                dashboard.recentPayments.slice(0, 5).map((payment: any) => (
                  <div key={payment.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-500">{payment.payment_method || 'SIMULATED'}</p>
                        <p className="mt-1 font-semibold text-slate-900">N${Number(payment.amount_gross || 0).toLocaleString()}</p>
                      </div>
                      <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                        {payment.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">Paid on: {payment.paid_date ? new Date(payment.paid_date).toLocaleDateString() : 'Pending'}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No payment records found yet.</p>
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Portfolio details</h2>
              <p className="mt-2 text-sm text-slate-500">Properties and unit occupancy reported from the backend.</p>
            </div>
          </div>

          {dashboard?.properties?.length ? (
            <div className="space-y-4">
              {dashboard.properties.map((property: any) => (
                <div key={property.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{property.property_name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{property.address_city}, {property.address_suburb}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                      {property.units?.length ?? 0} units
                    </span>
                  </div>
                  {property.units?.length ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {property.units.slice(0, 4).map((unit: any) => (
                        <div key={unit.id} className="rounded-2xl bg-white p-3">
                          <p className="text-sm font-medium text-slate-900">{unit.unit_identifier || 'Unit'}</p>
                          <p className="mt-1 text-sm text-slate-600">Rent: N${Number(unit.monthly_rent || 0).toLocaleString()}</p>
                          <p className="mt-1 text-sm text-slate-500">{unit.is_occupied ? 'Occupied' : 'Available'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">No units found for this property.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No property portfolio data available.</p>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Account settings</h2>
          <p className="mt-2 text-sm text-slate-500">Manage your landlord account and authentication status.</p>
          <div className="mt-6 space-y-3 rounded-3xl bg-slate-50 p-5">
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="mt-1 text-slate-900">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Role</p>
              <p className="mt-1 text-slate-900">Landlord</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
