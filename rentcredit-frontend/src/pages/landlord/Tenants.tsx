import React, { useEffect, useState } from 'react';
import { fetchAllTenants, fetchTenantProfile, fetchTenantReliability } from '../../api';

const BASE = 'http://localhost:3000';

interface Tenant {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  kycStatus?: string;
  createdAt?: string;
}

interface TenantDetail extends Tenant {
  profile?: any;
  reliability?: any;
}

function TenantProfileModal({
  tenant,
  onClose,
}: {
  tenant: Tenant | null;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<any>(null);
  const [reliability, setReliability] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenant) return;
    const load = async () => {
      try {
        const [prof, rel] = await Promise.all([
          fetchTenantProfile(tenant.id).catch(() => null),
          fetchTenantReliability(tenant.id).catch(() => null),
        ]);
        setProfile(prof);
        setReliability(rel);
      } catch (e: any) {
        setError(e.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [tenant]);

  if (!tenant) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 900,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 901,
          width: 460,
          maxWidth: 'calc(100vw - 40px)',
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--r-xl)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            background: 'var(--surface)',
            zIndex: 1,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>
            Tenant Profile
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border)',
              color: 'var(--ink-3)',
              borderRadius: 'var(--r-sm)',
              width: 32,
              height: 32,
              cursor: 'pointer',
              fontSize: 16,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '20px 24px 24px' }}>
          {loading && (
            <div style={{ color: 'var(--ink-3)', textAlign: 'center', padding: '40px 0' }}>
              Loading…
            </div>
          )}
          {error && <div style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</div>}
          {!loading && (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>
                  Name
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{tenant.fullName}</div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>
                  Email
                </div>
                <div style={{ fontSize: 14 }}>{tenant.email}</div>
              </div>

              {tenant.phoneNumber && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>
                    Phone
                  </div>
                  <div style={{ fontSize: 14 }}>{tenant.phoneNumber}</div>
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>
                  KYC Status
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: 'var(--r-sm)',
                    fontSize: 12,
                    fontWeight: 500,
                    background:
                      tenant.kycStatus === 'verified'
                        ? 'rgba(34,214,138,0.12)'
                        : 'rgba(245,166,35,0.12)',
                    color:
                      tenant.kycStatus === 'verified'
                        ? 'var(--success)'
                        : 'var(--warning)',
                  }}
                >
                  {tenant.kycStatus || 'pending'}
                </div>
              </div>

              {reliability && (
                <div
                  style={{
                    padding: '16px 18px',
                    background: 'var(--violet-dim)',
                    border: '1px solid rgba(108,87,240,0.2)',
                    borderRadius: 'var(--r-md)',
                  }}
                >
                  <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>
                    Reliability Score
                  </div>
                  <div
                    style={{
                      fontSize: '2rem',
                      fontWeight: 700,
                      color: 'var(--violet-light)',
                    }}
                  >
                    {reliability.score?.toFixed(2) || '—'}/100
                  </div>
                  {reliability.onTimePayments !== undefined && (
                    <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 8 }}>
                      On-time payments: {reliability.onTimePayments || 0}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function LandlordTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAllTenants();
        setTenants(Array.isArray(data) ? data : []);
      } catch (e: any) {
        console.error('Failed to fetch tenants:', e);
        setTenants([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filteredTenants = tenants.filter(
    (t) =>
      (t?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t?.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="page">
        <div className="pg-header">
          <div>
            <div className="pg-eyebrow">Landlord · Tenants</div>
            <div className="pg-title">Tenant Directory</div>
          </div>
        </div>
        <div style={{ color: 'var(--ink-3)', textAlign: 'center', padding: '60px 20px' }}>
          Loading tenants…
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Landlord · Tenants</div>
          <div className="pg-title">Tenant Directory</div>
          <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 4 }}>
            {filteredTenants.length} tenant{filteredTenants.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 24 }}>
        <input
          type="text"
          className="input"
          placeholder="Search by name or email…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {/* Tenants List */}
      {filteredTenants.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
          <p>
            {searchQuery ? 'No tenants found.' : 'No tenants yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredTenants.map((tenant) => (
            <div
              key={tenant.id}
              className="card"
              style={{
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => setSelectedTenant(tenant)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{tenant.fullName}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
                  {tenant.email}
                </div>
                {tenant.phoneNumber && (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                    {tenant.phoneNumber}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {tenant.kycStatus === 'verified' && (
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--r-sm)',
                      background: 'rgba(34,214,138,0.12)',
                      color: 'var(--success)',
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    ✓ Verified
                  </span>
                )}
                <div style={{ color: 'var(--ink-3)' }}>→</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile Modal */}
      <TenantProfileModal tenant={selectedTenant} onClose={() => setSelectedTenant(null)} />
    </div>
  );
}
