'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import api from '../../../src/lib/api';
import KycDocumentUploadField from '../kyc/KycDocumentUploadField';
import KycWizardProgress from '../kyc/KycWizardProgress';

type LandlordDocType =
  | 'government_id'
  | 'company_registration'
  | 'proof_of_address'
  | 'proof_of_property_ownership'
  | 'selfie';

type AccountType = 'INDIVIDUAL' | 'COMPANY';

const WIZARD_LABELS: [string, string, string] = [
  'Identity & account type',
  'Property & location',
  'Document uploads',
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

type Props = {
  open: boolean;
  onClose: () => void;
  initialStep?: 1 | 2 | 3;
  onStatusChange?: () => void;
};

export default function LandlordKycPanel({ open, onClose, initialStep = 1, onStatusChange }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [statusData, setStatusData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('Namibian');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('INDIVIDUAL');
  const [companyName, setCompanyName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');

  const [country, setCountry] = useState('Namibia');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [propertiesCount, setPropertiesCount] = useState(1);
  const [ownershipStatus, setOwnershipStatus] = useState('OWNER');

  const [docFiles, setDocFiles] = useState<Partial<Record<LandlordDocType, File>>>({});

  const loadStatus = useCallback(async () => {
    const response = await api.get('/landlords/kyc/status');
    const data = response.data.data;
    setStatusData(data);
    const p = data?.profile;
    if (p) {
      setFirstName(p.first_name || '');
      setSurname(p.surname || '');
      setDateOfBirth(p.date_of_birth || '');
      setGender(p.gender || '');
      setNationality(p.nationality || 'Namibian');
      setPhone(p.phone || '');
      setEmail(p.email || '');
      setAccountType((p.account_type as AccountType) || 'INDIVIDUAL');
      setCompanyName(p.company_name || '');
      setRegistrationNumber(p.registration_number || '');
      setVatNumber(p.vat_number || '');
      setCountry(p.address_country || 'Namibia');
      setRegion(p.address_region || '');
      setCity(p.address_city || '');
      setStreetAddress(p.address_street || '');
      setPostalCode(p.address_postcode || '');
      setPropertiesCount(p.properties_managed_count || 1);
      setOwnershipStatus(p.ownership_status || 'OWNER');
    }
    const draft = data?.wizard_draft;
    if (draft?.step1) {
      const s = draft.step1;
      if (s.first_name) setFirstName(s.first_name);
      if (s.surname) setSurname(s.surname);
      if (s.account_type) setAccountType(s.account_type);
    }
    if (draft?.step2) {
      const s = draft.step2;
      if (s.country) setCountry(s.country);
      if (s.region) setRegion(s.region);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setStep(initialStep);
      void loadStatus().catch((err: unknown) => {
        const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
        setError(apiErr?.response?.data?.message || apiErr?.message || 'Unable to load verification status.');
      });
    }
  }, [open, initialStep, loadStatus]);

  const verificationStatus = statusData?.verification_status ?? 'UNVERIFIED';
  const rejectedDocTypes: LandlordDocType[] = statusData?.rejected_doc_types ?? [];
  const rejectionReason = statusData?.profile?.kyc_rejection_reason;

  useEffect(() => {
    if (verificationStatus === 'REJECTED') setStep(3);
  }, [verificationStatus]);

  const requiredDocs = useMemo((): LandlordDocType[] => {
    const idDoc: LandlordDocType = accountType === 'COMPANY' ? 'company_registration' : 'government_id';
    return [idDoc, 'proof_of_address', 'proof_of_property_ownership', 'selfie'];
  }, [accountType]);

  const docNeedsReupload = (type: LandlordDocType) =>
    verificationStatus === 'REJECTED' && (rejectedDocTypes.length === 0 || rejectedDocTypes.includes(type));

  const saveDraft = async (draftStep: 1 | 2) => {
    setSaving(true);
    setError(null);
    try {
      await api.put('/landlords/kyc/wizard/draft', {
        step: draftStep,
        step1:
          draftStep === 1
            ? {
                first_name: firstName,
                surname,
                date_of_birth: dateOfBirth,
                gender,
                nationality,
                phone,
                account_type: accountType,
                company_name: companyName,
                registration_number: registrationNumber,
                vat_number: vatNumber,
              }
            : undefined,
        step2:
          draftStep === 2
            ? {
                country,
                region,
                city,
                street_address: streetAddress,
                postal_code: postalCode,
                properties_managed_count: propertiesCount,
                ownership_status: ownershipStatus,
              }
            : undefined,
      });
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Could not save progress.');
    } finally {
      setSaving(false);
    }
  };

  const validateStep1 = () => {
    if (!firstName.trim() || !surname.trim()) return 'First and last name are required.';
    if (!dateOfBirth || !gender.trim() || !nationality.trim() || !phone.trim()) return 'Complete all personal fields.';
    if (accountType === 'COMPANY' && !companyName.trim()) return 'Company name is required.';
    return null;
  };

  const validateStep2 = () => {
    if (!country.trim() || !region.trim() || !city.trim() || !streetAddress.trim()) {
      return 'Complete property location fields.';
    }
    if (propertiesCount < 1) return 'Number of properties must be at least 1.';
    return null;
  };

  const goNext = async () => {
    if (step === 1) {
      const msg = validateStep1();
      if (msg) {
        setError(msg);
        return;
      }
      await saveDraft(1);
      setStep(2);
      setError(null);
      return;
    }
    if (step === 2) {
      const msg = validateStep2();
      if (msg) {
        setError(msg);
        return;
      }
      await saveDraft(2);
      setStep(3);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    const msg1 = validateStep1();
    const msg2 = validateStep2();
    if (msg1 || msg2) {
      setError(msg1 || msg2);
      return;
    }

    const docsToSend: Partial<Record<LandlordDocType, { filename: string; fileBase64: string }>> = {};
    for (const type of requiredDocs) {
      const existing = statusData?.documents?.find((d: { type: string }) => d.type === type);
      const file = docFiles[type];
      if (file) {
        docsToSend[type] = { filename: file.name, fileBase64: await readFileAsBase64(file) };
      } else if (verificationStatus === 'REJECTED' && docNeedsReupload(type)) {
        setError(`Please re-upload: ${type.replace(/_/g, ' ')}`);
        return;
      } else if (!existing && verificationStatus !== 'REJECTED') {
        setError(`Please upload: ${type.replace(/_/g, ' ')}`);
        return;
      }
    }

    if (verificationStatus !== 'REJECTED') {
      for (const type of requiredDocs) {
        if (!docsToSend[type]) {
          setError(`Please upload all required documents.`);
          return;
        }
      }
    } else if (!Object.keys(docsToSend).length && rejectedDocTypes.length) {
      setError('Upload corrected documents for rejected items.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/landlords/kyc/wizard/submit', {
        step1: {
          first_name: firstName.trim(),
          surname: surname.trim(),
          date_of_birth: dateOfBirth,
          gender: gender.trim(),
          nationality: nationality.trim(),
          phone: phone.trim(),
          account_type: accountType,
          company_name: companyName.trim() || undefined,
          registration_number: registrationNumber.trim() || undefined,
          vat_number: vatNumber.trim() || undefined,
        },
        step2: {
          country: country.trim(),
          region: region.trim(),
          city: city.trim(),
          street_address: streetAddress.trim(),
          postal_code: postalCode.trim() || undefined,
          properties_managed_count: propertiesCount,
          ownership_status: ownershipStatus,
        },
        documents: docsToSend,
        consent_text_version: 'landlord-kyc-v1',
      });
      await loadStatus();
      onStatusChange?.();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const pending = verificationStatus === 'PENDING_REVIEW';

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/35" onClick={onClose} aria-label="Close verification panel" />
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#C0392B]">Partner verification</p>
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Identity & property check</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {pending ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              Your submission is under review. You can close this panel and continue using the dashboard overview.
            </p>
          ) : (
            <>
              <KycWizardProgress step={step} labels={WIZARD_LABELS} />
              {rejectionReason ? (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{rejectionReason}</p>
              ) : null}
              {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

              {step === 1 ? (
                <div className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="font-medium text-slate-700">First name</span>
                      <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </label>
                    <label className="block text-sm">
                      <span className="font-medium text-slate-700">Last name</span>
                      <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={surname} onChange={(e) => setSurname(e.target.value)} />
                    </label>
                  </div>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Date of birth</span>
                    <input type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Gender</span>
                    <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={gender} onChange={(e) => setGender(e.target.value)}>
                      <option value="">Select</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Nationality</span>
                    <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={nationality} onChange={(e) => setNationality(e.target.value)} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Phone</span>
                    <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Email</span>
                    <input className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500" value={email} readOnly />
                  </label>
                  <fieldset className="space-y-2 text-sm">
                    <legend className="font-medium text-slate-700">Account type</legend>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={accountType === 'INDIVIDUAL'} onChange={() => setAccountType('INDIVIDUAL')} />
                      Individual landlord
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={accountType === 'COMPANY'} onChange={() => setAccountType('COMPANY')} />
                      Property management company
                    </label>
                  </fieldset>
                  {accountType === 'COMPANY' ? (
                    <>
                      <label className="block text-sm">
                        <span className="font-medium text-slate-700">Company name</span>
                        <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                      </label>
                      <label className="block text-sm">
                        <span className="font-medium text-slate-700">Registration number</span>
                        <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
                      </label>
                      <label className="block text-sm">
                        <span className="font-medium text-slate-700">VAT number (optional)</span>
                        <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
                      </label>
                    </>
                  ) : null}
                </div>
              ) : null}

              {step === 2 ? (
                <div className="mt-6 space-y-4">
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Country</span>
                    <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={country} onChange={(e) => setCountry(e.target.value)} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Region / province</span>
                    <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={region} onChange={(e) => setRegion(e.target.value)} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">City / town</span>
                    <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={city} onChange={(e) => setCity(e.target.value)} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Primary property address</span>
                    <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Postal code (optional)</span>
                    <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Properties owned / managed</span>
                    <input
                      type="number"
                      min={1}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={propertiesCount}
                      onChange={(e) => setPropertiesCount(Number(e.target.value) || 1)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Ownership status</span>
                    <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={ownershipStatus} onChange={(e) => setOwnershipStatus(e.target.value)}>
                      <option value="OWNER">Owner</option>
                      <option value="MANAGING_AGENT">Managing agent</option>
                    </select>
                  </label>
                </div>
              ) : null}

              {step === 3 && !pending ? (
                <div className="mt-6 space-y-5">
                  <KycDocumentUploadField
                    label={
                      (docNeedsReupload(accountType === 'COMPANY' ? 'company_registration' : 'government_id') ? '⚠ ' : '') +
                      (accountType === 'COMPANY' ? 'Company registration certificate' : 'Government ID')
                    }
                    hint="Clear photo or scan"
                    documentCameraMode
                    fileName={docFiles[accountType === 'COMPANY' ? 'company_registration' : 'government_id']?.name}
                    onFileSelect={(file) =>
                      setDocFiles((prev) => ({
                        ...prev,
                        [accountType === 'COMPANY' ? 'company_registration' : 'government_id']: file,
                      }))
                    }
                  />
                  <KycDocumentUploadField
                    label={(docNeedsReupload('proof_of_address') ? '⚠ ' : '') + 'Proof of address'}
                    hint="Utility bill or bank statement (last 3 months)"
                    documentCameraMode
                    fileName={docFiles.proof_of_address?.name}
                    onFileSelect={(file) => setDocFiles((prev) => ({ ...prev, proof_of_address: file }))}
                  />
                  <KycDocumentUploadField
                    label={(docNeedsReupload('proof_of_property_ownership') ? '⚠ ' : '') + 'Proof of property ownership'}
                    hint="Title deed, lease agreement, or municipal rates bill"
                    documentCameraMode
                    fileName={docFiles.proof_of_property_ownership?.name}
                    onFileSelect={(file) => setDocFiles((prev) => ({ ...prev, proof_of_property_ownership: file }))}
                  />
                  <KycDocumentUploadField
                    label={(docNeedsReupload('selfie') ? '⚠ ' : '') + 'Selfie verification'}
                    hint="Use camera on mobile; upload on desktop"
                    selfieMode
                    fileName={docFiles.selfie?.name}
                    onFileSelect={(file) => setDocFiles((prev) => ({ ...prev, selfie: file }))}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>

        {!pending ? (
          <div className="flex gap-3 border-t border-slate-200 px-5 py-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
                className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Back
              </button>
            ) : null}
            <div className="ml-auto flex gap-2">
              {step < 3 ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void goNext()}
                  className="rounded-full bg-[#C0392B] px-5 py-2 text-sm font-semibold text-white hover:bg-[#992d24] disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Continue'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleSubmit()}
                  className="rounded-full bg-[#1A1A1A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#111] disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : verificationStatus === 'REJECTED' ? 'Resubmit' : 'Submit for review'}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
