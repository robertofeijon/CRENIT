import React, { useEffect, useState } from 'react';
import { fetchRentDue, fetchProfile } from '../../api';

export default function TenantHome() {
  const [rent, setRent] = useState<{ amount: string; due: string } | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchRentDue().then(setRent).catch(console.error);
    fetchProfile().then((p) => setProfile(p.user || p)).catch(() => {});
  }, []);

  return (
    <div className="page">
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Dashboard</div>
          <div className="pg-title">
            Good morning{profile?.fullName ? `, ${profile.fullName}` : ''}
          </div>
          {profile?.phoneNumber && (
            <div style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 2 }}>
              Phone: {profile.phoneNumber}
            </div>
          )}
        </div>
        <div className="pg-actions">
          <button className="btn btn-outline">View Statements</button>
        </div>
      </div>
      <div className="rent-block">
        <div className="rb-left">
          <div className="rb-eyebrow">Rent Due · June 2025</div>
          <div className="rb-amount">{rent ? rent.amount : '$‑'}</div>
          <div className="rb-detail">
            Due in <strong>6 days</strong> · {rent?.due || '...'} · 2BR Apt, 14th St NW
          </div>
        </div>
        <div className="rb-right">
          <button className="btn-white">Pay Now</button>
          <button className="btn-white-ghost">Schedule Payment</button>
        </div>
      </div>
      {/* rest of the tenant home content omitted for brevity */}
    </div>
  );
}
