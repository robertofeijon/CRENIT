import React, { useEffect, useState } from 'react';

interface Dispute {
  id: string;
  paymentId: string;
  tenantId: string;
  tenantName: string;
  propertyName: string;
  amount: number;
  reason: string;
  status: 'open' | 'resolved' | 'rejected';
  createdAt: string;
  notes?: string;
}

function DisputeCard({
  dispute,
  onResolve,
  onReject,
}: {
  dispute: Dispute;
  onResolve: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const statusColor = {
    open: 'var(--warning)',
    resolved: 'var(--success)',
    rejected: 'var(--danger)',
  }[dispute.status];

  const statusBg = {
    open: 'rgba(245,166,35,0.12)',
    resolved: 'rgba(34,214,138,0.12)',
    rejected: 'rgba(242,87,87,0.12)',
  }[dispute.status];

  return (
    <div className="card" style={{ padding: '16px 20px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              ${dispute.amount.toFixed(2)} Dispute
            </div>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--r-sm)',
                background: statusBg,
                color: statusColor,
                fontSize: 12,
                fontWeight: 500,
                textTransform: 'capitalize',
              }}
            >
              {dispute.status}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 4 }}>
            {dispute.propertyName} • {dispute.tenantName}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8 }}>
            Reason: {dispute.reason}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            Posted: {new Date(dispute.createdAt).toLocaleDateString()}
          </div>
          {dispute.notes && (
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 8, padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--r-sm)' }}>
              Note: {dispute.notes}
            </div>
          )}
        </div>
        {dispute.status === 'open' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-sm"
              onClick={() => onResolve(dispute.id)}
              style={{
                background: 'rgba(34,214,138,0.12)',
                color: 'var(--success)',
                border: '1px solid rgba(34,214,138,0.2)',
                fontSize: 12,
              }}
            >
              Approve
            </button>
            <button
              className="btn btn-sm"
              onClick={() => onReject(dispute.id)}
              style={{
                background: 'rgba(242,87,87,0.12)',
                color: 'var(--danger)',
                border: '1px solid rgba(242,87,87,0.2)',
                fontSize: 12,
              }}
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LandlordDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchLandlordDisputes()
      .then((data) => {
        setDisputes(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error('Failed to fetch disputes:', e);
        setDisputes([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleResolve = (id: string) => {
    // This would be handled by admin, not landlord
    alert('Disputes are resolved by administrators. Please contact support.');
  };

  const handleReject = (id: string) => {
    // This would be handled by admin, not landlord
    alert('Disputes are resolved by administrators. Please contact support.');
  };

  const filteredDisputes = disputes.filter((d) => {
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: disputes.length,
    open: disputes.filter((d) => d.status === 'open').length,
    resolved: disputes.filter((d) => d.status === 'resolved').length,
    rejected: disputes.filter((d) => d.status === 'rejected').length,
  };

  return (
    <div className="page">
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Landlord · Disputes</div>
          <div className="pg-title">Dispute Resolution</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--ink)' },
          { label: 'Open', value: stats.open, color: 'var(--warning)' },
          { label: 'Resolved', value: stats.resolved, color: 'var(--success)' },
          { label: 'Rejected', value: stats.rejected, color: 'var(--danger)' },
        ].map((item) => (
          <div key={item.label} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 8 }}>
              {item.label}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: item.color }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 24 }}>
        <select
          className="input"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ maxWidth: 160 }}
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Disputes List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-3)' }}>
          Loading disputes…
        </div>
      ) : filteredDisputes.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚖️</div>
          <p>
            {filterStatus === 'all'
              ? 'No disputes at this time. Great job!'
              : `No ${filterStatus} disputes.`}
          </p>
        </div>
      ) : (
        <div>
          <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 12 }}>
            {filteredDisputes.length} dispute{filteredDisputes.length !== 1 ? 's' : ''}
          </div>
          {filteredDisputes.map((dispute) => (
            <DisputeCard
              key={dispute.id}
              dispute={dispute}
              onResolve={handleResolve}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
