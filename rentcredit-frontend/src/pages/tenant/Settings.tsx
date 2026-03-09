import React, { useEffect, useState } from 'react';
import { fetchProfile, updateProfile } from '../../api';

const phonePattern = /^\+?[1-9]\d{1,14}$/; // E.164 international

export default function TenantSettings() {
  const [profile, setProfile] = useState<any>(null);
  const [edit, setEdit] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetchProfile()
      .then((p) => {
        const user = p.user || p;
        setProfile(user);
        setFullName(user.fullName || '');
        setPhoneNumber(user.phoneNumber || '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setInitialLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!fullName.trim()) {
      setError('Name is required');
      return;
    }
    if (phoneNumber && !phonePattern.test(phoneNumber)) {
      setError('Phone must be in international format, e.g. +1234567890');
      return;
    }
    setLoading(true);
    try {
      await updateProfile({ fullName, phoneNumber });
      setSuccess('Profile updated successfully');
      setProfile((p: any) => ({ ...p, fullName, phoneNumber }));
      setEdit(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="page" style={{ maxWidth: '680px' }}>
        <div className="pg-header">
          <div>
            <div className="pg-eyebrow">Tenant · Settings</div>
            <div className="pg-title">Settings</div>
          </div>
        </div>
        <div style={{ color: 'var(--ink-3)', textAlign: 'center', padding: '60px 20px' }}>
          Loading settings…
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: '680px' }}>
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Tenant · Settings</div>
          <div className="pg-title">Settings</div>
        </div>
      </div>

      {error && (
        <div
          style={{
            color: 'var(--danger)',
            background: 'rgba(242,87,87,0.12)',
            border: '1px solid rgba(242,87,87,0.2)',
            padding: '12px 16px',
            borderRadius: 'var(--r-md)',
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            color: 'var(--success)',
            background: 'rgba(34,214,138,0.12)',
            border: '1px solid rgba(34,214,138,0.2)',
            padding: '12px 16px',
            borderRadius: 'var(--r-md)',
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {success}
        </div>
      )}

      {profile && !edit && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: 20, fontWeight: 600 }}>👤 Profile Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>Full Name</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{profile.fullName}</div>
            </div>
            <div>
              <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>Email</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{profile.email}</div>
            </div>
            <div>
              <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>Phone</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {profile.phoneNumber || '(not set)'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>Role</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  display: 'inline-block',
                  padding: '4px 10px',
                  background: 'rgba(108,87,240,0.12)',
                  color: 'var(--violet-light)',
                  borderRadius: 'var(--r-sm)',
                  textTransform: 'capitalize',
                }}
              >
                {profile.role}
              </div>
            </div>
          </div>
          <button
            className="btn btn-outline"
            style={{ marginTop: 20 }}
            onClick={() => setEdit(true)}
          >
            ✏️ Edit Profile
          </button>
        </div>
      )}

      {edit && (
        <form onSubmit={handleSubmit} className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: 20, fontWeight: 600 }}>✏️ Edit Profile</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="input-label">Full Name *</label>
              <input
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="input-label">Phone (International Format)</label>
              <input
                className="input"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                disabled={loading}
              />
              <div style={{ color: 'var(--ink-3)', fontSize: 11, marginTop: 6 }}>
                Format: +{'{country}'}{'{areacode}'}{'{number}'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => {
                  setEdit(false);
                  setError(null);
                  setFullName(profile?.fullName || '');
                  setPhoneNumber(profile?.phoneNumber || '');
                }}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Additional Settings */}
      <div className="card" style={{ padding: '24px', marginTop: 16 }}>
        <h3 style={{ marginBottom: 20, fontWeight: 600 }}>🔒 Security & Privacy</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: 12,
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div>
              <div style={{ fontWeight: 500, marginBottom: 2 }}>Change Password</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Update your password</div>
            </div>
            <button className="btn btn-sm btn-outline" disabled>
              Coming Soon
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 2 }}>Two-Factor Authentication</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Add extra security to your account</div>
            </div>
            <button className="btn btn-sm btn-outline" disabled>
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
