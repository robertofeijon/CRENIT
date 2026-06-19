'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Home, Plus, RefreshCw } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import LandlordPageHeader from '../../components/ui/LandlordPageHeader';
import LandlordStatCard from '../../components/ui/LandlordStatCard';
import ErrorStateCard from '../../components/ui/ErrorStateCard';
import EmptyStateCard from '../../components/ui/EmptyStateCard';
import SkeletonBlocks from '../../components/ui/SkeletonBlocks';
import { LandlordWorkspaceLoading } from '../../components/ui/WorkspaceLoading';
import { formatN$, landlordInputClass, landlordSelectClass } from '../../components/landlord/landlordUi';
import PropertiesBulkImport from '../../components/landlord/PropertiesBulkImport';
import { WINDHOEK_SUBURBS } from '../../../src/lib/namibia-locale';

const PROPERTY_TYPES = ['APARTMENT', 'HOUSE', 'FLAT', 'TOWNHOUSE', 'ROOM', 'COMMERCIAL'];

export default function LandlordPropertiesPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    property_name: '',
    address_street: '',
    address_suburb: '',
    address_city: '',
    address_postcode: '',
    property_type: 'APARTMENT',
    unit_identifier: '',
    monthly_rent: '',
    bedrooms: '',
    bathrooms: '',
  });
  const [unitForms, setUnitForms] = useState<Record<string, { unit_identifier: string; monthly_rent: string }>>({});
  const [marketDataConsent, setMarketDataConsent] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
    if (!loading && user && role && role !== 'LANDLORD' && role !== 'ADMIN') router.replace('/tenant/home');
  }, [loading, user, role, router]);

  const loadProperties = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/landlords/properties');
      setProperties(res.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load properties.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && (role === 'LANDLORD' || role === 'ADMIN')) void loadProperties();
  }, [user, role, loadProperties]);

  const portfolioStats = useMemo(() => {
    const unitCount = properties.reduce((sum, p) => sum + (p.units?.length || 0), 0);
    const totalRent = properties.reduce(
      (sum, p) => sum + (p.units || []).reduce((uSum: number, u: any) => uSum + Number(u.monthly_rent || 0), 0),
      0,
    );
    return { propertyCount: properties.length, unitCount, totalRent };
  }, [properties]);

  const handleCreateProperty = async () => {
    if (!form.property_name || !form.address_street || !form.address_suburb || !form.address_city) {
      setError('Fill in all required property fields.');
      return;
    }
    if (!marketDataConsent) {
      setError('Please agree to anonymised market intelligence data use before registering a property.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {
        property_name: form.property_name,
        address_street: form.address_street,
        address_suburb: form.address_suburb,
        address_city: form.address_city,
        address_postcode: form.address_postcode || undefined,
        property_type: form.property_type,
      };
      if (form.unit_identifier && form.monthly_rent) {
        payload.unit = {
          unit_identifier: form.unit_identifier,
          monthly_rent: Number(form.monthly_rent),
          bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
          bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        };
      }
      await api.post('/consent/market-intelligence', { consent_type: 'LANDLORD_MARKET_DATA' });
      await api.post('/landlords/properties', payload);
      setMessage('Property created successfully.');
      setShowForm(false);
      setForm({
        property_name: '',
        address_street: '',
        address_suburb: '',
        address_city: '',
        address_postcode: '',
        property_type: 'APARTMENT',
        unit_identifier: '',
        monthly_rent: '',
        bedrooms: '',
        bathrooms: '',
      });
      await loadProperties();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to create property.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUnit = async (propertyId: string) => {
    const unitForm = unitForms[propertyId];
    if (!unitForm?.unit_identifier || !unitForm?.monthly_rent) {
      setError('Unit identifier and monthly rent are required.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await api.post(`/landlords/properties/${propertyId}/units`, {
        unit_identifier: unitForm.unit_identifier,
        monthly_rent: Number(unitForm.monthly_rent),
      });
      setMessage('Unit added.');
      setUnitForms((prev) => ({ ...prev, [propertyId]: { unit_identifier: '', monthly_rent: '' } }));
      await loadProperties();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to add unit.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRent = async (unitId: string, monthly_rent: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.patch(`/landlords/properties/units/${unitId}`, { monthly_rent });
      setMessage('Rent updated.');
      await loadProperties();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to update rent.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || !user) {
    return <LandlordWorkspaceLoading />;
  }

  return (
    <div className="space-y-6">
      <LandlordPageHeader
        badge="Portfolio"
        title="Properties"
        subtitle="Register properties and units, set rent amounts, and manage your portfolio."
        actions={
          <>
            <button type="button" onClick={() => setShowForm((v) => !v)} className="landlord-btn-primary">
              <Plus className="h-4 w-4" aria-hidden />
              {showForm ? 'Cancel' : 'Add property'}
            </button>
            <button type="button" onClick={() => void loadProperties()} disabled={isLoading} className="landlord-btn-secondary">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
              Refresh
            </button>
          </>
        }
      />

      {error ? <ErrorStateCard message={error} onRetry={loadProperties} /> : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <LandlordStatCard label="Properties" value={portfolioStats.propertyCount} icon={Building2} />
        <LandlordStatCard label="Units" value={portfolioStats.unitCount} icon={Home} accent="success" />
        <LandlordStatCard label="Total monthly rent" value={formatN$(portfolioStats.totalRent)} accent="dark" />
      </section>

      {showForm ? (
        <section className="landlord-panel">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">New property</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input placeholder="Property name *" value={form.property_name} onChange={(e) => setForm({ ...form, property_name: e.target.value })} className={landlordInputClass} />
            <select value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value })} className={landlordSelectClass}>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input placeholder="Street address *" value={form.address_street} onChange={(e) => setForm({ ...form, address_street: e.target.value })} className={`${landlordInputClass} sm:col-span-2`} />
            <input
              placeholder="Suburb *"
              list="windhoek-suburbs"
              value={form.address_suburb}
              onChange={(e) => setForm({ ...form, address_suburb: e.target.value })}
              className={landlordInputClass}
            />
            <datalist id="windhoek-suburbs">
              {WINDHOEK_SUBURBS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <input placeholder="City *" value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} className={landlordInputClass} />
            <input placeholder="Postcode" value={form.address_postcode} onChange={(e) => setForm({ ...form, address_postcode: e.target.value })} className={landlordInputClass} />
            <input placeholder="First unit ID (optional)" value={form.unit_identifier} onChange={(e) => setForm({ ...form, unit_identifier: e.target.value })} className={landlordInputClass} />
            <input placeholder="Monthly rent (optional)" type="number" value={form.monthly_rent} onChange={(e) => setForm({ ...form, monthly_rent: e.target.value })} className={landlordInputClass} />
          </div>
          <label className="mt-4 flex items-start gap-3 text-sm text-slate-600">
            <input type="checkbox" checked={marketDataConsent} onChange={(e) => setMarketDataConsent(e.target.checked)} className="mt-1" />
            <span>
              I agree that anonymised, aggregated property and payment data from my portfolio may be used for
              Aggregated rental market intelligence. Individual records are never sold.
            </span>
          </label>
          <button type="button" onClick={handleCreateProperty} disabled={isLoading} className="landlord-btn-primary mt-4">
            {isLoading ? 'Saving…' : 'Create property'}
          </button>
        </section>
      ) : null}

      <PropertiesBulkImport onImported={() => void loadProperties()} />

      <section className="landlord-panel">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">Your portfolio</h2>
        {isLoading && !properties.length ? (
          <div className="mt-4">
            <SkeletonBlocks rows={3} />
          </div>
        ) : properties.length ? (
          <div className="mt-4 space-y-5">
            {properties.map((property) => (
              <div key={property.id} className="rounded-xl border border-slate-100 bg-[#F3F4F6] p-5">
                <h3 className="text-lg font-semibold text-[#1A1A1A]">{property.property_name}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {property.address_street}, {property.address_suburb}, {property.address_city}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{property.property_type}</p>
                <div className="mt-4 space-y-2">
                  {(property.units || []).map((unit: any) => (
                    <div key={unit.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-[#1A1A1A]">Unit {unit.unit_identifier}</p>
                        <p className="text-sm text-slate-600">Rent: {formatN$(unit.monthly_rent)}/mo</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          defaultValue={unit.monthly_rent}
                          className={`${landlordInputClass} w-28 py-2 text-sm`}
                          onBlur={(e) => {
                            const next = Number(e.target.value);
                            if (next && next !== Number(unit.monthly_rent)) handleUpdateRent(unit.id, next);
                          }}
                        />
                        <span className="text-xs text-slate-500">N$/mo</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    placeholder="New unit ID"
                    value={unitForms[property.id]?.unit_identifier || ''}
                    onChange={(e) =>
                      setUnitForms((prev) => ({
                        ...prev,
                        [property.id]: { ...prev[property.id], unit_identifier: e.target.value, monthly_rent: prev[property.id]?.monthly_rent || '' },
                      }))
                    }
                    className={landlordInputClass}
                  />
                  <input
                    placeholder="Rent N$"
                    type="number"
                    value={unitForms[property.id]?.monthly_rent || ''}
                    onChange={(e) =>
                      setUnitForms((prev) => ({
                        ...prev,
                        [property.id]: { unit_identifier: prev[property.id]?.unit_identifier || '', monthly_rent: e.target.value },
                      }))
                    }
                    className={landlordInputClass}
                  />
                  <button type="button" onClick={() => handleAddUnit(property.id)} className="landlord-btn-primary">
                    Add unit
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyStateCard title="No properties yet" description="Add your first property to get started." />
          </div>
        )}
      </section>
    </div>
  );
}
