import { createClient } from '@supabase/supabase-js';

const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

if (!hasSupabaseEnv && typeof window !== 'undefined') {
  // Non-fatal in local builds; runtime features that call Supabase will require real env vars.
  // This keeps production builds from failing during static prerender.
  console.warn('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Supabase calls will fail until configured.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
