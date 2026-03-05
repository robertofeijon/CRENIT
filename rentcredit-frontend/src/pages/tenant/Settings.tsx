import React, { useEffect, useState } from 'react';
import { fetchProfile } from '../../api';

export default function TenantSettings() {
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile()
      .then((p) => setProfile(p.user || p))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="page" style={{ maxWidth: '680px' }}>
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Tenant</div>
          <div className="pg-title">Settings</div>
        </div>
      </div>
      {error && <div style={{ color: 'var(--danger)' }}>{error}</div>}
      {profile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div><strong>Name:</strong> {profile.fullName}</div>
          <div><strong>Email:</strong> {profile.email}</div>
          <div><strong>Phone:</strong> {profile.phoneNumber || '(not set)'}</div>
          <div><strong>Role:</strong> {profile.role}</div>
        </div>
      ) : (
        <p style={{ margin: '40px 0', fontSize: '16px', color: 'var(--ink-3)' }}>
          Settings placeholder
        </p>
      )}
    </div>
  );
}
