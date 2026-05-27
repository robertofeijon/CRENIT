"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';

export default function AdminAuditPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role !== 'ADMIN') router.replace('/auth');
  }, [loading, user, role, router]);

  useEffect(() => {
    if (user && role === 'ADMIN') {
      setIsLoading(true);
      api
        .get('/admin/audit-log?limit=50')
        .then((res) => setLogs(res.data.data.logs || []))
        .catch((err: any) => setError(err?.response?.data?.message || err?.message || 'Unable to load audit log.'))
        .finally(() => setIsLoading(false));
    }
  }, [user, role]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-slate-900">Audit log</h1>
      <p className="mt-3 text-sm text-slate-600">Admin actions recorded for compliance review.</p>
      {error ? <div className="mt-4"><ErrorStateCard message={error} onRetry={() => router.refresh()} /></div> : null}
      {isLoading ? (
        <div className="mt-6">
          <SkeletonBlocks rows={4} />
        </div>
      ) : logs.length ? (
        <div className="mt-6 space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-900">{log.action}</p>
              <p className="mt-1 text-slate-600">Admin: {log.admin_name} → Target: {log.target_name || '—'}</p>
              <p className="mt-1 text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyStateCard title="No audit entries yet" description="Admin actions will appear here once recorded." />
        </div>
      )}
    </div>
  );
}
