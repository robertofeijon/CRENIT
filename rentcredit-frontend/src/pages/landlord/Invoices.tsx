import React, { useEffect, useState } from 'react';
import { fetchPendingInvoices, approveInvoiceRequest, rejectInvoiceRequest } from '../../api';

interface InvoiceRequest {
  id: string;
  propertyId: string;
  tenantId: string;
  amount: number;
  notes?: string;
  status: string;
  createdAt: string;
  tenant?: { fullName: string };
  property?: { name: string };
}

export default function LandlordInvoices() {
  const [requests, setRequests] = useState<InvoiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingInvoices()
      .then(setRequests)
      .catch((e) => setError(e.message || 'Failed to load invoice requests'))
      .finally(() => setLoading(false));
  }, []);

  async function handleApprove(id: string) {
    try {
      await approveInvoiceRequest(id);
      setRequests((reqs) => reqs.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e.message || 'Failed to approve invoice');
    }
  }

  async function handleReject(id: string) {
    try {
      await rejectInvoiceRequest(id);
      setRequests((reqs) => reqs.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e.message || 'Failed to reject invoice');
    }
  }

  return (
    <div className="page">
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Landlord</div>
          <div className="pg-title">Pending Invoice Requests</div>
        </div>
      </div>
      {loading ? (
        <div>Loading…</div>
      ) : error ? (
        <div style={{ color: 'red' }}>{error}</div>
      ) : requests.length === 0 ? (
        <div>No pending invoice requests.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Property</th>
              <th>Amount</th>
              <th>Notes</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id}>
                <td>{req.tenant?.fullName || req.tenantId}</td>
                <td>{req.property?.name || req.propertyId}</td>
                <td>${req.amount}</td>
                <td>{req.notes || '-'}</td>
                <td>{new Date(req.createdAt).toLocaleString()}</td>
                <td>{req.status}</td>
                <td>
                  <button className="btn btn-primary btn-sm" onClick={() => handleApprove(req.id)}>
                    Approve
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => handleReject(req.id)} style={{ marginLeft: 8 }}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
