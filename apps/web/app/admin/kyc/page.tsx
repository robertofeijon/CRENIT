"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function AdminKycPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
      return;
    }
    if (!loading && user && role !== 'ADMIN') {
      router.replace('/auth');
      return;
    }
  }, [loading, user, role, router]);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      loadQueue();
    }
  }, [user, role]);

  const loadQueue = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/kyc/pending?status=PENDING&limit=20');
      setSubmissions(res.data.data.submissions || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load KYC submissions.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">KYC review queue</h1>
          <p className="mt-3 text-sm text-slate-600">Review pending submissions and approve or reject tenant KYC verifications.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {isLoading ? (
            <p className="text-sm text-slate-600">Loading submissions...</p>
          ) : submissions.length ? (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div key={submission.user_id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{submission.user_name}</p>
                      <p className="text-sm text-slate-600">{submission.user_email}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                      {submission.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">Submitted: {new Date(submission.submitted_at).toLocaleString()}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {submission.documents.map((doc: any) => (
                      <div key={`${doc.type}-${doc.file_name}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="font-semibold text-slate-900">{doc.file_name}</p>
                        <p className="mt-1 text-sm text-slate-500">Type: {doc.type}</p>
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700">
                          View document
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No pending KYC submissions right now.</p>
          )}
        </div>
      </div>
    </main>
  );
}
