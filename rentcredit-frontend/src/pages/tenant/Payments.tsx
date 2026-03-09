import React, { useEffect, useState } from 'react';
import { fetchTenantPayments, createDispute } from '../../api';

interface Payment {
  id: string;
  amount: number | string;
  status: 'completed' | 'pending' | 'overdue' | string;
  createdAt: string;
  dueDate?: string;
  property?: { name: string };
}

export default function TenantPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  useEffect(() => {
    fetchTenantPayments()
      .then((data) => {
        setPayments(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        setError(e.message);
        setPayments([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: payments.length,
    completed: payments.filter((p) => p.status === 'completed').length,
    pending: payments.filter((p) => p.status === 'pending').length,
    overdue: payments.filter((p) => p.status === 'overdue').length,
    totalPaid: payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0),
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      completed: { bg: 'rgba(34,214,138,0.12)', color: 'var(--success)' },
      pending: { bg: 'rgba(245,166,35,0.12)', color: 'var(--warning)' },
      overdue: { bg: 'rgba(242,87,87,0.12)', color: 'var(--danger)' },
    };
    return colors[status] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--ink-2)' };
  };

  if (loading) {
    return (
      <div className="page">
        <div className="pg-header">
          <div>
            <div className="pg-eyebrow">Tenant · Payments</div>
            <div className="pg-title">Payments Center</div>
          </div>
        </div>
        <div style={{ color: 'var(--ink-3)', textAlign: 'center', padding: '60px 20px' }}>
          Loading payments…
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Tenant · Payments</div>
          <div className="pg-title">Payments Center</div>
        </div>
        <div className="pg-actions">
          <button className="btn btn-outline btn-sm">↓ Statement</button>
          <button className="btn btn-primary" onClick={() => setShowPaymentForm(true)}>
            + Pay Rent
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Total Payments', value: stats.total },
          { label: 'Completed', value: stats.completed },
          { label: 'Pending', value: stats.pending },
          { label: 'Overdue', value: stats.overdue },
        ].map((item) => (
          <div key={item.label} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 8 }}>
              {item.label}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: 20, padding: '12px 16px', background: 'rgba(242,87,87,0.12)', borderRadius: 'var(--r-md)' }}>
          {error}
        </div>
      )}

      {/* Payments List */}
      {payments.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
          <p>No payment records yet.</p>
        </div>
      ) : (
        <div>
          <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 16 }}>
            {payments.length} payment record{payments.length !== 1 ? 's' : ''}
          </div>
          {payments.map((payment) => {
            const statusColor = getStatusColor(payment.status);
            return (
              <div key={payment.id} className="card" style={{ padding: '16px 20px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>
                        ${typeof payment.amount === 'string' ? payment.amount : payment.amount?.toFixed(2)}
                      </div>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--r-sm)',
                          background: statusColor.bg,
                          color: statusColor.color,
                          fontSize: 12,
                          fontWeight: 500,
                          textTransform: 'capitalize',
                        }}
                      >
                        {payment.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 4 }}>
                      {payment.property?.name || 'Property'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      Created: {new Date(payment.createdAt).toLocaleDateString()}
                      {payment.dueDate && ` • Due: ${new Date(payment.dueDate).toLocaleDateString()}`}
                    </div>
                  </div>
                  {payment.status !== 'completed' && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowPaymentForm(true)}
                    >
                      Pay Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pay Rent Modal */}
      {showPaymentForm && (
        <>
          <div
            onClick={() => setShowPaymentForm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 900,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 901,
              width: 460,
              maxWidth: 'calc(100vw - 40px)',
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--r-xl)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              padding: '24px',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 20 }}>
              Pay Rent
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '16px', background: 'var(--violet-dim)', borderRadius: 'var(--r-md)', border: '1px solid rgba(108,87,240,0.2)' }}>
                <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 4 }}>Amount Due</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--violet-light)' }}>
                  $—
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 8 }}>
                  Payment processing is coming soon
                </div>
              </div>
              <div>
                <label className="input-label">Payment Method</label>
                <select className="input" disabled>
                  <option>Bank Transfer (Coming Soon)</option>
                  <option>Credit Card (Coming Soon)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-outline" onClick={() => setShowPaymentForm(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" disabled>
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
