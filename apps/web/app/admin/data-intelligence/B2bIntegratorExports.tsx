'use client';

import { useState } from 'react';
import api from '../../../src/lib/api';

type Props = {
  onError: (message: string) => void;
};

async function downloadBlob(path: string, filename: string) {
  const res = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function B2bIntegratorExports({ onError }: Props) {
  const [busy, setBusy] = useState<'openapi' | 'postman' | null>(null);

  const run = async (kind: 'openapi' | 'postman') => {
    setBusy(kind);
    try {
      if (kind === 'openapi') {
        await downloadBlob('/admin/data-intelligence/integrator/openapi.json', 'crenit-data-intelligence-openapi.json');
      } else {
        await downloadBlob(
          '/admin/data-intelligence/integrator/postman.json',
          'crenit-data-intelligence.postman_collection.json',
        );
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      onError(apiErr?.response?.data?.message || apiErr?.message || 'Download failed.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="admin-list-item">
      <h3 className="font-semibold text-[#1A1A1A]">Integrator exports</h3>
      <p className="mt-1 text-sm text-slate-600">
        OpenAPI 3.0 and Postman v2.1 generated from the live B2B catalog. B2B clients can also fetch{' '}
        <code className="text-xs">GET /api/v1/openapi.json</code> with <code className="text-xs">X-CRENIT-Key</code>.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run('openapi')}
          className="rounded-full bg-[#1A1A1A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === 'openapi' ? 'Downloading…' : 'Download OpenAPI'}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run('postman')}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {busy === 'postman' ? 'Downloading…' : 'Download Postman collection'}
        </button>
      </div>
    </div>
  );
}
