import React, { useEffect, useState } from 'react';
import { fetchTenantPayments } from '../../api';

export default function TenantPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTenantPayments()
      .then(setPayments)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="page">
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Tenant · Payments</div>
          <div className="pg-title">Payments Center</div>
        </div>
        <div className="pg-actions">
          <button className="btn btn-outline btn-sm">↓ Annual Statement</button>
          <button className="btn btn-primary btn-sm">+ Pay Rent</button>
        </div>
      </div>
      {error && <div style={{ color: 'var(--danger)' }}>{error}</div>}
      {payments.length ? (
        <ul>
          {payments.map((p) => (
            <li key={p.id}>{p.amount} - {p.status}</li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: '40px 0', fontSize: '16px', color: 'var(--ink-3)' }}>
          {error ? 'Unable to load payments' : 'Payments dashboard placeholder'}
        </p>
      )}
    </div>
  );
}
