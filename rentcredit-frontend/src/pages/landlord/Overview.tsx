import React, { useEffect, useState } from 'react';
import { fetchProfile, fetchLandlordProperties } from '../../api';

const BASE = 'http://localhost:3000';

// Get token from localStorage (matches AuthContext storage key)
function getStoredToken(): string | null {
  return localStorage.getItem('auth_token');
}

async function authorizedFetch(input: RequestInfo, init: RequestInit = {}) {
  const authToken = getStoredToken();
  const headers: Record<string, string> = init.headers
    ? { ...(init.headers as Record<string, string>) }
    : {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return fetch(input, { ...init, headers });
}

async function fetchAllPayments() {
  const res = await authorizedFetch(`${BASE}/payments/property/all`).catch(() => null);
  if (!res || !res.ok) return [];
  return res.json().catch(() => []);
}

async function fetchPropertyPayments(propertyId: string) {
  const res = await authorizedFetch(`${BASE}/payments/property/${propertyId}`);
  if (!res.ok) return [];
  return res.json().catch(() => []);
}

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  monthlyRent: number;
  isActive: boolean;
  images?: string[];
}

interface Payment {
  id: string;
  amount: string | number;
  status: 'completed' | 'pending' | 'overdue' | string;
  createdAt: string;
  propertyId?: string;
  tenantId?: string;
  property?: { name: string };
  tenant?: { fullName: string };
}

function StatCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  icon: string;
}) {
  return (
    <div className={accent ? 'card-accent' : 'card'} style={{ flex: 1, minWidth: 180 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 14,
        }}
      >
        <div className="card-label">{label}</div>
        <span style={{ fontSize: 18, opacity: 0.6 }}>{icon}</span>
      </div>
      <div className="card-value stat-num">{value}</div>
      {sub && <div className="card-sub">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'badge badge-success',
    pending: 'badge badge-warning',
    overdue: 'badge badge-danger',
  };
  return <span className={map[status] || 'badge badge-violet'}>{status}</span>;
}

export default function LandlordOverview() {
  const [profile, setProfile] = useState<any>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [prof, props] = await Promise.all([
          fetchProfile().then((p) => p.user || p).catch(() => null),
          fetchLandlordProperties().catch(() => []),
        ]);
        setProfile(prof);
        const propList: Property[] = Array.isArray(props) ? props : [];
        setProperties(propList);

        // Fetch payments for each property (up to 3 to keep it fast)
        const paymentResults = await Promise.all(
          propList.slice(0, 3).map((p) => fetchPropertyPayments(p.id)),
        );
        const all: Payment[] = paymentResults.flat();
        // Sort by date desc, take 8 most recent
        all.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setPayments(all.slice(0, 8));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  // ── Derived stats ──
  const totalProperties = properties.length;
  const monthlyRevenue = properties.reduce((s, p) => s + Number(p.monthlyRent || 0), 0);
  const completedCount = payments.filter((p) => p.status === 'completed').length;
  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const overdueCount = payments.filter((p) => p.status === 'overdue').length;

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div className="page">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 300,
            color: 'var(--ink-3)',
            fontSize: 14,
            fontFamily: 'var(--font-mono)',
          }}
        >
          Loading portfolio…
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Landlord · Overview</div>
          <div className="pg-title">Portfolio Overview</div>
          {profile?.fullName && (
            <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 4 }}>
              Welcome back, {profile.fullName}
            </div>
          )}
        </div>
        <div className="pg-actions">
          <button className="btn btn-outline btn-sm" onClick={() => window.location.href = '/landlord/properties'}>+ Add Property</button>
          <button className="btn btn-primary btn-sm" onClick={() => window.location.href = '/landlord/tenants'}>Invite Tenant</button>
        </div>
      </div>

      {/* ── Hero Banner ── */}
      <div className="rent-block">
        <div className="rb-left">
          <div className="rb-eyebrow">Total Monthly Revenue</div>
          <div className="rb-amount">{fmt(monthlyRevenue)}</div>
          <div className="rb-detail">
            Across <strong>{totalProperties} properties</strong> ·{' '}
            <strong>{pendingCount} payment{pendingCount !== 1 ? 's' : ''} pending</strong>
            {overdueCount > 0 && (
              <span style={{ color: 'var(--danger)', marginLeft: 8 }}>
                · {overdueCount} overdue
              </span>
            )}
          </div>
        </div>
        <div className="rb-right">
          <button className="btn-white">View Payments</button>
          <button className="btn-white-ghost">Export Report</button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        <StatCard
          label="Properties"
          value={totalProperties}
          sub="Active listings"
          icon="🏠"
        />
        <StatCard
          label="Monthly Revenue"
          value={fmt(monthlyRevenue)}
          sub="Combined rent"
          icon="💰"
          accent
        />
        <StatCard
          label="Payments Received"
          value={completedCount}
          sub="This period"
          icon="✅"
        />
        <StatCard
          label="Pending / Overdue"
          value={`${pendingCount} / ${overdueCount}`}
          sub="Needs attention"
          icon="⚠️"
        />
      </div>

      {/* ── Two-column lower section ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Properties */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '18px 22px 14px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 15,
                color: 'var(--ink)',
              }}
            >
              Your Properties
            </div>
            <span
              style={{
                fontSize: 12,
                color: 'var(--violet-light)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              View all →
            </span>
          </div>

          {properties.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: 'var(--ink-3)',
                fontSize: 14,
              }}
            >
              No properties yet.
              <br />
              <span style={{ color: 'var(--violet-light)', cursor: 'pointer' }}>
                + Add your first property
              </span>
            </div>
          ) : (
            <div>
              {properties.slice(0, 5).map((prop, i) => (
                <div
                  key={prop.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 22px',
                    borderBottom:
                      i < Math.min(properties.length, 5) - 1
                        ? '1px solid var(--border)'
                        : 'none',
                    transition: 'background 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background =
                      'var(--surface-2)')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background = 'transparent')
                  }
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--r-sm)',
                      background: 'var(--violet-dim)',
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {prop.images?.[0] ? (
                      <img
                        src={`http://localhost:3000${prop.images[0]}`}
                        alt={prop.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: 20 }}>🏠</span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: 'var(--ink)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {prop.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--ink-3)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {prop.city}, {prop.state}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: 14,
                        color: 'var(--violet-light)',
                      }}
                    >
                      {fmt(Number(prop.monthlyRent))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>/mo</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '18px 22px 14px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 15,
                color: 'var(--ink)',
              }}
            >
              Recent Payments
            </div>
            <span
              style={{
                fontSize: 12,
                color: 'var(--violet-light)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              View all →
            </span>
          </div>

          {payments.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                color: 'var(--ink-3)',
                fontSize: 14,
              }}
            >
              No payment history yet.
            </div>
          ) : (
            <div>
              {payments.map((pmt, i) => (
                <div
                  key={pmt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '13px 22px',
                    borderBottom:
                      i < payments.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background =
                      'var(--surface-2)')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background = 'transparent')
                  }
                >
                  {/* Status dot */}
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background:
                        pmt.status === 'completed'
                          ? 'var(--success)'
                          : pmt.status === 'overdue'
                          ? 'var(--danger)'
                          : 'var(--warning)',
                      boxShadow:
                        pmt.status === 'completed'
                          ? '0 0 6px var(--success)'
                          : pmt.status === 'overdue'
                          ? '0 0 6px var(--danger)'
                          : '0 0 6px var(--warning)',
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: 13,
                        color: 'var(--ink)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {pmt.property?.name || pmt.propertyId?.slice(0, 8) || 'Payment'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                      {fmtDate(pmt.createdAt)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StatusBadge status={pmt.status} />
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        fontSize: 13,
                        color: 'var(--ink)',
                        minWidth: 70,
                        textAlign: 'right',
                      }}
                    >
                      {fmt(Number(pmt.amount))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}