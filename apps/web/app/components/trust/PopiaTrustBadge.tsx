import Link from 'next/link';

type Props = {
  className?: string;
};

export default function PopiaTrustBadge({ className = '' }: Props) {
  return (
    <div
      className={`rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950 ${className}`}
      role="note"
    >
      <p className="font-semibold text-emerald-900">POPIA-aligned data handling</p>
      <p className="mt-1 leading-relaxed">
        CRENIT processes your information for identity verification and rent reporting under Namibia&apos;s data protection
        framework. Documents are stored securely and never sold.
      </p>
      <Link href="/company/popia-summary" className="mt-2 inline-block font-semibold text-[#C0392B] hover:underline">
        Plain-language privacy summary →
      </Link>
    </div>
  );
}
