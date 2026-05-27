'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';

export default function AdminCompliancePage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteInputByUser, setDeleteInputByUser] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  const searchUsers = async () => {
    setLoadingRows(true);
    try {
      const res = await api.get('/admin/compliance/search-users', { params: { q: query, limit: 25 } });
      setRows(res.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to search users.');
    } finally {
      setLoadingRows(false);
    }
  };

  const exportData = async (userId: string) => {
    try {
      const res = await api.post(`/admin/compliance/${userId}/export`);
      const payload = JSON.stringify(res.data?.data || {}, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gdpr-export-${userId}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage('User data export generated.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to export user data.');
    }
  };

  const deleteAccount = async (user: any) => {
    const typed = deleteInputByUser[user.id] || '';
    if (typed !== user.full_name) {
      setError('Type the exact user name to confirm deletion.');
      return;
    }
    try {
      await api.post(`/admin/compliance/${user.id}/delete`, {
        confirmation_text: typed,
        expected_name: user.full_name,
      });
      setMessage('User anonymised for GDPR deletion request.');
      await searchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to anonymise account.');
    }
  };

  if (loading || !user) return <p className="text-sm text-gray-500">Loading data...</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Compliance / GDPR tooling</h1>
      {error ? <ErrorStateCard message={error} onRetry={searchUsers} /> : null}
      {message ? <p className="mb-3 text-sm text-emerald-700">{message}</p> : null}
      <div className="mb-4 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="w-full max-w-xl rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="button" onClick={searchUsers} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Search users
        </button>
      </div>
      <div className="space-y-3">
        {loadingRows ? <SkeletonBlocks rows={3} /> : null}
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="font-semibold text-gray-900">{row.full_name}</p>
            <p className="text-xs text-gray-600">{row.email} · {row.role}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => exportData(row.id)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold"
              >
                Export Data
              </button>
              <input
                value={deleteInputByUser[row.id] || ''}
                onChange={(e) => setDeleteInputByUser((prev) => ({ ...prev, [row.id]: e.target.value }))}
                placeholder={`Type "${row.full_name}" to confirm`}
                className="min-w-[220px] rounded-md border border-gray-300 px-3 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={() => deleteAccount(row)}
                className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Delete Account (Anonymise)
              </button>
            </div>
          </div>
        ))}
        {!loadingRows && !rows.length ? (
          <EmptyStateCard title="No users loaded" description="Search by name or email to perform GDPR export or anonymisation." />
        ) : null}
      </div>
    </div>
  );
}
