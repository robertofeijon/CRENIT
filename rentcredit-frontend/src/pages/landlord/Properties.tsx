import React, { useEffect, useState, useRef } from 'react';
import { fetchLandlordProperties, uploadPropertyImage } from '../../api';

const BASE = 'http://localhost:3000';

// ── Get token from localStorage (matches AuthContext storage) ──
function getToken(): string | null {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    console.warn('No auth token found in localStorage');
  }
  return token;
}

async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn('authFetch called without token');
  }
  return fetch(input, { ...init, headers });
}

async function apiCreateProperty(data: PropertyFormData) {
  const res = await authFetch(`${BASE}/properties`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Failed to create property');
  }
  return res.json();
}

async function apiUpdateProperty(id: string, data: Partial<PropertyFormData>) {
  const res = await authFetch(`${BASE}/properties/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Failed to update property');
  }
  return res.json();
}

async function apiDeleteProperty(id: string) {
  const res = await authFetch(`${BASE}/properties/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete property');
  return res.json();
}

async function apiPropertyStats(id: string) {
  const res = await authFetch(`${BASE}/properties/${id}/stats`);
  if (!res.ok) throw new Error('Failed to load stats');
  return res.json();
}

// ── Types ──
interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  monthlyRent: number;
  unitCount?: number;
  images: string[];
  isActive?: boolean;
}

interface PropertyFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  monthlyRent: number | string;
  unitCount: number | string;
}

const EMPTY_FORM: PropertyFormData = {
  name: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  monthlyRent: '',
  unitCount: '',
};

// ── Sub-components ──

function Overlay({ onClose }: { onClose: () => void }) {
  return (
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
  );
}

function Modal({
  title,
  onClose,
  children,
  width = 520,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <>
      <Overlay onClose={onClose} />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 901,
          width,
          maxWidth: 'calc(100vw - 40px)',
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--r-xl)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Modal header */}
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
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 17,
              color: 'var(--ink)',
            }}
          >
            {title}
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
        <div style={{ padding: '20px 24px 24px' }}>{children}</div>
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="input-label">{label}</label>
      {children}
    </div>
  );
}

function PropertyForm({
  initial,
  onSubmit,
  submitLabel,
  loading,
}: {
  initial: PropertyFormData;
  onSubmit: (d: PropertyFormData) => void;
  submitLabel: string;
  loading: boolean;
}) {
  const [form, setForm] = useState<PropertyFormData>(initial);
  const set = (k: keyof PropertyFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Property Name">
            <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Sunset Apartments" />
          </Field>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Address">
            <input className="input" value={form.address} onChange={set('address')} placeholder="123 Main St" />
          </Field>
        </div>
        <Field label="City">
          <input className="input" value={form.city} onChange={set('city')} placeholder="New York" />
        </Field>
        <Field label="State">
          <input className="input" value={form.state} onChange={set('state')} placeholder="NY" />
        </Field>
        <Field label="ZIP Code">
          <input className="input" value={form.zipCode} onChange={set('zipCode')} placeholder="10001" />
        </Field>
        <Field label="Monthly Rent ($)">
          <input className="input" type="number" value={form.monthlyRent} onChange={set('monthlyRent')} placeholder="2500" />
        </Field>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Number of Units">
            <input className="input" type="number" value={form.unitCount} onChange={set('unitCount')} placeholder="1" />
          </Field>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button
          className="btn btn-primary"
          disabled={loading || !form.name || !form.address}
          onClick={() => onSubmit(form)}
        >
          {loading ? 'Saving…' : submitLabel}
        </button>
      </div>
    </div>
  );
}

function StatsModal({ propertyId, propertyName, onClose }: { propertyId: string; propertyName: string; onClose: () => void }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiPropertyStats(propertyId)
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [propertyId]);

  const fmt = (n: number) =>
    n?.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <Modal title={`Stats · ${propertyName}`} onClose={onClose} width={460}>
      {loading && <div style={{ color: 'var(--ink-3)', textAlign: 'center', padding: 40 }}>Loading…</div>}
      {error && <div style={{ color: 'var(--danger)', padding: 20 }}>{error}</div>}
      {stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Address */}
          <div style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 4 }}>
            {stats.property?.address}
          </div>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Total Payments', value: stats.stats?.totalPayments ?? '—' },
              { label: 'Completed', value: stats.stats?.completedPayments ?? '—' },
              { label: 'Pending', value: stats.stats?.pendingPayments ?? '—' },
              { label: 'Total Collected', value: fmt(stats.stats?.totalCollected) },
            ].map((item) => (
              <div
                key={item.label}
                className="card"
                style={{ padding: '16px 18px' }}
              >
                <div className="card-label">{item.label}</div>
                <div className="card-value" style={{ fontSize: '1.5rem' }}>{item.value}</div>
              </div>
            ))}
          </div>
          <div
            className="card"
            style={{
              padding: '16px 18px',
              background: 'var(--violet-dim)',
              border: '1px solid rgba(108,87,240,0.2)',
            }}
          >
            <div className="card-label">Monthly Rent</div>
            <div className="card-value" style={{ color: 'var(--violet-light)' }}>
              {fmt(stats.stats?.monthlyRent)}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <Modal title="Confirm Delete" onClose={onCancel} width={400}>
      <p style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 24 }}>{message}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-outline btn-sm" onClick={onCancel}>Cancel</button>
        <button
          className="btn btn-sm"
          style={{ background: 'var(--danger)', color: '#fff' }}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Modal>
  );
}

