'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, FileCheck, ShieldCheck } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import { statusPillClass } from '../../components/tenant/tenantUi';
import KycDocumentUploadField from '../../components/kyc/KycDocumentUploadField';

type KycDocType = 'government_id' | 'selfie' | 'income_proof' | 'signed_lease';

type KycDocumentRow = {
  type: KycDocType;
  file_name: string;
  uploaded_at: string;
  status: string;
  needs_reupload: boolean;
};

const REQUIRED_DOCS: Array<{ type: KycDocType; label: string; hint: string; selfie?: boolean; idPhoto?: boolean }> = [
  { type: 'government_id', label: 'Government ID', hint: 'National ID or passport (front)', idPhoto: true },
  { type: 'selfie', label: 'Selfie', hint: 'Clear photo of your face', selfie: true },
  { type: 'income_proof', label: 'Proof of income', hint: 'Payslip, employer letter, or bank statement' },
  { type: 'signed_lease', label: 'Signed lease agreement', hint: 'Fully signed copy of your current lease' },
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
  const { user, role, loading, roleReady } = useAuth();
  const router = useRouter();
  const [statusData, setStatusData] = useState<{
    profile?: {
      kyc_status?: string;
      kyc_rejection_reason?: string;
      national_id_number?: string;
      first_name?: string;
      surname?: string;
      account_flagged?: boolean;
      account_flag_note?: string;
    };
    documents?: KycDocumentRow[];
    rejected_doc_types?: KycDocType[];
  } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Partial<Record<KycDocType, File>>>({});
  const [uploadingType, setUploadingType] = useState<KycDocType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [marketDataConsent, setMarketDataConsent] = useState(false);
  const [idNumber, setIdNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [savingIdentity, setSavingIdentity] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const response = await api.get('/kyc/status');
      const data = response.data.data;
      setStatusData(data);
      if (data?.profile) {
        setIdNumber(data.profile.national_id_number || '');
        setFirstName(data.profile.first_name || '');
        setSurname(data.profile.surname || '');
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Unable to load KYC status.');
    }
  }, []);

  useEffect(() => {
    if (!loading && roleReady && !user) router.replace('/auth');
    if (!loading && roleReady && user && role === 'LANDLORD') router.replace('/landlord/overview');
  }, [loading, roleReady, user, role, router]);

  useEffect(() => {
    if (user && role !== 'LANDLORD') void loadStatus();
  }, [user, role, loadStatus]);

  const kycStatus = statusData?.profile?.kyc_status ?? 'NOT_SUBMITTED';

  useEffect(() => {
    if (!user || role === 'LANDLORD' || isKycApproved(kycStatus)) return;
    const interval = setInterval(() => {
      void loadStatus();
    }, 8000);
    return () => clearInterval(interval);
  }, [user, role, kycStatus, loadStatus]);

  const docByType = useMemo(() => {
    const map = new Map<KycDocType, KycDocumentRow>();
    for (const doc of statusData?.documents ?? []) {
      map.set(doc.type, doc);
    }
    return map;
  }, [statusData?.documents]);

  const identityComplete = Boolean(idNumber.trim() && firstName.trim() && surname.trim());

  const saveIdentity = async () => {
    if (!identityComplete) {
      setError('Enter your ID number, name, and surname before uploading documents.');
      return;
    }
    setSavingIdentity(true);
    setError(null);
    try {
      await api.put('/kyc/identity', {
        national_id_number: idNumber.trim(),
        first_name: firstName.trim(),
        surname: surname.trim(),
      });
      setSuccess('Your details were saved.');
      await loadStatus();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Unable to save your details.');
    } finally {
      setSavingIdentity(false);
    }
  };

  const uploadOne = async (docType: KycDocType, file: File) => {
    if (!user) return;
    if (!identityComplete) {
      setError('Save your ID number, name, and surname first.');
      return;
    }
    if (!marketDataConsent) {
      setError('Please agree to anonymised market analysis data use before uploading.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Each file must be 8 MB or smaller.');
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
      setSuccess(`${REQUIRED_DOCS.find((d) => d.type === docType)?.label}: ${file.name}`);
      setPendingFiles((prev) => {
        const next = { ...prev };
        delete next[docType];
        return next;
      });
      await loadStatus();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Unable to upload document.');
    } finally {
      setUploadingType(null);
    }
  };

  const handleFileSelect = (docType: KycDocType, file: File) => {
    setError(null);
    setSuccess(null);
    setPendingFiles((prev) => ({ ...prev, [docType]: file }));
    void uploadOne(docType, file);
  };

  if (loading || !roleReady || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6]">
        <p className="text-sm text-slate-500">Loading verification…</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F3F4F6]">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <div className="tenant-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#C0392B]/90">Verification</p>
          <h1 className="mt-3 text-3xl font-semibold text-[#1A1A1A]">Verify your tenant account</h1>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Enter your details, then upload each document. The file name is shown after you choose a file. An admin
            reviews everything before payments and reports unlock.
          </p>
          <p className="mt-4">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusPillClass(kycStatus)}`}>
              Status: {kycStatus}
            </span>
          </p>

          {statusData?.profile?.account_flagged ? (
            <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Account flagged for review</p>
                <p className="mt-1">{statusData.profile.account_flag_note || 'Please contact support if you have questions.'}</p>
              </div>
            </div>
          ) : null}

          {isKycApproved(kycStatus) ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex gap-3">
                <ShieldCheck className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
                <div>
                  <p className="font-semibold text-emerald-900">You are verified</p>
                  <p className="mt-1 text-sm text-emerald-800">
                    Full access is unlocked — payments, credit score, and reports.
                  </p>
                  <button type="button" onClick={() => router.push('/tenant/home')} className="tenant-btn-primary mt-4">
                    Go to dashboard
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {kycStatus === 'REJECTED' && statusData?.profile?.kyc_rejection_reason ? (
            <div className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Submission rejected</p>
                <p className="mt-1">{statusData.profile.kyc_rejection_reason}</p>
                <p className="mt-2 text-red-800">Re-upload the documents marked below.</p>
              </div>
            </div>
          ) : null}

          {kycStatus === 'PENDING' ? (
            <p className="mt-4 text-sm text-amber-800">
              Under admin review — this page refreshes automatically. You will receive an email when a decision is made.
            </p>
          ) : null}
        </div>

        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
        {success ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p>
        ) : null}

        {!isKycApproved(kycStatus) ? (
          <>
            <section className="tenant-panel space-y-4">
              <h2 className="text-lg font-semibold text-[#1A1A1A]">My info</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700">ID number</span>
                  <input
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                    placeholder="National ID number"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Name</span>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                    placeholder="First name"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Surname</span>
                  <input
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                    placeholder="Surname"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={savingIdentity || !identityComplete}
                onClick={() => void saveIdentity()}
                className="tenant-btn-primary disabled:opacity-50"
              >
                {savingIdentity ? 'Saving…' : 'Save my details'}
              </button>
            </section>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <input type="checkbox" checked={marketDataConsent} onChange={(e) => setMarketDataConsent(e.target.checked)} className="mt-1" />
              <span>
                I agree that anonymised income and payment behaviour data may be used for aggregate rental market
                analysis.
              </span>
            </label>
          </>
        ) : null}

        <div className="space-y-4">
          {REQUIRED_DOCS.map((doc) => {
            const existing = docByType.get(doc.type);
            const approved =
              isKycApproved(kycStatus) || (existing?.status === 'APPROVED' && kycStatus !== 'REJECTED');
            const needsReupload = Boolean(existing?.needs_reupload) || (kycStatus === 'REJECTED' && !approved);
            const uploaded = Boolean(existing) && !needsReupload && kycStatus !== 'REJECTED';
            const locked = isKycApproved(kycStatus) || (kycStatus === 'PENDING' && uploaded && !needsReupload);
            const displayFileName = pendingFiles[doc.type]?.name ?? existing?.file_name;

            return (
              <section key={doc.type} className="tenant-panel">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-[#C0392B]" aria-hidden />
                      <h2 className="text-lg font-semibold text-[#1A1A1A]">{doc.label}</h2>
                      {uploaded ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden /> : null}
                      {needsReupload ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                          Re-upload required
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{doc.hint}</p>
                    {displayFileName ? (
                      <p className="mt-2 text-sm font-medium text-[#1A1A1A]">File: {displayFileName}</p>
                    ) : null}
                  </div>
                  {!locked ? (
                    <div className="sm:w-72">
                      <KycDocumentUploadField
                        label={doc.label}
                        hint={doc.hint}
                        disabled={!marketDataConsent || !identityComplete}
                        uploading={uploadingType === doc.type}
                        fileName={displayFileName}
                        selfieMode={doc.selfie}
                        documentCameraMode={doc.idPhoto}
                        onFileSelect={(file) => handleFileSelect(doc.type, file)}
                      />
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
