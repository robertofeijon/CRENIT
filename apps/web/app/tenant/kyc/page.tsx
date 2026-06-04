'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ChevronLeft, ShieldCheck } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import { statusPillClass } from '../../components/tenant/tenantUi';
import KycDocumentUploadField from '../../components/kyc/KycDocumentUploadField';
import KycWizardProgress from '../../components/kyc/KycWizardProgress';

type KycDocType = 'government_id' | 'selfie' | 'income_proof' | 'proof_of_address';

const DOC_CONFIG: Array<{
  type: KycDocType;
  label: string;
  hint: string;
  selfie?: boolean;
  idPhoto?: boolean;
}> = [
  { type: 'government_id', label: 'Government ID', hint: 'National ID or passport (front)', idPhoto: true },
  { type: 'selfie', label: 'Selfie', hint: 'Clear photo of your face', selfie: true },
  { type: 'income_proof', label: 'Proof of income', hint: 'Payslip, employer letter, or bank statement' },
  {
    type: 'proof_of_address',
    label: 'Proof of address',
    hint: 'Utility bill or bank statement (last 3 months)',
  },
];

const RESIDENTIAL_OPTIONS = ['RENTING', 'OWNING', 'LIVING_WITH_FAMILY', 'OTHER'];

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
const isPendingReview = (status?: string) => status === 'PENDING' || status === 'PENDING_REVIEW';

