export default function RootLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-[#F3F4F6] px-4">
      <div className="text-center">
        <div
          className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#C0392B] border-t-transparent"
          role="status"
          aria-label="Loading"
        />
        <p className="mt-4 text-sm text-slate-600">Loading CRENIT…</p>
      </div>
    </div>
  );
}
