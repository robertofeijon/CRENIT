'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileText, RefreshCw, ScrollText, Upload } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import LandlordPageHeader from '../../components/ui/LandlordPageHeader';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import { formatN$, landlordInputClass, landlordSelectClass, statusPillClass } from '../../components/landlord/landlordUi';

interface Attachment {
  id: string;
  attachment_type: string;
  file_name: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  uploaded_at: string;
  rejection_reason?: string;
}

type LeaseForm = {
  unit_id: string;
  tenant_full_name: string;
  tenant_email: string;
  tenant_phone: string;
  tenant_id_number: string;
  residence_country: string;
  residence_region: string;
  residence_city: string;
  residence_street: string;
  residence_postal: string;
  residence_status: string;
  monthly_rent: string;
  deposit_amount: string;
  start_date: string;
  end_date: string;
  payment_method: 'PLATFORM' | 'DIRECT';
  additional_terms: string;
};

const RESIDENCE_STATUS_OPTIONS = ['RENTING', 'OWNING', 'LIVING_WITH_FAMILY', 'OTHER'];

const emptyLeaseForm = (): LeaseForm => ({
  unit_id: '',
  tenant_full_name: '',
  tenant_email: '',
  tenant_phone: '',
  tenant_id_number: '',
  residence_country: 'Namibia',
  residence_region: '',
  residence_city: '',
  residence_street: '',
  residence_postal: '',
  residence_status: 'RENTING',
  monthly_rent: '',
  deposit_amount: '',
  start_date: '',
  end_date: '',
  payment_method: 'PLATFORM',
  additional_terms: '',
});

const residenceFromUnit = (unit?: {
  address_country?: string;
  address_suburb?: string;
  address_city?: string;
  address_street?: string;
  address_postcode?: string;
}) => ({
  residence_country: unit?.address_country || 'Namibia',
  residence_region: unit?.address_suburb || '',
  residence_city: unit?.address_city || '',
  residence_street: unit?.address_street || '',
  residence_postal: unit?.address_postcode || '',
  residence_status: 'RENTING',
});

