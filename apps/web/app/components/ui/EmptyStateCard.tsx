'use client';

export default function EmptyStateCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center">
      <p className="text-2xl">📭</p>
      <p className="mt-2 text-sm font-semibold text-gray-800">{title}</p>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
    </div>
  );
}
