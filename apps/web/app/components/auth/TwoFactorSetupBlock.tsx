'use client';

type TwoFactorSetupBlockProps = {
  qrDataUrl: string | null;
  manualKey: string | null;
  message: string | null;
  confirmCode: string;
  onConfirmCodeChange: (value: string) => void;
  twoFactorEnabled: boolean;
  isLoading: boolean;
  inputClass: string;
  onSetup: () => void;
  onConfirm: () => void;
  onDisable: () => void;
  secondaryButtonClass: string;
  primaryButtonClass: string;
};

export default function TwoFactorSetupBlock({
  qrDataUrl,
  manualKey,
  message,
  confirmCode,
  onConfirmCodeChange,
  twoFactorEnabled,
  isLoading,
  inputClass,
  onSetup,
  onConfirm,
  onDisable,
  secondaryButtonClass,
  primaryButtonClass,
}: TwoFactorSetupBlockProps) {
  return (
    <>
      {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
      {qrDataUrl ? (
        <div className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="Authenticator QR code" className="h-36 w-36 rounded-lg bg-white p-2" />
          {manualKey ? (
            <p className="text-sm text-amber-900">
              Or enter manually: <strong className="font-mono text-xs">{manualKey}</strong>
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={confirmCode}
          onChange={(e) => onConfirmCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit code"
          className={`${inputClass} w-40`}
          maxLength={6}
          inputMode="numeric"
        />
        {!twoFactorEnabled ? (
          <>
            <button type="button" onClick={onSetup} disabled={isLoading} className={secondaryButtonClass}>
              {qrDataUrl ? 'New QR code' : 'Set up authenticator'}
            </button>
            <button type="button" onClick={onConfirm} disabled={isLoading || confirmCode.length < 6} className={primaryButtonClass}>
              Enable 2FA
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onDisable}
            disabled={isLoading || confirmCode.length < 6}
            className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            Disable 2FA
          </button>
        )}
      </div>
    </>
  );
}
