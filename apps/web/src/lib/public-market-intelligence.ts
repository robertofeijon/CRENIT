export type PublicMarketSuburb = {
  suburb: string;
  city: string;
  median_rent: number;
  on_time_rate: number;
  transaction_count: number;
  trend?: string | null;
  confidence_level?: string | null;
  price_range?: { min?: number; max?: number } | null;
};

export type PublicMarketDashboard = {
  city: string;
  pipeline_updated_at: string | null;
  methodology_path: string;
  minimum_public_sample: number;
  data_provenance: string;
  illustrative_disclaimer: string | null;
  suppressed_suburb_count: number;
  suburbs: PublicMarketSuburb[];
  demo_suburbs: string[];
};

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
}

export async function fetchPublicMarketDashboard(): Promise<PublicMarketDashboard | null> {
  try {
    const res = await fetch(`${apiBase()}/public/market-intelligence/dashboard`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.data ?? null;
  } catch {
    return null;
  }
}

export function formatPipelineUpdatedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('en-NA', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Africa/Windhoek',
    }).format(new Date(iso));
  } catch {
    return null;
  }
}
