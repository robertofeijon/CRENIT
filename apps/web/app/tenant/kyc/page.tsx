"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(',')[1] ?? '';
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function TenantKycPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [statusData, setStatusData] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const role = useMemo(() => {
    if (!user) return null;
    return (user.user_metadata as any)?.role?.toString().toUpperCase() ?? null;
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
      return;
    }

    if (!loading && user && role === 'LANDLORD') {
      router.replace('/landlord');
      return;
    }
  }, [loading, user, role, router]);

  useEffect(() => {
    if (!user || role === 'LANDLORD') return;
    loadStatus();
  }, [user, role]);

  const loadStatus = async () => {
    setError(null);
    try {
      const response = await api.get('/kyc/status');
      setStatusData(response.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load KYC status.');
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSuccess(null);
    setError(null);
    setSelectedFile(event.target.files?.[0] ?? null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      setError('Please select a file before uploading.');
      return;
    }

    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      const base64 = await readFileAsBase64(selectedFile);
      await api.post('/kyc/upload', {
        tenantId: user.id,
        filename: selectedFile.name,
        fileBase64: base64,
      });
      setSuccess('Document uploaded. KYC status is now pending review.');
      setSelectedFile(null);
      await loadStatus();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-slate-50 p-8">Loading account...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">KYC center</p>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Verify your tenant account</h1>
              <p className="mt-2 text-sm text-slate-600">
                Upload a proof of income or verification document so your account can move to approved status.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">KYC status</h2>
            <p className="mt-2 text-sm text-slate-500">Current verification state for your profile.</p>
            <div className="mt-6 space-y-4 rounded-3xl bg-slate-50 p-5">
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {statusData?.profile?.kyc_status ?? 'NOT_SUBMITTED'}
                </p>
              </div>
              {statusData?.documents?.length ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">Uploaded documents</p>
                  {statusData.documents.map((doc: any) => (
                    <div key={`${doc.storage_path}-${doc.uploaded_at}`} className="rounded-2xl bg-white p-4 border border-slate-200">
                      <p className="font-semibold text-slate-900">{doc.file_name}</p>
                      <p className="mt-1 text-sm text-slate-600">Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No documents uploaded yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Submit a document</h2>
            <p className="mt-2 text-sm text-slate-500">Upload proof of income or ID to move your account forward.</p>
            <div className="mt-6 space-y-4 rounded-3xl bg-slate-50 p-5">
              <label className="block text-sm font-medium text-slate-700">Select document</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="mt-2 block w-full text-sm text-slate-700"
              />
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? 'Uploading...' : 'Upload document'}
              </button>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {success ? <p className="text-sm text-slate-700">{success}</p> : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