// ── Main Page ──
export default function LandlordProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Property | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const [statsTarget, setStatsTarget] = useState<Property | null>(null);

  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = async () => {
    try {
      const data = await fetchLandlordProperties();
      setProperties(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleCreate = async (form: PropertyFormData) => {
    setFormLoading(true);
    try {
      await apiCreateProperty({
        ...form,
        monthlyRent: Number(form.monthlyRent),
        unitCount: Number(form.unitCount) || 1,
      });
      setShowCreate(false);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (form: PropertyFormData) => {
    if (!editTarget) return;
    setFormLoading(true);
    try {
      await apiUpdateProperty(editTarget.id, {
        ...form,
        monthlyRent: Number(form.monthlyRent),
        unitCount: Number(form.unitCount) || 1,
      });
      setEditTarget(null);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiDeleteProperty(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleImageUpload = async (propertyId: string, file: File) => {
    setUploading(propertyId);
    try {
      await uploadPropertyImage(propertyId, file);
      await load();
    } catch (e: any) {
      alert(e.message || 'Failed to upload image');
    } finally {
      setUploading(null);
    }
  };

  const fmt = (n: number) =>
    Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  if (loading) {
    return (
      <div className="page">
        <div className="pg-header">
          <div>
            <div className="pg-eyebrow">Landlord · Properties</div>
            <div className="pg-title">Properties</div>
          </div>
        </div>
        <div style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 13, marginTop: 60, textAlign: 'center' }}>
          Loading properties…
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Landlord · Properties</div>
          <div className="pg-title">Properties</div>
          <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 4 }}>
            {properties.length} listing{properties.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="pg-actions">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Add Property
          </button>
        </div>
      </div>

      {/* ── Grid ── */}
      {properties.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <p>No properties yet.</p>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setShowCreate(true)}>
            Add your first property
          </button>
        </div>
      ) : (
        <div className="properties-grid">
          {properties.map((property) => (
            <div key={property.id} className="property-card" style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Images */}
              <div className="property-images">
                {property.images?.length > 0 ? (
                  property.images.map((url, i) => (
                    <img
                      key={`${property.id}-${i}`}
                      src={url.startsWith('http') ? url : `${url}`}
                      alt={`${property.name} ${i + 1}`}
                      className="property-image"
                    />
                  ))
                ) : (
                  <div className="no-images">
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, marginBottom: 6, opacity: 0.4 }}>📷</div>
                      <div style={{ fontSize: 12 }}>No images uploaded</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="property-info" style={{ flex: 1 }}>
                <h3>{property.name}</h3>
                <p className="property-address">
                  {property.address}, {property.city}, {property.state}
                  {property.zipCode ? ` ${property.zipCode}` : ''}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <p className="property-rent">{fmt(property.monthlyRent)}/mo</p>
                  {property.unitCount && property.unitCount > 1 && (
                    <span className="badge badge-violet">{property.unitCount} units</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="property-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
                {/* Upload image */}
                <label className="upload-btn" style={{ cursor: uploading === property.id ? 'not-allowed' : 'pointer' }}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={uploading === property.id}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(property.id, file);
                    }}
                  />
                  {uploading === property.id ? '⏳ Uploading…' : '📷 Upload'}
                </label>

                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setStatsTarget(property)}
                >
                  📊 Stats
                </button>

                <button
                  className="btn btn-outline btn-sm"
                  onClick={() =>
                    setEditTarget(property)
                  }
                >
                  ✏️ Edit
                </button>

                <button
                  className="btn btn-sm"
                  style={{
                    background: 'var(--danger-bg)',
                    color: 'var(--danger)',
                    border: '1px solid rgba(242,87,87,0.2)',
                  }}
                  onClick={() => setDeleteTarget(property)}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Modal ── */}
      {showCreate && (
        <Modal title="Add New Property" onClose={() => setShowCreate(false)}>
          <PropertyForm
            initial={EMPTY_FORM}
            onSubmit={handleCreate}
            submitLabel="Create Property"
            loading={formLoading}
          />
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {editTarget && (
        <Modal title={`Edit · ${editTarget.name}`} onClose={() => setEditTarget(null)}>
          <PropertyForm
            initial={{
              name: editTarget.name,
              address: editTarget.address,
              city: editTarget.city,
              state: editTarget.state,
              zipCode: editTarget.zipCode || '',
              monthlyRent: editTarget.monthlyRent,
              unitCount: editTarget.unitCount || '',
            }}
            onSubmit={handleEdit}
            submitLabel="Save Changes"
            loading={formLoading}
          />
        </Modal>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <ConfirmModal
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      {/* ── Stats Modal ── */}
      {statsTarget && (
        <StatsModal
          propertyId={statsTarget.id}
          propertyName={statsTarget.name}
          onClose={() => setStatsTarget(null)}
        />
      )}
    </div>
  );
}