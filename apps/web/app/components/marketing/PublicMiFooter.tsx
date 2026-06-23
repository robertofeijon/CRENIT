import Link from 'next/link';
import { formatPipelineUpdatedAt } from '../../../src/lib/public-market-intelligence';

export default function PublicMiFooter({ pipelineUpdatedAt }: { pipelineUpdatedAt?: string | null }) {
  const formatted = formatPipelineUpdatedAt(pipelineUpdatedAt ?? null);

  return (
    <footer className="marketing-mi-footer">
      <div className="marketing-container flex flex-col gap-3 py-8 text-sm text-[var(--rc-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
        <p>
          {formatted ? (
            <>
              Last updated <time dateTime={pipelineUpdatedAt ?? undefined}>{formatted}</time>
            </>
          ) : (
            'Pipeline refresh time unavailable'
          )}
          <span className="mx-2 text-[var(--rc-text-muted)]" aria-hidden>
            ·
          </span>
          <Link href="/data/methodology" className="font-semibold text-[#C0392B] hover:underline">
            Methodology
          </Link>
        </p>
        <p className="text-xs text-[var(--rc-text-muted)]">
          Aggregates only · n≥10 suppression · no tenant identifiers
        </p>
      </div>
    </footer>
  );
}
