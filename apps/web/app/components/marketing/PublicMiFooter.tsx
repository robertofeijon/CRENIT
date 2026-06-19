import Link from 'next/link';
import { formatPipelineUpdatedAt } from '../../../src/lib/public-market-intelligence';

export default function PublicMiFooter({ pipelineUpdatedAt }: { pipelineUpdatedAt?: string | null }) {
  const formatted = formatPipelineUpdatedAt(pipelineUpdatedAt ?? null);

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          {formatted ? (
            <>
              Last updated <time dateTime={pipelineUpdatedAt ?? undefined}>{formatted}</time>
            </>
          ) : (
            'Pipeline refresh time unavailable'
          )}
          <span className="mx-2 text-slate-300" aria-hidden>
            ·
          </span>
          <Link href="/data/methodology" className="font-semibold text-[#C0392B] hover:underline">
            Methodology
          </Link>
        </p>
        <p className="text-xs text-slate-500">
          Aggregates only · n≥10 suppression · no tenant identifiers
        </p>
      </div>
    </footer>
  );
}
