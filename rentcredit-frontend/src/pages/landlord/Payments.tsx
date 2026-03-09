import React, { useEffect, useState } from 'react';
import { fetchAllPayments, createPayment, recordPayment, updatePaymentStatus, fetchLandlordProperties } from '../../api';

interface Payment {
  id: string;
  amount: number | string;
  status: 'completed' | 'pending' | 'overdue' | string;
  createdAt: string;
  dueDate?: string;
  propertyId?: string;
  tenantId?: string;
  property?: { name: string };
  tenant?: { fullName: string };
}

interface Property {
  id: string;
  name: string;
  address: string;
}

function PaymentCard({ payment, onRecord, onStatusChange }: { payment: Payment; onRecord: (id: string) => void; onStatusChange: (id: string, status: string) => void }) {
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [recordAmount, setRecordAmount] = useState(payment.amount?.toString() || '');

  const statusColor = {
    completed: 'var(--success)',
    pending: 'var(--warning)',
    overdue: 'var(--danger)',
  }[payment.status] || 'var(--ink-2)';

  const statusBg = {
    completed: 'rgba(34,214,138,0.12)',
    pending: 'rgba(245,166,35,0.12)',
    overdue: 'rgba(242,87,87,0.12)',
  }[payment.status] || 'rgba(255,255,255,0.06)';

  const handleRecord = async () => {
    try {
      await recordPayment(payment.id, {
        amount: Number(recordAmount),
        paidDate: new Date().toISOString(),
      });
      setShowRecordForm(false);
      onRecord(payment.id);
    } catch (e: any) {
      alert(e.message || 'Failed to record payment');
    }
  };

  return (
    <div className="card" style={{ padding: '16px 20px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              ${typeof payment.amount === 'string' ? payment.amount : payment.amount?.toFixed(2)}
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
              {payment.status}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 4 }}>
            {payment.property?.name || 'Property'} • {payment.tenant?.fullName || 'Tenant'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            Created: {new Date(payment.createdAt).toLocaleDateString()}
            {payment.dueDate && ` • Due: ${new Date(payment.dueDate).toLocaleDateString()}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {payment.status !== 'completed' && (
            <>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowRecordForm(!showRecordForm)}
                style={{ fontSize: 12 }}
              >
                Record
              </button>
              <button
                className="btn btn-sm"
                onClick={() => onStatusChange(payment.id, 'completed')}
                style={{
                  background: 'rgba(34,214,138,0.12)',
                  color: 'var(--success)',
                  border: '1px solid rgba(34,214,138,0.2)',
                  fontSize: 12,
                }}
              >
                Mark Done
              </button>
            </>
          )}
        </div>
      </div>
      {showRecordForm && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              className="input"
              placeholder="Record amount"
              value={recordAmount}
              onChange={(e) => setRecordAmount(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleRecord}
            >
              Save
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShowRecordForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LandlordPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProperty, setFilterProperty] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ propertyId: '', tenantId: '', amount: '', dueDate: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const [paymentData, propData] = await Promise.all([
          fetchAllPayments().catch((e) => {
            console.error('Failed to fetch payments:', e);
            return [];
          }),
          fetchLandlordProperties().catch((e) => {
            console.error('Failed to fetch properties:', e);
            return [];
          }),
        ]);
        setPayments(Array.isArray(paymentData) ? paymentData : []);
        setProperties(Array.isArray(propData) ? propData : []);
        if (!paymentData || paymentData.length === 0) {
          console.info('No payments available or endpoint not ready');
        }
      } catch (e: any) {
        console.error('Error loading data:', e);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleCreatePayment = async () => {
    if (!formData.propertyId || !formData.tenantId || !formData.amount) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      await createPayment({
        propertyId: formData.propertyId,
        tenantId: formData.tenantId,
        amount: Number(formData.amount),
        dueDate: formData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setFormData({ propertyId: '', tenantId: '', amount: '', dueDate: '' });
      setShowCreateForm(false);
      // Reload payments
      const data = await fetchAllPayments();
      setPayments(Array.isArray(data) ? data : []);
    } catch (e: any) {
      alert(e.message || 'Failed to create payment');
    }
  };

  const handleRecordPayment = async () => {
    const data = await fetchAllPayments();
    setPayments(Array.isArray(data) ? data : []);
  };

  const handleStatusChange = async (paymentId: string, status: string) => {
    try {
      await updatePaymentStatus(paymentId, status);
      const data = await fetchAllPayments();
      setPayments(Array.isArray(data) ? data : []);
    } catch (e: any) {
      alert(e.message || 'Failed to update payment');
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterProperty !== 'all' && p.propertyId !== filterProperty) return false;
    return true;
  });

  const stats = {
    total: payments.length,
    completed: payments.filter((p) => p.status === 'completed').length,
    pending: payments.filter((p) => p.status === 'pending').length,
    overdue: payments.filter((p) => p.status === 'overdue').length,
    totalAmount: payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
  };

  if (loading) {
    return (
      <div className="page">
        <div className="pg-header">
          <div>
            <div className="pg-eyebrow">Landlord · Payments</div>
            <div className="pg-title">Payment Operations</div>
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
          <div className="pg-eyebrow">Landlord · Payments</div>
          <div className="pg-title">Payment Operations</div>
        </div>
        <div className="pg-actions">
          <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
            + New Payment
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Total Payments', value: stats.total, color: 'var(--ink)' },
          { label: 'Completed', value: stats.completed, color: 'var(--success)' },
          { label: 'Pending', value: stats.pending, color: 'var(--warning)' },
          { label: 'Overdue', value: stats.overdue, color: 'var(--danger)' },
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

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select
          className="input"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ maxWidth: 160 }}
        >
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
        <select
          className="input"
          value={filterProperty}
          onChange={(e) => setFilterProperty(e.target.value)}
          style={{ maxWidth: 200 }}
        >
          <option value="all">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
          <p>No payments found.</p>
        </div>
      ) : (
        <div>
          <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 12 }}>
            {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}
          </div>
          {filteredPayments.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              onRecord={handleRecordPayment}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Create Payment Modal */}
      {showCreateForm && (
        <>
          <div
            onClick={() => setShowCreateForm(false)}
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
              Create New Payment
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="input-label">Property *</label>
                <select
                  className="input"
                  value={formData.propertyId}
                  onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                >
                  <option value="">Select property…</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">Amount *</label>
                <input
                  type="number"
                  className="input"
                  placeholder="1000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="input-label">Due Date</label>
                <input
                  type="date"
                  className="input"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleCreatePayment}>
                  Create
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
