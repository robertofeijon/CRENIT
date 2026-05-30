'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import LandlordPageHeader from '../../components/ui/LandlordPageHeader';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import KycDocumentUploadField from '../../components/kyc/KycDocumentUploadField';
import { landlordInputClass } from '../../components/landlord/landlordUi';

type UploadField = 'id' | 'ownership';

const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function LandlordOnboardingPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
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
  const [onboardingStatus, setOnboardingStatus] = useState<{
    submission?: { status?: string; rejection_reason?: string | null };
    partner_approval_status?: string;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<UploadField | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idFileName, setIdFileName] = useState<string | null>(null);
  const [ownershipFileName, setOwnershipFileName] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await api.get('/landlords/onboarding/status');
      setOnboardingStatus(res.data?.data ?? null);
    } catch {
      setOnboardingStatus(null);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role && role !== 'LANDLORD' && role !== 'ADMIN') router.replace('/tenant/home');
  }, [loading, user, role, router]);

  useEffect(() => {
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) void loadStatus();
  }, [user, role, loadStatus]);

  const partnerStatus = onboardingStatus?.partner_approval_status ?? onboardingStatus?.submission?.status;
  const isApproved = partnerStatus === 'APPROVED';
  const isRejected = partnerStatus === 'REJECTED';
  const isPending = partnerStatus === 'PENDING_APPROVAL' && Boolean(onboardingStatus?.submission);

  useEffect(() => {
    if (!user || role !== 'LANDLORD' || isApproved) return;
    const interval = setInterval(() => void loadStatus(), 8000);
    return () => clearInterval(interval);
  }, [user, role, isApproved, loadStatus]);

  const uploadDocument = async (file: File, type: UploadField) => {
    setUploading(type);
    setError(null);
    try {
      const base64 = await readFileAsBase64(file);
      const res = await api.post('/landlords/onboarding/upload', {
        doc_type: type,
        filename: file.name,
        fileBase64: base64,
      });
      const url = res.data?.data?.public_url as string;
      if (type === 'id') {
        setForm((p) => ({ ...p, id_document_path: url }));
        setIdFileName(file.name);
      } else {
        setForm((p) => ({ ...p, ownership_document_path: url }));
        setOwnershipFileName(file.name);
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || `Unable to upload ${type} document.`);
    } finally {
      setUploading(null);
    }
  };

  const submit = async () => {
    if (!form.consent) {
      setError('Consent is required.');
      return;
    }
    if (!form.id_document_path || !form.ownership_document_path) {
      setError('Upload both identity and ownership documents first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/landlords/onboarding/submit', {
        ...form,
        properties_intended: Number(form.properties_intended),
        tenants_estimated: Number(form.tenants_estimated),
        consent_text_version: 'v1.0',
      });
      setMessage('Submission received. You will receive an email when an admin reviews your documents.');
      await loadStatus();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Unable to submit onboarding.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <p className="text-sm text-slate-500">Loading partner workspace…</p>;
  }

  return (
    <div className="space-y-6">
      <LandlordPageHeader
        badge="Onboarding"
        title="Partner onboarding"
        subtitle="Upload verification documents for admin review. Uses the same secure upload pipeline as tenant KYC."
      />

      {isApproved ? (
        <div className="landlord-panel border-emerald-200 bg-emerald-50">
          <div className="flex gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-600" aria-hidden />
            <div>
              <p className="font-semibold text-emerald-900">Partner account approved</p>
              <p className="mt-1 text-sm text-emerald-800">Full landlord dashboard access is unlocked.</p>
              <button type="button" onClick={() => router.push('/landlord/overview')} className="landlord-btn-primary mt-4">
                Go to dashboard
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isRejected ? (
        <div className="landlord-panel border-red-200 bg-red-50">
          <div className="flex gap-3">
            <AlertCircle className="h-6 w-6 text-red-600" aria-hidden />
            <div>
              <p className="font-semibold text-red-900">Submission rejected</p>
              {onboardingStatus?.submission?.rejection_reason ? (
                <p className="mt-1 text-sm text-red-800">{onboardingStatus.submission.rejection_reason}</p>
              ) : null}
              <p className="mt-2 text-sm text-red-800">Update the documents below and submit again.</p>
            </div>
          </div>
        </div>
      ) : null}

      {isPending ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Under admin review — this page refreshes automatically. You will be emailed when approved or if changes are
          needed.
        </p>
      ) : null}

      {error ? <ErrorStateCard message={error} /> : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {message}
        </p>
      ) : null}

      {!isApproved ? (
        <>
          <section className="landlord-panel">
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Business details</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                placeholder="Full legal name"
                value={form.full_legal_name}
                onChange={(e) => setForm((p) => ({ ...p, full_legal_name: e.target.value }))}
                className={landlordInputClass}
                disabled={isPending}
              />
              <input
                placeholder="Business name (optional)"
                value={form.business_name}
                onChange={(e) => setForm((p) => ({ ...p, business_name: e.target.value }))}
                className={landlordInputClass}
                disabled={isPending}
              />
              <input
                placeholder="National ID / company registration number"
                value={form.registration_number}
                onChange={(e) => setForm((p) => ({ ...p, registration_number: e.target.value }))}
                className={landlordInputClass}
                disabled={isPending}
              />
              <input
                placeholder="Phone number"
                value={form.phone_number}
                onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))}
                className={landlordInputClass}
                disabled={isPending}
              />
              <input
                type="number"
                placeholder="Properties intended"
                value={form.properties_intended}
                onChange={(e) => setForm((p) => ({ ...p, properties_intended: e.target.value }))}
                className={landlordInputClass}
                disabled={isPending}
              />
              <input
                type="number"
                placeholder="Estimated tenants"
                value={form.tenants_estimated}
                onChange={(e) => setForm((p) => ({ ...p, tenants_estimated: e.target.value }))}
                className={landlordInputClass}
                disabled={isPending}
              />
            </div>
          </section>

          <section className="landlord-panel">
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Verification documents</h2>
            <p className="mt-2 text-sm text-slate-600">
              On mobile you can take a photo of your ID. On desktop, upload PDF or image files.
            </p>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Proof of identity</p>
                {form.id_document_path && !isRejected ? (
                  <p className="mb-2 flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> {idFileName || 'Uploaded'}
                  </p>
                ) : null}
                {!isPending || isRejected ? (
                  <KycDocumentUploadField
                    label="Proof of identity"
                    hint="National ID or passport"
                    documentCameraMode
                    uploading={uploading === 'id'}
                    fileName={idFileName}
                    onFileSelect={(file) => void uploadDocument(file, 'id')}
                  />
                ) : null}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Proof of ownership</p>
                {form.ownership_document_path && !isRejected ? (
                  <p className="mb-2 flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> {ownershipFileName || 'Uploaded'}
                  </p>
                ) : null}
                {!isPending || isRejected ? (
                  <KycDocumentUploadField
                    label="Proof of ownership"
                    hint="Title deed, lease agreement, or management mandate"
                    documentCameraMode
                    uploading={uploading === 'ownership'}
                    fileName={ownershipFileName}
                    onFileSelect={(file) => void uploadDocument(file, 'ownership')}
                  />
                ) : null}
              </div>
            </div>
          </section>

          <section className="landlord-panel">
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => setForm((p) => ({ ...p, consent: e.target.checked }))}
                className="mt-1"
                disabled={isPending}
              />
              I consent to anonymised, aggregated transaction data from my properties being used for market intelligence.
            </label>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={uploading !== null || submitting || isPending}
              className="landlord-btn-primary mt-4 inline-flex items-center gap-2 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Submitting…
                </>
              ) : isPending ? (
                'Awaiting review'
              ) : isRejected ? (
                'Resubmit for review'
              ) : (
                'Submit for review'
              )}
            </button>
          </section>
        </>
      ) : null}
    </div>
  );
}