export default function TenantKycPage() {
  const { user, role, loading, roleReady } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [statusData, setStatusData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [marketDataConsent, setMarketDataConsent] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('Namibian');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [email, setEmail] = useState('');

  const [country, setCountry] = useState('Namibia');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [residentialStatus, setResidentialStatus] = useState('RENTING');

  const [docFiles, setDocFiles] = useState<Partial<Record<KycDocType, File>>>({});

  const loadStatus = useCallback(async () => {
    try {
      const response = await api.get('/kyc/status');
      const data = response.data.data;
      setStatusData(data);
      const p = data?.profile;
      if (p) {
        setFirstName(p.first_name || '');
        setSurname(p.surname || '');
        setIdNumber(p.national_id_number || '');
        setDateOfBirth(p.date_of_birth || '');
        setGender(p.gender || '');
        setNationality(p.nationality || 'Namibian');
        setPhone(p.phone || '');
        setEmail(p.email || user?.email || '');
        setCountry(p.address_country || 'Namibia');
        setRegion(p.address_region || '');
        setCity(p.address_city || '');
        setStreetAddress(p.address_street || '');
        setPostalCode(p.address_postcode || '');
        setResidentialStatus(p.residential_status || 'RENTING');
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Unable to load KYC status.');
    }
  }, [user?.email]);

  useEffect(() => {
    if (!loading && roleReady && !user) router.replace('/auth');
    if (!loading && roleReady && user && role === 'LANDLORD') router.replace('/landlord/overview');
  }, [loading, roleReady, user, role, router]);

  useEffect(() => {
    if (user && role !== 'LANDLORD') void loadStatus();
  }, [user, role, loadStatus]);

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user?.email, email]);

  const kycStatus = statusData?.profile?.kyc_status ?? 'NOT_SUBMITTED';
  const rejectedDocTypes: KycDocType[] = statusData?.rejected_doc_types ?? [];

  useEffect(() => {
    if (kycStatus === 'REJECTED') setStep(3);
  }, [kycStatus]);

  useEffect(() => {
    if (!user || role === 'LANDLORD' || isKycApproved(kycStatus)) return;
    if (!isPendingReview(kycStatus)) return;
    const interval = setInterval(() => void loadStatus(), 8000);
    return () => clearInterval(interval);
  }, [user, role, kycStatus, loadStatus]);

  const docsToUpload = useMemo(() => {
    if (kycStatus === 'REJECTED' && rejectedDocTypes.length) {
      return DOC_CONFIG.filter((d) => rejectedDocTypes.includes(d.type));
    }
    return DOC_CONFIG;
  }, [kycStatus, rejectedDocTypes]);

  const step1Valid =
    firstName.trim() &&
    surname.trim() &&
    dateOfBirth &&
    gender.trim() &&
    nationality.trim() &&
    phone.trim();

  const step2Valid = country.trim() && region.trim() && city.trim() && streetAddress.trim() && residentialStatus;

  const step3Valid =
    marketDataConsent &&
    docsToUpload.every((d) => docFiles[d.type]) &&
    (kycStatus !== 'REJECTED' || docsToUpload.length > 0);

  const goNext = async () => {
    setError(null);
    setSuccess(null);
    if (step === 1) {
      if (!step1Valid) {
        setError('Complete all personal information fields.');
        return;
      }
      try {
        await api.put('/kyc/wizard/personal', {
          first_name: firstName.trim(),
          surname: surname.trim(),
          date_of_birth: dateOfBirth,
          gender: gender.trim(),
          nationality: nationality.trim(),
          phone: phone.trim(),
          national_id_number: idNumber.trim() || undefined,
        });
        setStep(2);
      } catch (err: unknown) {
        const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
        setError(apiErr?.response?.data?.message || apiErr?.message || 'Unable to save personal information.');
      }
      return;
    }

    if (step === 2) {
      if (!step2Valid) {
        setError('Complete all location fields.');
        return;
      }
      try {
        await api.put('/kyc/wizard/residence', {
          country: country.trim(),
          region: region.trim(),
          city: city.trim(),
          street_address: streetAddress.trim(),
          postal_code: postalCode.trim() || undefined,
          residential_status: residentialStatus,
        });
        setStep(3);
      } catch (err: unknown) {
        const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
        setError(apiErr?.response?.data?.message || apiErr?.message || 'Unable to save residence details.');
      }
    }
  };

  const submitAll = async () => {
    if (!step3Valid) {
      setError('Upload all required documents and accept market data consent.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const documents: Record<KycDocType, { filename: string; fileBase64: string }> = {} as any;
      for (const doc of docsToUpload) {
        const file = docFiles[doc.type];
        if (!file) throw new Error(`Missing ${doc.label}`);
        if (file.size > 8 * 1024 * 1024) throw new Error(`${doc.label} must be 8 MB or smaller.`);
        documents[doc.type] = { filename: file.name, fileBase64: await readFileAsBase64(file) };
      }

      await api.post('/consent/market-intelligence', { consent_type: 'TENANT_MARKET_DATA' });
      await api.post('/kyc/wizard/submit', {
        personal: {
          first_name: firstName.trim(),
          surname: surname.trim(),
          date_of_birth: dateOfBirth,
          gender: gender.trim(),
          nationality: nationality.trim(),
          phone: phone.trim(),
          national_id_number: idNumber.trim() || undefined,
        },
        residence: {
          country: country.trim(),
          region: region.trim(),
          city: city.trim(),
          street_address: streetAddress.trim(),
          postal_code: postalCode.trim() || undefined,
          residential_status: residentialStatus,
        },
        documents,
        market_data_consent: marketDataConsent,
      });

      setSuccess('Verification submitted. An admin will review your documents shortly.');
      setStep(1);
      setDocFiles({});
      await loadStatus();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Unable to submit verification.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !roleReady || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6]">
        <p className="text-sm text-slate-500">Loading verification…</p>
      </div>
    );
  }

  const showWizard = !isKycApproved(kycStatus) && !isPendingReview(kycStatus);

  return (
    <main className="min-h-screen bg-[#F3F4F6]">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <div className="tenant-panel space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#C0392B]/90">Verification</p>
          <h1 className="text-3xl font-semibold text-[#1A1A1A]">Verify your tenant account</h1>
          <p className="text-sm leading-7 text-slate-600">
            Complete three steps. Your location is checked against your landlord&apos;s records on final submission.
          </p>
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusPillClass(kycStatus)}`}>
            Status: {kycStatus === 'PENDING' ? 'PENDING_REVIEW' : kycStatus}
          </span>

          {isKycApproved(kycStatus) ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex gap-3">
                <ShieldCheck className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
                <div>
                  <p className="font-semibold text-emerald-900">You are verified</p>
                  <button type="button" onClick={() => router.push('/tenant/home')} className="tenant-btn-primary mt-4">
                    Go to dashboard
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {kycStatus === 'REJECTED' && statusData?.profile?.kyc_rejection_reason ? (
            <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Submission rejected</p>
                <p className="mt-1">{statusData.profile.kyc_rejection_reason}</p>
                <p className="mt-2">Re-upload only the documents marked below, then submit again.</p>
              </div>
            </div>
          ) : null}

          {isPendingReview(kycStatus) ? (
            <p className="text-sm text-amber-800">
              Under admin review — this page refreshes automatically. You will receive an email when a decision is made.
            </p>
          ) : null}
        </div>

        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
        {success ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p>
        ) : null}

        {showWizard ? (
          <div className="tenant-panel space-y-6">
            <KycWizardProgress step={step} />

            {step === 1 ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Personal information</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm sm:col-span-1">
                    <span className="font-medium text-slate-700">First name</span>
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
                  </label>
                  <label className="block text-sm sm:col-span-1">
                    <span className="font-medium text-slate-700">Last name</span>
                    <input value={surname} onChange={(e) => setSurname(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Date of birth</span>
                    <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Gender</span>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm">
                      <option value="">Select</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Nationality</span>
                    <input value={nationality} onChange={(e) => setNationality(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Phone number</span>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-700">Email</span>
                    <input value={email || user.email || ''} readOnly className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600" />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-700">National ID (optional)</span>
                    <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
                  </label>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Location & residence</h2>
                <p className="text-sm text-slate-600">
                  Enter your current residence independently. Your landlord&apos;s address is not shown here; we compare
                  both on submission.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Country</span>
                    <input value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Region / Province</span>
                    <input value={region} onChange={(e) => setRegion(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">City / Town</span>
                    <input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Postal code</span>
                    <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-700">Street address</span>
                    <input value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="font-medium text-slate-700">Residential status</span>
                    <select value={residentialStatus} onChange={(e) => setResidentialStatus(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm">
                      {RESIDENTIAL_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Document uploads</h2>
                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <input type="checkbox" checked={marketDataConsent} onChange={(e) => setMarketDataConsent(e.target.checked)} className="mt-1" />
                  <span>I agree that anonymised income and payment behaviour data may be used for aggregate rental market analysis.</span>
                </label>
                {docsToUpload.map((doc) => (
                  <div key={doc.type} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-semibold text-[#1A1A1A]">{doc.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{doc.hint}</p>
                    <div className="mt-3">
                      <KycDocumentUploadField
                        label={doc.label}
                        hint={doc.hint}
                        disabled={!marketDataConsent}
                        uploading={false}
                        fileName={docFiles[doc.type]?.name}
                        selfieMode={doc.selfie}
                        documentCameraMode={doc.idPhoto}
                        onFileSelect={(file) => setDocFiles((prev) => ({ ...prev, [doc.type]: file }))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-2">
              {step > 1 ? (
                <button type="button" onClick={() => setStep((step - 1) as 1 | 2 | 3)} className="tenant-btn-secondary inline-flex items-center gap-2">
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Back
                </button>
              ) : null}
              {step < 3 ? (
                <button type="button" onClick={() => void goNext()} className="tenant-btn-primary">
                  Continue
                </button>
              ) : (
                <button type="button" disabled={submitting || !step3Valid} onClick={() => void submitAll()} className="tenant-btn-primary disabled:opacity-50">
                  {submitting ? 'Submitting…' : 'Submit for review'}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
