"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';

const PROPERTY_TYPES = ['APARTMENT', 'HOUSE', 'FLAT', 'TOWNHOUSE', 'ROOM', 'COMMERCIAL'];

export default function LandlordPropertiesPage() {
  const { user, loading } = useAuth();
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
    if (!loading && user) loadProperties();
  }, [loading, user, router]);

  const loadProperties = async () => {
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
  };

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
    return <div className="min-h-screen bg-slate-50 p-8">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Properties</h1>
              <p className="mt-3 text-sm text-slate-600">Register properties and units, set rent amounts, and manage your portfolio.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => router.push('/landlord')} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
                Back
              </button>
              <button onClick={() => setShowForm((v) => !v)} className="rounded-2xl bg-brand-red px-5 py-3 text-sm font-semibold text-white">
                {showForm ? 'Cancel' : 'Add property'}
              </button>
            </div>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

        {showForm ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">New property</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <input placeholder="Property name *" value={form.property_name} onChange={(e) => setForm({ ...form, property_name: e.target.value })} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
              <select value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value })} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm">
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input placeholder="Street address *" value={form.address_street} onChange={(e) => setForm({ ...form, address_street: e.target.value })} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm sm:col-span-2" />
              <input placeholder="Suburb *" value={form.address_suburb} onChange={(e) => setForm({ ...form, address_suburb: e.target.value })} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
              <input placeholder="City *" value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
              <input placeholder="Postcode" value={form.address_postcode} onChange={(e) => setForm({ ...form, address_postcode: e.target.value })} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
              <input placeholder="First unit ID (optional)" value={form.unit_identifier} onChange={(e) => setForm({ ...form, unit_identifier: e.target.value })} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
              <input placeholder="Monthly rent N$ (optional)" type="number" value={form.monthly_rent} onChange={(e) => setForm({ ...form, monthly_rent: e.target.value })} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
            </div>
            <label className="mt-4 flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={marketDataConsent}
                onChange={(e) => setMarketDataConsent(e.target.checked)}
                className="mt-1"
              />
              <span>
                I agree that anonymised, aggregated property and payment data from my portfolio may be used for
                Namibian rental market intelligence. Individual records are never sold.
              </span>
            </label>
            <button onClick={handleCreateProperty} disabled={isLoading} className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {isLoading ? 'Saving...' : 'Create property'}
            </button>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Your portfolio</h2>
          {isLoading && !properties.length ? (
            <p className="mt-4 text-sm text-slate-500">Loading properties...</p>
          ) : properties.length ? (
            <div className="mt-6 space-y-6">
              {properties.map((property) => (
                <div key={property.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <h3 className="text-lg font-semibold text-slate-900">{property.property_name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{property.address_street}, {property.address_suburb}, {property.address_city}</p>
                  <p className="mt-1 text-xs uppercase tracking-widest text-slate-500">{property.property_type}</p>

                  <div className="mt-4 space-y-3">
                    {(property.units || []).map((unit: any) => (
                      <div key={unit.id} className="flex flex-col gap-3 rounded-2xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">Unit {unit.unit_identifier}</p>
                          <p className="text-sm text-slate-600">Rent: N${Number(unit.monthly_rent).toLocaleString()}/mo</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            defaultValue={unit.monthly_rent}
                            className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm"
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

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input
                      placeholder="New unit ID"
                      value={unitForms[property.id]?.unit_identifier || ''}
                      onChange={(e) => setUnitForms((prev) => ({ ...prev, [property.id]: { ...prev[property.id], unit_identifier: e.target.value, monthly_rent: prev[property.id]?.monthly_rent || '' } }))}
                      className="rounded-2xl border border-slate-300 px-4 py-2 text-sm"
                    />
                    <input
                      placeholder="Rent N$"
                      type="number"
                      value={unitForms[property.id]?.monthly_rent || ''}
                      onChange={(e) => setUnitForms((prev) => ({ ...prev, [property.id]: { unit_identifier: prev[property.id]?.unit_identifier || '', monthly_rent: e.target.value } }))}
                      className="rounded-2xl border border-slate-300 px-4 py-2 text-sm"
                    />
                    <button onClick={() => handleAddUnit(property.id)} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                      Add unit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No properties yet. Add your first property to get started.</p>
          )}
        </section>
      </div>
    </main>
  );
}
