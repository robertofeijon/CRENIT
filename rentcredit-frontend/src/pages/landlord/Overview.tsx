import React, { useEffect, useState } from 'react';
import { fetchProfile } from '../../api';

export default function LandlordOverview() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfile().then((p) => setProfile(p.user || p)).catch(() => {});
  }, []);

  return (
    <div className="page">
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Landlord · Overview</div>
          <div className="pg-title">Portfolio Overview</div>
          {profile?.phoneNumber && (
            <div style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 2 }}>
              Phone: {profile.phoneNumber}
            </div>
          )}
        </div>
      </div>
      <p style={{ margin: '40px 0', fontSize: '16px', color: 'var(--ink-3)' }}>
        Overview placeholder
      </p>
    </div>
  );
}