const downloadPdf = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export default function AttachmentsPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] = useState('PROPERTY_PROOF');
  const [description, setDescription] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [leaseForm, setLeaseForm] = useState<LeaseForm>(emptyLeaseForm);
  const [isLoading, setIsLoading] = useState(false);
  const [leaseLoading, setLeaseLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'attachments' | 'create-lease'>('attachments');

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role && role !== 'LANDLORD' && role !== 'ADMIN') router.replace('/tenant/home');
  }, [loading, user, role, router]);

  const loadAttachments = useCallback(async () => {
    if (!user?.id) return;
    setListLoading(true);
    try {
      const res = await api.get(`/landlords/${user.id}/attachments`);
      setAttachments(res.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load attachments');
    } finally {
      setListLoading(false);
    }
  }, [user?.id]);

  const loadProperties = useCallback(async () => {
    try {
      const res = await api.get('/landlords/properties');
      const list = res.data?.data || [];
      setProperties(list);
      const allUnits = list.flatMap((property: any) =>
        (property.units || []).map((unit: any) => ({
          ...unit,
          property_id: property.id,
          property_name: property.property_name,
          address_street: property.address_street,
          address_suburb: property.address_suburb,
          address_city: property.address_city,
          address_postcode: property.address_postcode,
          address_country: property.address_country,
        })),
      );
      setUnits(allUnits);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) {
      void loadAttachments();
      void loadProperties();
    }
  }, [user, role, loadAttachments, loadProperties]);

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('attachment_type', attachmentType);
      if (description) formData.append('description', description);
      if (propertyId) formData.append('property_id', propertyId);

      const res = await api.post(`/landlords/${user?.id}/attachments/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        setMessage('File uploaded successfully');
        setSelectedFile(null);
        setDescription('');
        setPropertyId('');
        await loadAttachments();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  const buildTenantResidence = () => ({
    country: leaseForm.residence_country.trim(),
    region: leaseForm.residence_region.trim(),
    city: leaseForm.residence_city.trim(),
    street_address: leaseForm.residence_street.trim(),
    postal_code: leaseForm.residence_postal.trim() || undefined,
    residential_status: leaseForm.residence_status,
  });

  const buildLeasePayload = () => ({
    unit_id: leaseForm.unit_id,
    tenant_full_name: leaseForm.tenant_full_name.trim(),
    tenant_email: leaseForm.tenant_email.trim() || undefined,
    tenant_phone: leaseForm.tenant_phone.trim() || undefined,
    tenant_id_number: leaseForm.tenant_id_number.trim() || undefined,
    tenant_residence: buildTenantResidence(),
    monthly_rent: Number(leaseForm.monthly_rent),
    deposit_amount: leaseForm.deposit_amount ? Number(leaseForm.deposit_amount) : undefined,
    start_date: leaseForm.start_date,
    end_date: leaseForm.end_date || undefined,
    payment_method: leaseForm.payment_method,
    additional_terms: leaseForm.additional_terms.trim() || undefined,
  });

  const handleDownloadLease = async () => {
    setLeaseLoading(true);
    setError(null);
    setMessage('');
    try {
      const response = await api.post('/landlords/leases/document/download', buildLeasePayload(), {
        responseType: 'blob',
      });
      downloadPdf(new Blob([response.data], { type: 'application/pdf' }), 'crenit-lease-agreement.pdf');
      setMessage('Lease agreement downloaded. Send it to your tenant for signature.');
    } catch (err: any) {
      const data = err?.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          const parsed = JSON.parse(text);
          setError(parsed?.message || 'Unable to generate lease PDF.');
        } catch {
          setError('Unable to generate lease PDF.');
        }
      } else {
        setError(err?.response?.data?.message || err?.message || 'Unable to generate lease PDF.');
      }
    } finally {
      setLeaseLoading(false);
    }
  };

  const handleRegisterOnCrenit = async () => {
    if (!leaseForm.tenant_email.trim()) {
      setError('Tenant email is required to register the lease on CRENIT.');
      return;
    }
    setLeaseLoading(true);
    setError(null);
    setMessage('');
    try {
      const payload = buildLeasePayload();
      await api.post('/landlords/leases', {
        unit_id: payload.unit_id,
        tenant_email: payload.tenant_email,
        tenant_residence: payload.tenant_residence,
        monthly_rent: payload.monthly_rent,
        payment_method: payload.payment_method,
        start_date: payload.start_date,
        end_date: payload.end_date,
        status: 'ACTIVE',
      });
      setMessage('Lease registered on CRENIT. You can still download a PDF for offline signing.');
      setLeaseForm(emptyLeaseForm());
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to register lease.');
    } finally {
      setLeaseLoading(false);
    }
  };

  const onUnitChange = (unitId: string) => {
    const unit = units.find((u) => u.id === unitId);
    const residenceDefaults = residenceFromUnit(unit);
    setLeaseForm((prev) => ({
      ...prev,
      unit_id: unitId,
      monthly_rent: unit?.monthly_rent != null ? String(unit.monthly_rent) : prev.monthly_rent,
      deposit_amount:
        prev.deposit_amount || (unit?.monthly_rent != null ? String(unit.monthly_rent) : prev.deposit_amount),
      ...residenceDefaults,
    }));
  };

  const refresh = () => {
    void loadAttachments();
    void loadProperties();
  };

  const residenceValid =
    leaseForm.residence_country.trim() &&
    leaseForm.residence_region.trim() &&
    leaseForm.residence_city.trim() &&
    leaseForm.residence_street.trim() &&
    leaseForm.residence_status;

  const leaseFormValid =
    leaseForm.unit_id &&
    leaseForm.tenant_full_name.trim().length >= 2 &&
    leaseForm.start_date &&
    Number(leaseForm.monthly_rent) > 0 &&
    residenceValid;

  if (loading || !user) {
    return <p className="text-sm text-slate-500">Loading partner workspace…</p>;
  }

  return (
    <div className="space-y-6">
      <LandlordPageHeader
        badge="Documents"
        title="Property documents & leases"
        subtitle="Upload verification files or build a free lease agreement PDF to send to your tenant for signature."
        actions={
          <button type="button" onClick={refresh} disabled={listLoading} className="landlord-btn-secondary">
            <RefreshCw className={`h-4 w-4 ${listLoading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={refresh} /> : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p>
      ) : null}

      <div className="flex gap-2 border-b border-slate-100 pb-1">
        <button
          type="button"
          className={`rounded-t-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'attachments' ? 'bg-[#FDEDEC] text-[#C0392B]' : 'text-slate-600 hover:text-[#1A1A1A]'
          }`}
          onClick={() => setActiveTab('attachments')}
        >
          Attachments
        </button>
        <button
          type="button"
          className={`rounded-t-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'create-lease' ? 'bg-[#FDEDEC] text-[#C0392B]' : 'text-slate-600 hover:text-[#1A1A1A]'
          }`}
          onClick={() => setActiveTab('create-lease')}
        >
          Create lease
        </button>
      </div>

      {activeTab === 'attachments' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="landlord-panel">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#C0392B]" aria-hidden />
              <h2 className="text-lg font-semibold text-[#1A1A1A]">Upload document</h2>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Document type</label>
                <select className={landlordSelectClass} value={attachmentType} onChange={(e) => setAttachmentType(e.target.value)}>
                  <option value="PROPERTY_PROOF">Proof of Property Ownership</option>
                  <option value="LEASE_AGREEMENT">Lease Agreement Template</option>
                  <option value="OWNERSHIP_DOCUMENT">Ownership Document</option>
                  <option value="OTHER">Other Document</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Property (optional)</label>
                <select className={landlordSelectClass} value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                  <option value="">— Select a property —</option>
                  {properties.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.property_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">File</label>
                <label className={`${landlordInputClass} flex cursor-pointer items-center gap-2`}>
                  <Upload className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <span className="truncate text-slate-600">{selectedFile ? selectedFile.name : 'Choose file…'}</span>
                  <input type="file" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                </label>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Description (optional)</label>
                <textarea className={`${landlordInputClass} min-h-[80px]`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <button type="button" className="landlord-btn-primary w-full" disabled={isLoading || !selectedFile} onClick={handleUpload}>
                {isLoading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </section>

          <section className="landlord-panel">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#C0392B]" aria-hidden />
              <h2 className="text-lg font-semibold text-[#1A1A1A]">Your attachments</h2>
            </div>
            <div className="mt-4 space-y-3">
              {listLoading ? (
                <SkeletonBlocks rows={3} />
              ) : attachments.length === 0 ? (
                <EmptyStateCard title="No attachments" description="Upload a document to get started." />
              ) : (
                attachments.map((att) => (
                  <div key={att.id} className="rounded-xl border border-slate-100 bg-[#F3F4F6] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{att.file_name}</p>
                        <p className="text-sm text-slate-600">{att.attachment_type.replace(/_/g, ' ')}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClass(att.status)}`}>{att.status}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{new Date(att.uploaded_at).toLocaleDateString()}</p>
                    {att.rejection_reason ? <p className="mt-1 text-xs text-red-600">Reason: {att.rejection_reason}</p> : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : (
        <section className="landlord-panel max-w-3xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-[#C0392B]" aria-hidden />
              <div>
                <h2 className="text-lg font-semibold text-[#1A1A1A]">Create lease agreement</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Fill in the required details, download a PDF, and send it to your tenant to sign. Completely free — no service fees.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Free</span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Unit <span className="text-[#C0392B]">*</span>
              </label>
              <select
                className={landlordSelectClass}
                value={leaseForm.unit_id}
                onChange={(e) => onUnitChange(e.target.value)}
              >
                <option value="">— Select unit —</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.property_name} · {unit.unit_identifier}
                    {unit.status === 'OCCUPIED' ? ' (occupied)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Tenant full legal name <span className="text-[#C0392B]">*</span>
              </label>
              <input
                className={landlordInputClass}
                value={leaseForm.tenant_full_name}
                onChange={(e) => setLeaseForm((f) => ({ ...f, tenant_full_name: e.target.value }))}
                placeholder="As it should appear on the agreement"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tenant email</label>
              <input
                type="email"
                className={landlordInputClass}
                value={leaseForm.tenant_email}
                onChange={(e) => setLeaseForm((f) => ({ ...f, tenant_email: e.target.value }))}
                placeholder="For CRENIT registration"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tenant phone</label>
              <input
                className={landlordInputClass}
                value={leaseForm.tenant_phone}
                onChange={(e) => setLeaseForm((f) => ({ ...f, tenant_phone: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">ID / passport (optional)</label>
              <input
                className={landlordInputClass}
                value={leaseForm.tenant_id_number}
                onChange={(e) => setLeaseForm((f) => ({ ...f, tenant_id_number: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2 mt-2 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-[#1A1A1A]">Tenant residence (for KYC verification)</h3>
              <p className="mt-1 text-sm text-slate-500">
                Where the tenant will live under this lease. Pre-filled from the property — edit if needed. Used to cross-check
                the tenant&apos;s KYC submission (they do not see these values).
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Country <span className="text-[#C0392B]">*</span>
              </label>
              <input
                className={landlordInputClass}
                value={leaseForm.residence_country}
                onChange={(e) => setLeaseForm((f) => ({ ...f, residence_country: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Region / Province <span className="text-[#C0392B]">*</span>
              </label>
              <input
                className={landlordInputClass}
                value={leaseForm.residence_region}
                onChange={(e) => setLeaseForm((f) => ({ ...f, residence_region: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                City / Town <span className="text-[#C0392B]">*</span>
              </label>
              <input
                className={landlordInputClass}
                value={leaseForm.residence_city}
                onChange={(e) => setLeaseForm((f) => ({ ...f, residence_city: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Postal code</label>
              <input
                className={landlordInputClass}
                value={leaseForm.residence_postal}
                onChange={(e) => setLeaseForm((f) => ({ ...f, residence_postal: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Street address <span className="text-[#C0392B]">*</span>
              </label>
              <input
                className={landlordInputClass}
                value={leaseForm.residence_street}
                onChange={(e) => setLeaseForm((f) => ({ ...f, residence_street: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Residential status <span className="text-[#C0392B]">*</span>
              </label>
              <select
                className={landlordSelectClass}
                value={leaseForm.residence_status}
                onChange={(e) => setLeaseForm((f) => ({ ...f, residence_status: e.target.value }))}
              >
                {RESIDENCE_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Monthly rent (N$) <span className="text-[#C0392B]">*</span>
              </label>
              <input
                type="number"
                min={1}
                className={landlordInputClass}
                value={leaseForm.monthly_rent}
                onChange={(e) => setLeaseForm((f) => ({ ...f, monthly_rent: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Security deposit (N$)</label>
              <input
                type="number"
                min={0}
                className={landlordInputClass}
                value={leaseForm.deposit_amount}
                onChange={(e) => setLeaseForm((f) => ({ ...f, deposit_amount: e.target.value }))}
                placeholder={leaseForm.monthly_rent ? `Defaults to ${formatN$(Number(leaseForm.monthly_rent))}` : 'Defaults to one month rent'}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Start date <span className="text-[#C0392B]">*</span>
              </label>
              <input
                type="date"
                className={landlordInputClass}
                value={leaseForm.start_date}
                onChange={(e) => setLeaseForm((f) => ({ ...f, start_date: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">End date (optional)</label>
              <input
                type="date"
                className={landlordInputClass}
                value={leaseForm.end_date}
                onChange={(e) => setLeaseForm((f) => ({ ...f, end_date: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Payment method</label>
              <select
                className={landlordSelectClass}
                value={leaseForm.payment_method}
                onChange={(e) =>
                  setLeaseForm((f) => ({ ...f, payment_method: e.target.value as 'PLATFORM' | 'DIRECT' }))
                }
              >
                <option value="PLATFORM">CRENIT platform (card, EFT, mobile money)</option>
                <option value="DIRECT">Direct to landlord (confirmed on CRENIT)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Additional terms (optional)</label>
              <textarea
                className={`${landlordInputClass} min-h-[88px]`}
                rows={3}
                value={leaseForm.additional_terms}
                onChange={(e) => setLeaseForm((f) => ({ ...f, additional_terms: e.target.value }))}
                placeholder="Parking, pets, utilities, notice period, etc."
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="landlord-btn-primary inline-flex items-center gap-2"
              disabled={leaseLoading || !leaseFormValid}
              onClick={handleDownloadLease}
            >
              <Download className="h-4 w-4" aria-hidden />
              {leaseLoading ? 'Generating…' : 'Download lease PDF'}
            </button>
            <button
              type="button"
              className="landlord-btn-secondary"
              disabled={leaseLoading || !leaseFormValid || !leaseForm.tenant_email.trim()}
              onClick={handleRegisterOnCrenit}
              title={!leaseForm.tenant_email.trim() ? 'Add tenant email to register on CRENIT' : undefined}
            >
              Register on CRENIT
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Required: unit, tenant legal name, tenant residence, monthly rent, and start date. This template is for convenience only;
            seek legal advice before signing. Registering on CRENIT links rent tracking and credit reporting when the tenant accepts.
          </p>
        </section>
      )}
    </div>
  );
}
