import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-[#F3F4F6] px-6 py-16">
      <div className="max-w-md rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C0392B]">404</p>
        <h1 className="mt-3 text-2xl font-semibold text-[#1A1A1A]">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The page you requested does not exist or may have moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-[#C0392B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#992d24]"
          >
            Back to home
          </Link>
          <Link
            href="/auth"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-[#1A1A1A] hover:bg-slate-50"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
