'use client';

export default function SkeletonBlocks({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
          <div className="h-4 w-1/3 rounded bg-gray-200" />
          <div className="mt-3 h-3 w-2/3 rounded bg-gray-200" />
          <div className="mt-2 h-3 w-1/2 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
