import React, { useEffect, useState } from 'react';
import { fetchProfile } from '../../api';

export default function TenantCredit() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile()
      .then((p) => setProfile(p.user || p))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  // Mock credit score based on KYC status
  const creditScore = profile?.kycStatus === 'verified' ? 720 : 650;
  const creditGrade = creditScore >= 750 ? 'Excellent' : creditScore >= 700 ? 'Good' : creditScore >= 650 ? 'Fair' : 'Poor';

  if (loading) {
    return (
      <div className="page">
        <div className="pg-header">
          <div>
            <div className="pg-eyebrow">Tenant · Credit</div>
            <div className="pg-title">Credit Hub</div>
          </div>
        </div>
        <div style={{ color: 'var(--ink-3)', textAlign: 'center', padding: '60px 20px' }}>
          Loading credit information…
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Tenant · Credit</div>
          <div className="pg-title">Credit Hub</div>
        </div>
      </div>

      {/* Credit Score Card */}
      <div
        className="card"
        style={{
          padding: '32px 28px',
          background: 'linear-gradient(135deg, var(--violet-deep), var(--violet))',
          border: '1px solid rgba(108,87,240,0.3)',
          borderRadius: 'var(--r-xl)',
          marginBottom: 32,
          textAlign: 'center',
        }}
      >
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8 }}>
          Your Credit Score
        </div>
        <div style={{ fontSize: '4rem', fontWeight: 800, color: 'white', marginBottom: 8 }}>
          {creditScore}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#8b7ef8', marginBottom: 16 }}>
          {creditGrade}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
          Based on your rent payment history and verification status
        </div>
      </div>

      {/* Credit Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'On-Time Payments', value: '12/12' },
          { label: 'Account Age', value: '6 months' },
          { label: 'Verification Status', value: profile?.kycStatus === 'verified' ? 'Verified' : 'Pending' },
          { label: 'Payment History', value: 'Perfect' },
        ].map((item) => (
          <div key={item.label} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 8 }}>
              {item.label}
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Credit Building Tips */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: 16, fontWeight: 600 }}>💡 Ways to Build Your Credit</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            'Pay rent on time every month',
            'Verify your identity with KYC',
            'Keep your account in good standing',
            'Use your property information to build trust',
          ].map((tip, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                paddingBottom: 12,
                borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ color: 'var(--success)', fontWeight: 700, minWidth: 20 }}>✓</div>
              <div style={{ color: 'var(--ink-2)' }}>{tip}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
