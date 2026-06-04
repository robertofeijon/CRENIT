export const dynamic = 'force-dynamic';
import Logo from '../../components/ui/Logo';

type VerifyResult = {
  authentic?: boolean;
  message?: string;
  score?: number;
  tier?: string;
  generated_at?: string;
};

async function fetchVerification(reference: string): Promise<VerifyResult | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  try {
    const res = await fetch(`${apiUrl}/reports/verify/${encodeURIComponent(reference)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export default async function VerifyReportPage({ params }: { params: { reference: string } }) {
  const reference = params?.reference ?? '';
  const result = reference ? await fetchVerification(reference) : null;

  return (
    <main className="min-h-screen bg-[#F3F4F6] px-4 py-8">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
        <Logo />
        <h1 className="mt-3 text-2xl font-semibold text-[#1A1A1A]">Report verification</h1>
        <p className="mt-2 text-sm text-slate-600">Reference: {reference}</p>

        {result?.authentic ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="font-semibold text-emerald-800">{result.message ?? 'This report is authentic.'}</p>
            <p className="mt-2 text-sm text-emerald-900">Score: {result.score}</p>
            <p className="text-sm text-emerald-900">Tier: {result.tier}</p>
            <p className="text-sm text-emerald-900">
              Generated: {result.generated_at ? new Date(result.generated_at).toLocaleString() : '—'}
            </p>
            <p className="mt-2 text-sm text-emerald-900">Tenant verified: Yes</p>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <p className="font-semibold text-rose-800">Report not found.</p>
            <p className="mt-2 text-sm text-rose-900">This reference could not be verified. Check the code on the PDF and try again.</p>
          </div>
        )}
      </div>
    </main>
  );
}
