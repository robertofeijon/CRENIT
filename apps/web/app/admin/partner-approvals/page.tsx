"use client";

import { useEffect, useState } from 'react';
import api from '../../../src/lib/api';

export default function AdminPartnerApprovalsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [reason, setReason] = useState('');

  const load = async () => {
    const res = await api.get('/admin/partner-approvals');
    setRows(res.data?.data?.rows || []);
  };

  useEffect(() => {
    load().catch(() => setRows([]));
  }, []);

  const review = async (action: 'APPROVE' | 'REJECT') => {
    if (!selected) return;
    await api.post(`/admin/partner-approvals/${selected.id}/review`, { action, reason: reason || undefined });
    setSelected(null);
    setReason('');
    await load();
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Partner approvals</h1>
          <div className="mt-4 space-y-3">
            {rows.map((row) => (
              <button key={row.id} onClick={() => setSelected(row)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
                <p className="font-semibold text-slate-900">{row.landlord_name}</p>
                <p className="text-sm text-slate-600">
                  Submitted {new Date(row.submitted_at).toLocaleDateString()} · Properties {row.properties_intended} · {row.status}
                </p>
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Review panel</h2>
          {!selected ? <p className="mt-3 text-sm text-slate-500">Select a submission to review.</p> : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-slate-700">Landlord: {selected.landlord_name}</p>
              <a href={selected.id_document_path} target="_blank" className="block text-sm text-blue-700 underline" rel="noreferrer">Open identity document</a>
              <a href={selected.ownership_document_path} target="_blank" className="block text-sm text-blue-700 underline" rel="noreferrer">Open ownership document</a>
              <div className="grid gap-2 sm:grid-cols-2">
                <iframe src={selected.id_document_path} className="h-44 w-full rounded-lg border border-slate-200 bg-white" title="Identity document preview" />
                <iframe src={selected.ownership_document_path} className="h-44 w-full rounded-lg border border-slate-200 bg-white" title="Ownership document preview" />
              </div>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rejection reason" className="min-h-[100px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <button onClick={() => review('APPROVE')} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Approve</button>
                <button onClick={() => review('REJECT')} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white">Reject</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
