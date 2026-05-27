"use client";

import { useState } from 'react';
import api from '../../../src/lib/api';
import { supabase } from '../../../src/lib/supabaseClient';

export default function LandlordOnboardingPage() {
  const [form, setForm] = useState({
    full_legal_name: '',
    business_name: '',
    registration_number: '',
    phone_number: '',
    id_document_path: '',
    ownership_document_path: '',
    properties_intended: '1',
    tenants_estimated: '1',
    consent: false,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const uploadDocument = async (file: File, type: 'id' | 'ownership') => {
    const key = `partner-onboarding/${type}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const { error: uploadError } = await supabase.storage.from('kyc-documents').upload(key, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('kyc-documents').getPublicUrl(key);
    return data.publicUrl || key;
  };

  const submit = async () => {
    if (!form.consent) {
      setError('Consent is required.');
      return;
    }
    try {
      await api.post('/landlords/onboarding/submit', {
        ...form,
        properties_intended: Number(form.properties_intended),
        tenants_estimated: Number(form.tenants_estimated),
        consent_text_version: 'v1.0',
      });
      setMessage('Submission received. Your account remains under review until approved.');
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to submit onboarding.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Landlord Partner Onboarding</h1>
        <p className="mt-2 text-sm text-slate-600">Your landlord account is under review. Complete this form to continue.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <input placeholder="Full legal name" value={form.full_legal_name} onChange={(e) => setForm((p) => ({ ...p, full_legal_name: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Business name (optional)" value={form.business_name} onChange={(e) => setForm((p) => ({ ...p, business_name: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Namibian ID / company reg number" value={form.registration_number} onChange={(e) => setForm((p) => ({ ...p, registration_number: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Phone number" value={form.phone_number} onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <div>
            <input placeholder="Proof of identity upload path" value={form.id_document_path} onChange={(e) => setForm((p) => ({ ...p, id_document_path: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input
              type="file"
              className="mt-2 w-full text-xs"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setUploading(true);
                  const url = await uploadDocument(file, 'id');
                  setForm((p) => ({ ...p, id_document_path: url }));
                } catch {
                  setError('Unable to upload identity document.');
                } finally {
                  setUploading(false);
                }
              }}
            />
          </div>
          <div>
            <input placeholder="Proof of ownership upload path" value={form.ownership_document_path} onChange={(e) => setForm((p) => ({ ...p, ownership_document_path: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input
              type="file"
              className="mt-2 w-full text-xs"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setUploading(true);
                  const url = await uploadDocument(file, 'ownership');
                  setForm((p) => ({ ...p, ownership_document_path: url }));
                } catch {
                  setError('Unable to upload ownership document.');
                } finally {
                  setUploading(false);
                }
              }}
            />
          </div>
          <input type="number" placeholder="Properties intended" value={form.properties_intended} onChange={(e) => setForm((p) => ({ ...p, properties_intended: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" placeholder="Estimated tenants" value={form.tenants_estimated} onChange={(e) => setForm((p) => ({ ...p, tenants_estimated: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.consent} onChange={(e) => setForm((p) => ({ ...p, consent: e.target.checked }))} />
          I consent to anonymised, aggregated transaction data from my properties being used by RentCredit for market intelligence purposes.
        </label>
        <button onClick={submit} disabled={uploading} className="mt-4 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {uploading ? 'Uploading file...' : 'Submit for review'}
        </button>
        {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      </div>
    </main>
  );
}
