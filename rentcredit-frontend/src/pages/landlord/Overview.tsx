import React, { useEffect, useState } from 'react';
import { fetchLandlordOverview } from '../../api';

export default function LandlordOverview() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLandlordOverview()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="page">
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Landlord · Overview</div>
          <div className="pg-title">Portfolio Overview</div>
        </div>
      </div>
      {error && <div style={{ color: 'var(--danger)' }}>{error}</div>}
      {data ? (
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        <p style={{ margin: '40px 0', fontSize: '16px', color: 'var(--ink-3)' }}>
          Overview placeholder
        </p>
      )}
    </div>
  );
}
