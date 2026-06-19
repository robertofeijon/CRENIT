'use client';

import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import api from '../../../src/lib/api';

const CSV_TEMPLATE = `property_name,address_street,address_suburb,address_city,property_type,unit_identifier,bedrooms,bathrooms,monthly_rent
Sunset Flats,12 Independence Ave,Kleine Kuppe,Windhoek,APARTMENT,Unit A,2,1,8500
Sunset Flats,12 Independence Ave,Kleine Kuppe,Windhoek,APARTMENT,Unit B,1,1,7200`;

export default function PropertiesBulkImport({ onImported }: { onImported?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crenit-properties-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const csv = await file.text();
      const res = await api.post('/landlords/properties/import-csv', { csv });
      const data = res.data.data;
      setMessage(`Imported ${data.units_created} unit(s) across ${data.properties_created} new propert${data.properties_created === 1 ? 'y' : 'ies'}.`);
      onImported?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'CSV import failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="landlord-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Bulk unit import</h2>
          <p className="mt-1 text-sm text-slate-600">
            Upload a CSV to add multiple properties and units at once (max 100 rows). Required columns: property_name,
            address_street, address_suburb, address_city, property_type, unit_identifier, monthly_rent.
          </p>
        </div>
        <button type="button" onClick={downloadTemplate} className="landlord-btn-secondary">
          <Download className="h-4 w-4" aria-hidden />
          Template
        </button>
      </div>
      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-[#F3F4F6] px-6 py-8 text-center transition hover:border-[#C0392B]/40">
        <Upload className="h-8 w-8 text-slate-400" aria-hidden />
        <span className="mt-2 text-sm font-semibold text-[#1A1A1A]">{busy ? 'Importing…' : 'Choose CSV file'}</span>
        <span className="mt-1 text-xs text-slate-500">APARTMENT, HOUSE, FLAT, TOWNHOUSE, ROOM, COMMERCIAL</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
      </label>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-3 text-sm font-medium text-emerald-700">{message}</p> : null}
    </section>
  );
}
