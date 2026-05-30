'use client';

import { useRef, type ChangeEvent } from 'react';
import { Camera, Upload } from 'lucide-react';
import { useIsMobile } from '../../../src/hooks/useIsMobile';

type Props = {
  label: string;
  hint: string;
  disabled?: boolean;
  uploading?: boolean;
  fileName?: string | null;
  /** When true, mobile shows front-camera capture for selfies. */
  selfieMode?: boolean;
  /** When true, mobile can use rear camera for document photos (e.g. ID). */
  documentCameraMode?: boolean;
  onFileSelect: (file: File) => void;
};

export default function KycDocumentUploadField({
  label,
  hint,
  disabled,
  uploading,
  fileName,
  selfieMode,
  documentCameraMode,
  onFileSelect,
}: Props) {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const showCamera = isMobile && (selfieMode || documentCameraMode);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFileSelect(file);
    event.target.value = '';
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-[#F3F4F6] px-4 py-3 text-sm text-slate-600">
        <Upload className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">{fileName || 'Choose file (PDF or image)…'}</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          disabled={disabled || uploading}
          onChange={handleChange}
          className="hidden"
        />
      </label>

      {showCamera ? (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => cameraInputRef.current?.click()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#C0392B]/30 bg-white px-4 py-3 text-sm font-semibold text-[#C0392B] transition hover:bg-[#FDEDEC] disabled:opacity-50"
        >
          <Camera className="h-4 w-4" aria-hidden />
          {selfieMode ? 'Take selfie' : 'Take photo'}
        </button>
      ) : null}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture={selfieMode ? 'user' : documentCameraMode ? 'environment' : undefined}
        disabled={disabled || uploading}
        onChange={handleChange}
        className="hidden"
      />

      <p className="text-xs text-slate-500">{hint}</p>
      {uploading ? <p className="text-xs font-medium text-[#C0392B]">Uploading…</p> : null}
    </div>
  );
}
