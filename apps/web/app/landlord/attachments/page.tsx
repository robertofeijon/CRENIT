"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../src/contexts/AuthContext';
import api from '../../../src/lib/api';

interface Attachment {
  id: string;
  attachment_type: string;
  file_name: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  uploaded_at: string;
  rejection_reason?: string;
}

interface ServiceRequest {
  id: string;
  request_type: string;
  status: string;
  description?: string;
  fee_amount: number;
  created_at: string;
  assigned_admin_id?: string;
}

export default function AttachmentsPage() {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] = useState('PROPERTY_PROOF');
  const [description, setDescription] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'attachments' | 'requests'>('attachments');

  useEffect(() => {
    if (user) {
      loadAttachments();
      loadProperties();
      loadRequests();
    }
  }, [user]);

  const loadAttachments = async () => {
    try {
      const res = await api.get(`/landlords/${user?.id}/attachments`);
      setAttachments(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load attachments', err);
    }
  };

  const loadProperties = async () => {
    try {
      const res = await api.get(`/landlords/properties`);
      setProperties(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load properties', err);
    }
  };

  const loadRequests = async () => {
    try {
      const res = await api.get(`/landlords/${user?.id}/attachments/requests`);
      setRequests(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load requests', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Please select a file');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('attachment_type', attachmentType);
      if (description) formData.append('description', description);
      if (propertyId) formData.append('property_id', propertyId);

      const res = await api.post(`/landlords/${user?.id}/attachments/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        setMessage('File uploaded successfully');
        setSelectedFile(null);
        setDescription('');
        setPropertyId('');
        loadAttachments();
      }
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestService = async (requestType: string) => {
    setLoading(true);
    try {
      const res = await api.post(`/landlords/${user?.id}/attachments/request-service`, {
        request_type: requestType,
        property_id: propertyId || null,
        description: description || `Requesting ${requestType.toLowerCase()}`,
        fee_amount: requestType === 'FULL_ONBOARDING' ? 299 : requestType === 'UPLOAD_DOCUMENTS' ? 99 : 50,
      });

      if (res.data?.success) {
        setMessage('Service request submitted successfully');
        setDescription('');
        setPropertyId('');
        loadRequests();
      }
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const res = await api.post(`/landlords/${user?.id}/attachments/requests/${requestId}/cancel`);
      if (res.data?.success) {
        setMessage('Request cancelled');
        loadRequests();
      }
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Cancel failed');
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
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-semibold mb-6">Property Attachments & Service Requests</h1>

      {message && (
        <div className="mb-4 p-4 rounded bg-green-50 text-green-800 border border-green-200">
          {message}
        </div>
      )}

      <div className="flex gap-4 mb-6 border-b">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'attachments' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'} `}
          onClick={() => setActiveTab('attachments')}
        >
          Attachments
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'requests' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'} `}
          onClick={() => setActiveTab('requests')}
        >
          Service Requests
        </button>
      </div>

      {activeTab === 'attachments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Form */}
          <div className="border rounded-lg p-6 bg-white shadow">
            <h2 className="text-xl font-semibold mb-4">Upload Document</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Document Type</label>
                <select
                  className="w-full border rounded p-2"
                  value={attachmentType}
                  onChange={(e) => setAttachmentType(e.target.value)}
                >
                  <option value="PROPERTY_PROOF">Proof of Property Ownership</option>
                  <option value="LEASE_AGREEMENT">Lease Agreement Template</option>
                  <option value="OWNERSHIP_DOCUMENT">Ownership Document</option>
                  <option value="OTHER">Other Document</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Property (Optional)</label>
                <select className="w-full border rounded p-2" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                  <option value="">-- Select a property --</option>
                  {properties.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.property_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">File</label>
                <input type="file" className="w-full border rounded p-2" onChange={handleFileChange} />
                {selectedFile && <p className="text-sm text-gray-600 mt-1">{selectedFile.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  className="w-full border rounded p-2 text-sm"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <button
                className="w-full bg-blue-600 text-white p-2 rounded font-medium disabled:bg-gray-400"
                disabled={loading || !selectedFile}
                onClick={handleUpload}
              >
                {loading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>

          {/* Attachments List */}
          <div className="border rounded-lg p-6 bg-white shadow">
            <h2 className="text-xl font-semibold mb-4">Your Attachments</h2>
            <div className="space-y-3">
              {attachments.length === 0 ? (
                <p className="text-gray-500">No attachments yet.</p>
              ) : (
                attachments.map((att) => (
                  <div key={att.id} className="p-4 border rounded bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{att.file_name}</p>
                        <p className="text-sm text-gray-600">{att.attachment_type.replace(/_/g, ' ')}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(att.status)}`}>{att.status}</span>
                    </div>
                    <p className="text-xs text-gray-500">{new Date(att.uploaded_at).toLocaleDateString()}</p>
                    {att.rejection_reason && <p className="text-xs text-red-600 mt-1">Reason: {att.rejection_reason}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Service Form */}
          <div className="border rounded-lg p-6 bg-white shadow">
            <h2 className="text-xl font-semibold mb-4">Request Assistance</h2>
            <p className="text-sm text-gray-600 mb-4">Let us help you upload and verify your property documents.</p>
            <div className="space-y-3">
              <button
                className="w-full border-2 border-gray-300 p-4 rounded text-left hover:bg-gray-50 transition"
                onClick={() => handleRequestService('UPLOAD_DOCUMENTS')}
                disabled={loading}
              >
                <p className="font-medium">Upload Documents ($99)</p>
                <p className="text-xs text-gray-600">We'll upload your documents for you</p>
              </button>
              <button
                className="w-full border-2 border-gray-300 p-4 rounded text-left hover:bg-gray-50 transition"
                onClick={() => handleRequestService('VERIFY_DOCUMENTS')}
                disabled={loading}
              >
                <p className="font-medium">Verify Documents ($50)</p>
                <p className="text-xs text-gray-600">We'll verify existing documents with authorities</p>
              </button>
              <button
                className="w-full border-2 border-gray-300 p-4 rounded text-left hover:bg-gray-50 transition"
                onClick={() => handleRequestService('FULL_ONBOARDING')}
                disabled={loading}
              >
                <p className="font-medium">Full Onboarding ($299)</p>
                <p className="text-xs text-gray-600">Complete property & document setup</p>
              </button>
            </div>
          </div>

          {/* Requests List */}
          <div className="border rounded-lg p-6 bg-white shadow">
            <h2 className="text-xl font-semibold mb-4">Your Service Requests</h2>
            <div className="space-y-3">
              {requests.length === 0 ? (
                <p className="text-gray-500">No service requests yet.</p>
              ) : (
                requests.map((req) => (
                  <div key={req.id} className="p-4 border rounded bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{req.request_type.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-600">${req.fee_amount}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(req.status)}`}>{req.status}</span>
                    </div>
                    <p className="text-xs text-gray-500">{new Date(req.created_at).toLocaleDateString()}</p>
                    {(req.status === 'PENDING' || req.status === 'ACCEPTED') && (
                      <button
                        className="mt-2 text-xs text-red-600 hover:text-red-800 font-medium"
                        onClick={() => handleCancelRequest(req.id)}
                      >
                        Cancel Request
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
