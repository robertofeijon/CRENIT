import React, { useEffect, useState } from 'react';
import { fetchTenantProperty, fetchProfile } from '../../api';

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
}

export default function TenantDeposit() {
  const [property, setProperty] = useState<Property | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchTenantProperty().catch(() => null),
      fetchProfile().catch(() => null),
    ])
      .then(([prop, prof]) => {
        setProperty(prop);
        setProfile(prof?.user || prof);
      })
      .finally(() => setLoading(false));
  }, []);

  // Mock deposit data
  const deposit = property
    ? {
        amount: 1500,
        status: 'held',
        daysRemaining: 245,
        moveOutDate: new Date(Date.now() + 245 * 24 * 60 * 60 * 1000),
      }
    : null;

  if (loading) {
    return (
      <div className="page">
        <div className="pg-header">
          <div>
            <div className="pg-eyebrow">Tenant · Deposit</div>
            <div className="pg-title">Deposit Tracking</div>
          </div>
        </div>
        <div style={{ color: 'var(--ink-3)', textAlign: 'center', padding: '60px 20px' }}>
          Loading deposit information…
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Tenant · Deposit</div>
          <div className="pg-title">Deposit Tracking</div>
        </div>
      </div>

      {!property ? (
        <div className="empty-state">
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <p>No property assigned yet.</p>
        </div>
      ) : (
        <>
          {/* Deposit Status Card */}
          <div
            className="card"
            style={{
              padding: '24px',
              background: 'linear-gradient(135deg, rgba(108,87,240,0.15), rgba(108,87,240,0.05))',
              border: '1px solid rgba(108,87,240,0.2)',
              borderRadius: 'var(--r-xl)',
              marginBottom: 32,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 8 }}>
                  Security Deposit Amount
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--violet-light)', marginBottom: 16 }}>
                  ${deposit?.amount.toLocaleString()}
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    background: 'rgba(34,214,138,0.12)',
                    color: 'var(--success)',
                    borderRadius: 'var(--r-sm)',
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  ✓ Held with landlord
                </div>
              </div>
            </div>
          </div>

          {/* Deposit Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
            {[
              { label: 'Days Remaining', value: `${deposit?.daysRemaining} days` },
              {
                label: 'Move-Out Date',
                value: deposit?.moveOutDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }),
              },
              { label: 'Status', value: 'Held Safely' },
              { label: 'Return Method', value: 'Bank Transfer' },
            ].map((item) => (
              <div key={item.label} className="card" style={{ padding: '16px 18px' }}>
                <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 8 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Property Information */}
          <div className="card" style={{ padding: '24px', marginBottom: 32 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Property Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>Property</div>
                <div style={{ fontWeight: 500 }}>{property.name}</div>
              </div>
              <div>
                <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>Address</div>
                <div style={{ fontWeight: 500 }}>
                  {property.address}, {property.city}, {property.state}
                </div>
              </div>
            </div>
          </div>

          {/* Deposit Timeline */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontWeight: 600, marginBottom: 20 }}>📅 Deposit Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { date: 'Today', event: 'Deposit received and held', status: 'complete' },
                { date: 'During Lease', event: 'Held securely for lease duration', status: 'in-progress' },
                { date: `${deposit?.moveOutDate.toLocaleDateString()}`, event: 'Move-out inspection', status: 'upcoming' },
                { date: '10 days after move-out', event: 'Deposit refund processed', status: 'upcoming' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background:
                          item.status === 'complete'
                            ? 'var(--success)'
                            : item.status === 'in-progress'
                              ? 'var(--violet-light)'
                              : 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 12,
                        color: item.status !== 'upcoming' ? '#fff' : 'var(--ink-3)',
                      }}
                    >
                      {item.status === 'complete' ? '✓' : '○'}
                    </div>
                    {i < 3 && (
                      <div
                        style={{
                          width: 2,
                          height: 40,
                          background: item.status !== 'upcoming' ? 'var(--border-strong)' : 'var(--border)',
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{item.date}</div>
                    <div style={{ color: 'var(--ink-2)', fontSize: 13 }}>{item.event}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
