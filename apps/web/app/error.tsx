'use client';

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-[#F3F4F6] px-6 py-16">
      <div className="max-w-md rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C0392B]">Something went wrong</p>
        <h1 className="mt-3 text-2xl font-semibold text-[#1A1A1A]">We could not load this page</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-[#C0392B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#992d24]"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-[#1A1A1A] hover:bg-slate-50"
          >
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}
