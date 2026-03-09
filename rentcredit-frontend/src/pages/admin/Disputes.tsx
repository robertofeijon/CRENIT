import React, { useEffect, useState } from 'react';
import { fetchAllDisputes, resolveDispute, rejectDispute } from '../../api';

interface Dispute {
  id: string;
  paymentId: string;
  tenantId: string;
  tenantName: string;
  landlordId: string;
  landlordName: string;
  type: string;
  reason: string;
  description: string;
  status: 'open' | 'in_review' | 'resolved' | 'rejected';
  amount: number;
  resolution?: string;
  notes?: string;
  resolvedByAdmin?: string;
  createdAt: string;
  resolutionDate?: string;
}

function DisputeCard({
  dispute,
  onResolve,
  onReject,
}: {
  dispute: Dispute;
  onResolve: (id: string, resolution: string, notes: string) => void;
  onReject: (id: string, resolution: string, notes: string) => void;
}) {
  const [resolutionText, setResolutionText] = useState('');
  const [notes, setNotes] = useState('');
  const [showResolutionForm, setShowResolutionForm] = useState(false);

  const statusColor = {
    open: 'var(--warning)',
    in_review: 'var(--violet)',
    resolved: 'var(--success)',
    rejected: 'var(--danger)',
  }[dispute.status];

  const statusBg = {
    open: 'rgba(245,166,35,0.12)',
    in_review: 'rgba(167,139,250,0.12)',
    resolved: 'rgba(34,214,138,0.12)',
    rejected: 'rgba(242,87,87,0.12)',
  }[dispute.status];

  return (
    <div className="card" style={{ padding: '16px 20px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              ${dispute.amount?.toFixed(2) || '0.00'} Dispute
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
              {dispute.status.replace('_', ' ')}
            </span>
          </div>

          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 4 }}>
            <strong>{dispute.tenantName}</strong> vs <strong>{dispute.landlordName}</strong>
          </div>

          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 4 }}>
            Type: {dispute.type.replace('_', ' ')} • Reason: {dispute.reason}
          </div>

          {dispute.description && (
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8 }}>
              Description: {dispute.description}
            </div>
          )}

          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            Posted: {new Date(dispute.createdAt).toLocaleDateString()}
          </div>

          {dispute.resolution && (
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 8, padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--r-sm)' }}>
              Resolution: {dispute.resolution}
              {dispute.resolvedByAdmin && (
                <div style={{ marginTop: 4, fontSize: 11 }}>
                  Resolved by: {dispute.resolvedByAdmin}
                </div>
              )}
            </div>
          )}
        </div>

        {dispute.status === 'open' && (
          <div style={{ display: 'flex', gap: 8 }}>
            {!showResolutionForm ? (
              <>
                <button
                  className="btn btn-sm"
                  onClick={() => setShowResolutionForm(true)}
                  style={{
                    background: 'rgba(34,214,138,0.12)',
                    color: 'var(--success)',
                    border: '1px solid rgba(34,214,138,0.2)',
                    fontSize: 12,
                  }}
                >
                  Resolve
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => onReject(dispute.id, 'Dispute rejected by administrator', '')}
                  style={{
                    background: 'rgba(242,87,87,0.12)',
                    color: 'var(--danger)',
                    border: '1px solid rgba(242,87,87,0.2)',
                    fontSize: 12,
                  }}
                >
                  Reject
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
                <textarea
                  placeholder="Resolution details..."
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    border: '1px solid var(--surface-3)',
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: 12,
                    minHeight: 60,
                    resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      onResolve(dispute.id, resolutionText, notes);
                      setShowResolutionForm(false);
                    }}
                    disabled={!resolutionText.trim()}
                    style={{
                      background: 'var(--success)',
                      color: 'white',
                      fontSize: 12,
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => setShowResolutionForm(false)}
                    style={{ fontSize: 12 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchAllDisputes()
      .then((data) => {
        setDisputes(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error('Failed to fetch disputes:', e);
        setDisputes([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleResolve = async (id: string, resolution: string, notes: string) => {
    try {
      await resolveDispute(id, { resolution, notes });
      setDisputes((disputes) =>
        disputes.map((d) =>
          d.id === id
            ? { ...d, status: 'resolved', resolution, notes }
            : d
        )
      );
    } catch (e: any) {
      console.error('Failed to resolve dispute:', e);
      alert('Failed to resolve dispute');
    }
  };

  const handleReject = async (id: string, resolution: string, notes: string) => {
    try {
      await rejectDispute(id, { resolution, notes });
      setDisputes((disputes) =>
        disputes.map((d) =>
          d.id === id
            ? { ...d, status: 'rejected', resolution, notes }
            : d
        )
      );
    } catch (e: any) {
      console.error('Failed to reject dispute:', e);
      alert('Failed to reject dispute');
    }
  };

  const filteredDisputes = disputes.filter((d) => {
    if (filterStatus === 'all') return true;
    return d.status === filterStatus;
  });

  const stats = {
    total: disputes.length,
    open: disputes.filter((d) => d.status === 'open').length,
    in_review: disputes.filter((d) => d.status === 'in_review').length,
    resolved: disputes.filter((d) => d.status === 'resolved').length,
    rejected: disputes.filter((d) => d.status === 'rejected').length,
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Admin · Disputes</div>
          <div className="pg-title">Dispute Resolution Center</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--ink)' },
          { label: 'Open', value: stats.open, color: 'var(--warning)' },
          { label: 'In Review', value: stats.in_review, color: 'var(--violet)' },
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
          <option value="in_review">In Review</option>
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
              ? 'No disputes at this time.'
              : `No ${filterStatus.replace('_', ' ')} disputes.`}
          </p>
        </div>
      ) : (
        <div>
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
