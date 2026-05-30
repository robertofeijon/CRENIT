'use client';

type Props = {
  url: string;
  fileName?: string;
  className?: string;
};

export default function DocumentInlinePreview({ url, fileName, className = '' }: Props) {
  const lower = (fileName || url).toLowerCase();
  const isPdf = lower.endsWith('.pdf') || url.includes('application/pdf');

  if (!url) {
    return <p className="text-xs text-slate-500">No preview available.</p>;
  }

  if (isPdf) {
    return (
      <iframe
        title={fileName || 'Document preview'}
        src={url}
        className={`h-64 w-full rounded-lg border border-slate-200 bg-white ${className}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={fileName || 'Document'}
      className={`max-h-64 w-full rounded-lg border border-slate-200 object-contain bg-slate-50 ${className}`}
    />
  );
}
