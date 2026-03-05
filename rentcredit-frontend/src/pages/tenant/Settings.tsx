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

  useEffect(() => {
    fetchProfile()
      .then((p) => {
        const user = p.user || p;
        setProfile(user);
        setFullName(user.fullName || '');
        setPhoneNumber(user.phoneNumber || '');
      })
      .catch((e) => setError(e.message));
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
      setSuccess('Profile updated');
      setProfile((p: any) => ({ ...p, fullName, phoneNumber }));
      setEdit(false);
    } catch (e: any) {
      setError(e.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: '680px' }}>
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Tenant</div>
          <div className="pg-title">Settings</div>
        </div>
      </div>
      {error && <div style={{ color: 'var(--danger)', marginBottom: 8 }}>{error}</div>}
      {success && <div style={{ color: 'var(--success)', marginBottom: 8 }}>{success}</div>}
      {profile && !edit && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 16 }}>
          <div><strong>Name:</strong> {profile.fullName}</div>
          <div><strong>Email:</strong> {profile.email}</div>
          <div><strong>Phone:</strong> {profile.phoneNumber || '(not set)'}</div>
          <div><strong>Role:</strong> {profile.role}</div>
          <button className="btn btn-outline" style={{ width: 120, marginTop: 12 }} onClick={() => setEdit(true)}>
            Edit Profile
          </button>
        </div>
      )}
      {edit && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 340 }}>
          <label className="input-label">
            Name
            <input
              className="input"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              disabled={loading}
            />
          </label>
          <label className="input-label">
            Phone (international)
            <input
              className="input"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              pattern="^\\+?[1-9]\\d{1,14}$"
              disabled={loading}
            />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>Save</button>
            <button className="btn btn-outline" type="button" onClick={() => setEdit(false)} disabled={loading}>Cancel</button>
          </div>
        </form>
      )}
      {!profile && !error && (
        <p style={{ margin: '40px 0', fontSize: '16px', color: 'var(--ink-3)' }}>
          Loading profile...
        </p>
      )}
    </div>
  );
}
