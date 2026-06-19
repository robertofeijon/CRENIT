'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import api from '../../../src/lib/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import TwoFactorSetupBlock from '../../components/auth/TwoFactorSetupBlock';
import ErrorStateCard from '../../components/ui/ErrorStateCard';

export default function AdminSecurityPage() {
  const { user, role, loading, roleReady, refreshAuthProfile } = useAuth();
  const router = useRouter();
  const [twoFactor, setTwoFactor] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && roleReady && !user) router.replace('/auth');
    if (!loading && roleReady && role !== 'ADMIN') router.replace('/auth');
  }, [loading, roleReady, user, role, router]);

  const loadStatus = useCallback(async () => {
    try {
      const res = await api.get('/auth/2fa/status');
      setTwoFactor(res.data?.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load 2FA status.');
    }
  }, []);

  useEffect(() => {
    if (user && role === 'ADMIN') void loadStatus();
  }, [user, role, loadStatus]);

  const handleSetup = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post('/auth/2fa/setup');
      setQrDataUrl(res.data?.data?.qr_data_url || null);
      setManualKey(res.data?.data?.manual_entry_key || null);
      setMessage(res.data?.data?.message || 'Scan the QR code with your authenticator app.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to start 2FA setup.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/2fa/confirm', { code: confirmCode });
      setQrDataUrl(null);
      setManualKey(null);
      setConfirmCode('');
      setMessage('2FA enabled. You can return to the admin dashboard.');
      await loadStatus();
      await refreshAuthProfile();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid code.');
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/2fa/disable', { code: confirmCode });
      setMessage('2FA disabled.');
      await loadStatus();
      await refreshAuthProfile();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to disable 2FA.');
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="space-y-6">
      <AdminPageHeader
        badge="Security"
        title="Admin two-factor authentication"
        subtitle="Required on staging and production when ADMIN_REQUIRE_2FA is enabled."
      />
      {error ? <ErrorStateCard message={error} onRetry={() => void loadStatus()} /> : null}
      {message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#C0392B]" aria-hidden />
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Authenticator app</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Status: {twoFactor?.enabled ? 'Enabled' : 'Not enabled'}
          {twoFactor?.session_active ? ' · Session verified' : ''}
        </p>
        <TwoFactorSetupBlock
          qrDataUrl={qrDataUrl}
          manualKey={manualKey}
          message={null}
          confirmCode={confirmCode}
          onConfirmCodeChange={setConfirmCode}
          twoFactorEnabled={Boolean(twoFactor?.enabled)}
          isLoading={busy}
          inputClass="mt-4 w-full max-w-xs rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          onSetup={handleSetup}
          onConfirm={handleConfirm}
          onDisable={handleDisable}
          secondaryButtonClass="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-[#1A1A1A]"
          primaryButtonClass="rounded-full bg-[#C0392B] px-5 py-2.5 text-sm font-semibold text-white"
        />
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1A1A1A]">SMS two-factor (optional)</h2>
        <p className="mt-2 text-sm text-slate-600">
          Requires SMS_ENABLED on API and a phone on your profile.
          {!twoFactor?.sms_available ? ' SMS is disabled in this environment.' : ''}
        </p>
        {twoFactor?.enabled && twoFactor?.method === 'sms' ? (
          <p className="mt-2 text-sm text-emerald-700">SMS 2FA active{twoFactor.phone_masked ? ` · ${twoFactor.phone_masked}` : ''}.</p>
        ) : (
          <button
            type="button"
            disabled={busy || !twoFactor?.sms_available}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await api.post('/auth/2fa/sms/setup');
                setMessage('SMS code sent — enter below and confirm.');
              } catch (err: any) {
                setError(err?.response?.data?.message || 'SMS setup failed.');
              } finally {
                setBusy(false);
              }
            }}
            className="mt-4 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold"
          >
            Send SMS setup code
          </button>
        )}
        {!twoFactor?.enabled && twoFactor?.method === 'sms' ? (
          <button
            type="button"
            disabled={busy || confirmCode.length < 6}
            onClick={async () => {
              setBusy(true);
              try {
                await api.post('/auth/2fa/sms/confirm', { code: confirmCode });
                setMessage('SMS 2FA enabled.');
                await loadStatus();
              } catch (err: any) {
                setError(err?.response?.data?.message || 'Invalid code.');
              } finally {
                setBusy(false);
              }
            }}
            className="mt-3 rounded-full bg-[#C0392B] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Confirm SMS 2FA
          </button>
        ) : null}
      </section>
    </div>
  );
}
