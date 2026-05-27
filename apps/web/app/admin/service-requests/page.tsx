"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../src/contexts/AuthContext';
import api from '../../../src/lib/api';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';

interface PendingRequest {
  id: string;
  landlord_id: string;
  request_type: string;
  status: string;
  description?: string;
  fee_amount: number;
  assigned_admin_id?: string;
  created_at: string;
}

interface PendingAttachment {
  id: string;
  landlord_id: string;
  property_id?: string;
  attachment_type: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  uploaded_at: string;
}

export default function AdminServiceRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<PendingAttachment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState<'requests' | 'attachments'>('requests');

  useEffect(() => {
    if (user) {
      loadRequests();
      loadPendingAttachments();
    }
  }, [user]);

  const loadRequests = async () => {
    try {
      const res = await api.get(`/admin/service-requests`);
      setRequests(res.data?.data || []);
      setError('');
    } catch (err) {
      console.error('Unable to load requests', err);
      setError('Unable to load service requests.');
    }
  };

  const loadPendingAttachments = async () => {
    try {
      const res = await api.get(`/admin/attachments?status=PENDING`);
      setPendingAttachments(res.data?.data || []);
      setError('');
    } catch (err) {
      console.error('Unable to load attachments', err);
      setError('Unable to load pending attachments.');
    }
  };

  const handleAssignRequest = async (requestId: string) => {
    setLoading(true);
    try {
      const res = await api.post(`/admin/service-requests/${requestId}/assign`);
      if (res.data?.success) {
        setMessage('Request assigned.');
        loadRequests();
      }
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Unable to assign request.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRequest = async (requestId: string) => {
    setLoading(true);
    try {
      const res = await api.post(`/admin/service-requests/${requestId}/complete`);
      if (res.data?.success) {
        setMessage('Request completed.');
        loadRequests();
      }
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Unable to complete request.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAttachment = async (attachmentId: string) => {
    setLoading(true);
    try {
      const res = await api.post(`/admin/attachments/${attachmentId}/verify`);
      if (res.data?.success) {
        setMessage('Attachment verified.');
        loadPendingAttachments();
        setSelectedAttachment(null);
      }
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Unable to verify attachment.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectAttachment = async (attachmentId: string) => {
    if (!rejectionReason.trim()) {
      setMessage('Please provide a rejection reason.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/admin/attachments/${attachmentId}/reject`, {
        rejection_reason: rejectionReason,
      });
      if (res.data?.success) {
        setMessage('Attachment rejected.');
        loadPendingAttachments();
        setSelectedAttachment(null);
        setRejectionReason('');
      }
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Unable to reject attachment.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      VERIFIED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      ACCEPTED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-semibold mb-6">Service Requests & Attachment Review</h1>

      {error ? (
        <div className="mb-4">
          <ErrorStateCard
            message={error}
            onRetry={activeTab === 'requests' ? loadRequests : loadPendingAttachments}
          />
        </div>
      ) : null}

      {message && (
        <div className="mb-4 p-4 rounded bg-green-50 text-green-800 border border-green-200">
          {message}
        </div>
      )}

      <div className="flex gap-4 mb-6 border-b">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'requests' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('requests')}
        >
          Service Requests ({requests.filter((r) => r.status !== 'COMPLETED').length})
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'attachments' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('attachments')}
        >
          Pending Attachments ({pendingAttachments.length})
        </button>
      </div>

      {activeTab === 'requests' && (
        <div className="space-y-4">
          {loading && !requests.length ? <SkeletonBlocks rows={3} /> : null}
          {requests.length === 0 ? (
            <EmptyStateCard title="No service requests" description="There are no active service requests right now." />
          ) : (
            requests.map((req) => (
              <div key={req.id} className="border rounded-lg p-4 bg-white shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold">{req.request_type.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-600">Landlord ID: {req.landlord_id}</p>
                    <p className="text-sm text-gray-600">Fee: ${req.fee_amount}</p>
                    <p className="text-xs text-gray-500">{new Date(req.created_at).toLocaleDateString()}</p>
                    {req.description && <p className="text-sm mt-2 text-gray-700">{req.description}</p>}
                  </div>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusBadge(req.status)}`}>{req.status}</span>
                </div>

                {req.status === 'PENDING' && (
                  <div className="mt-4 space-x-2 flex">
                    <button
                      className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium disabled:bg-gray-400"
                      disabled={loading}
                      onClick={() => handleAssignRequest(req.id)}
                    >
                      Assign to Me
                    </button>
                  </div>
                )}

                {req.status === 'ACCEPTED' && req.assigned_admin_id === user?.id && (
                  <div className="mt-4 space-x-2 flex">
                    <button
                      className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium disabled:bg-gray-400"
                      disabled={loading}
                      onClick={() => handleCompleteRequest(req.id)}
                    >
                      Mark Complete
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'attachments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {loading && !pendingAttachments.length ? <SkeletonBlocks rows={3} /> : null}
            {pendingAttachments.length === 0 ? (
              <EmptyStateCard title="No pending attachments" description="All submitted attachments have been processed." />
            ) : (
              pendingAttachments.map((att) => (
                <div
                  key={att.id}
                  className={`border rounded-lg p-4 bg-white cursor-pointer transition ${
                    selectedAttachment?.id === att.id ? 'ring-2 ring-blue-600' : 'hover:shadow'
                  }`}
                  onClick={() => setSelectedAttachment(att)}
                >
                  <p className="font-semibold">{att.attachment_type.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-gray-600">Landlord ID: {att.landlord_id}</p>
                  {att.property_id && <p className="text-sm text-gray-600">Property ID: {att.property_id}</p>}
                  <p className="text-xs text-gray-500">{new Date(att.uploaded_at).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>

          {selectedAttachment && (
            <div className="lg:col-span-1 border rounded-lg p-4 bg-white shadow">
              <h3 className="font-semibold mb-4">Review Attachment</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Document Type</p>
                  <p className="text-sm text-gray-600">{selectedAttachment.attachment_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Landlord ID</p>
                  <p className="text-sm text-gray-600">{selectedAttachment.landlord_id}</p>
                </div>
                {selectedAttachment.property_id && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Property ID</p>
                    <p className="text-sm text-gray-600">{selectedAttachment.property_id}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700">Uploaded</p>
                  <p className="text-sm text-gray-600">{new Date(selectedAttachment.uploaded_at).toLocaleString()}</p>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <button
                    className="w-full bg-green-600 text-white px-4 py-2 rounded text-sm font-medium disabled:bg-gray-400"
                    disabled={loading}
                    onClick={() => handleVerifyAttachment(selectedAttachment.id)}
                  >
                    Approve
                  </button>

                  <div>
                    <label className="block text-sm font-medium mb-1">Rejection Reason (if rejected)</label>
                    <textarea
                      className="w-full border rounded p-2 text-xs"
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why document was rejected..."
                    />
                  </div>

                  <button
                    className="w-full bg-red-600 text-white px-4 py-2 rounded text-sm font-medium disabled:bg-gray-400"
                    disabled={loading || !rejectionReason.trim()}
                    onClick={() => handleRejectAttachment(selectedAttachment.id)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
