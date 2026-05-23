"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

type KycDocType = 'government_id' | 'selfie' | 'income_proof' | 'address_proof';

type KycDocumentRow = {
  type: string;
  file_name: string;
  uploaded_at: string;
};

const REQUIRED_DOCS: Array<{ type: KycDocType; label: string; hint: string }> = [
  { type: 'government_id', label: 'Government ID', hint: 'National ID or passport (front)' },
  { type: 'selfie', label: 'Selfie', hint: 'Clear photo of your face holding ID' },
  { type: 'income_proof', label: 'Proof of income', hint: 'Payslip, employer letter, or bank statement' },
  { type: 'address_proof', label: 'Proof of address', hint: 'Utility bill or bank statement (last 3 months)' },
];

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

const isKycApproved = (status?: string) => status === 'APPROVED' || status === 'VERIFIED';

export default function TenantKycPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [statusData, setStatusData] = useState<{ profile?: { kyc_status?: string; kyc_rejection_reason?: string }; documents?: KycDocumentRow[] } | null>(null);
  const [files, setFiles] = useState<Partial<Record<KycDocType, File>>>({});
  const [uploadingType, setUploadingType] = useState<KycDocType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [marketDataConsent, setMarketDataConsent] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
      return;
    }
    if (!loading && user && role === 'LANDLORD') {
      router.replace('/landlord');
    }
  }, [loading, user, role, router]);

  useEffect(() => {
    if (user && role !== 'LANDLORD') {
      loadStatus();
    }
  }, [user, role]);

  const loadStatus = async () => {
    setError(null);
    try {
      const response = await api.get('/kyc/status');
      setStatusData(response.data.data);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Unable to load KYC status.');
    }
  };

  const uploadedTypes = useMemo(() => {
    const docs = statusData?.documents ?? [];
    const types = new Set<string>();
    for (const doc of docs) {
      if (doc.type === 'NATIONAL_ID_FRONT') types.add('government_id');
      if (doc.type === 'SELFIE') types.add('selfie');
      if (doc.type === 'PROOF_OF_INCOME') types.add('income_proof');
      if (doc.type === 'BANK_STATEMENT') types.add('address_proof');
    }
    return types;
  }, [statusData?.documents]);

  const handleFilePick = (docType: KycDocType, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError('Each file must be 8 MB or smaller.');
      return;
    }
    setError(null);
    setSuccess(null);
    setFiles((prev) => ({ ...prev, [docType]: file }));
  };

  const uploadOne = async (docType: KycDocType) => {
    const file = files[docType];
    if (!file || !user) {
      setError(`Choose a file for ${REQUIRED_DOCS.find((d) => d.type === docType)?.label ?? docType} first.`);
      return;
    }
    if (!marketDataConsent) {
      setError('Please agree to anonymised market analysis data use before uploading documents.');
      return;
    }

    setUploadingType(docType);
    setError(null);
    setSuccess(null);

    try {
      const base64 = await readFileAsBase64(file);
      await api.post('/consent/market-intelligence', { consent_type: 'TENANT_MARKET_DATA' });
      await api.post('/kyc/upload', {
        tenantId: user.id,
        doc_type: docType,
        filename: file.name,
        fileBase64: base64,
      });
      setSuccess(`${REQUIRED_DOCS.find((d) => d.type === docType)?.label} uploaded.`);
      setFiles((prev) => {
        const next = { ...prev };
        delete next[docType];
        return next;
      });
      await loadStatus();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Upload failed.');
    } finally {
      setUploadingType(null);
    }
  };

  const handleSubmitAll = async () => {
    if (!user) return;

    const missing = REQUIRED_DOCS.filter((doc) => !uploadedTypes.has(doc.type) && !files[doc.type]);
    if (missing.length) {
      setError(`Upload these documents first: ${missing.map((d) => d.label).join(', ')}`);
      return;
    }
    if (!marketDataConsent) {
      setError('Please agree to anonymised market analysis data use before submitting.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      for (const doc of REQUIRED_DOCS) {
        if (uploadedTypes.has(doc.type) || !files[doc.type]) continue;
        const base64 = await readFileAsBase64(files[doc.type]!);
        await api.post('/kyc/upload', {
          tenantId: user.id,
          doc_type: doc.type,
          filename: files[doc.type]!.name,
          fileBase64: base64,
        });
      }
      setSuccess('All documents submitted. Your KYC is pending admin review.');
      setFiles({});
      await loadStatus();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const kycStatus = statusData?.profile?.kyc_status ?? 'NOT_SUBMITTED';
  const allUploaded = REQUIRED_DOCS.every((doc) => uploadedTypes.has(doc.type));

  if (loading || !user) {
    return <div className="min-h-screen bg-slate-50 p-8">Loading account...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">KYC center</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Verify your tenant account</h1>
          <p className="mt-2 text-sm text-slate-600">
            Upload all four documents below. An admin will review them before you can use payments and reports.
          </p>
          <div className="mt-6 inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800">
            Status: {kycStatus}
            {isKycApproved(kycStatus) ? ' ✓' : ''}
          </div>
          {statusData?.profile?.kyc_rejection_reason ? (
            <p className="mt-3 text-sm text-red-600">Rejection reason: {statusData.profile.kyc_rejection_reason}</p>
          ) : null}
          {isKycApproved(kycStatus) ? (
            <button
              type="button"
              onClick={() => router.push('/tenant/home')}
              className="mt-6 rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white"
            >
              Go to dashboard
            </button>
          ) : null}
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

        {!isKycApproved(kycStatus) ? (
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={marketDataConsent}
              onChange={(e) => setMarketDataConsent(e.target.checked)}
              className="mt-1"
            />
            <span>
              I agree that anonymised income and payment behaviour data may be used for aggregate Namibian rental market
              analysis. Individual records are never sold.
            </span>
          </label>
        ) : null}

        <div className="grid gap-4">
          {REQUIRED_DOCS.map((doc) => {
            const done = uploadedTypes.has(doc.type);
            const pendingFile = files[doc.type];
            return (
              <section key={doc.type} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {doc.label} {done ? <span className="text-emerald-600">✓</span> : null}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">{doc.hint}</p>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-72">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      disabled={done || isKycApproved(kycStatus)}
                      onChange={(e) => handleFilePick(doc.type, e)}
                      className="text-sm text-slate-700"
                    />
                    {!done && !isKycApproved(kycStatus) ? (
                      <button
                        type="button"
                        onClick={() => uploadOne(doc.type)}
                        disabled={!pendingFile || uploadingType === doc.type}
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {uploadingType === doc.type ? 'Uploading…' : pendingFile ? 'Upload' : 'Select file first'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {!isKycApproved(kycStatus) && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="text-sm text-slate-600">
              {allUploaded
                ? 'All documents uploaded — waiting for admin approval.'
                : `${uploadedTypes.size} of ${REQUIRED_DOCS.length} documents uploaded`}
            </p>
            {!allUploaded && Object.keys(files).length > 0 ? (
              <button
                type="button"
                onClick={handleSubmitAll}
                disabled={submitting}
                className="mt-4 rounded-full bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Upload remaining documents'}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
