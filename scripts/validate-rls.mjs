/**
 * RLS validation using Supabase anon key + tenant JWT (not service role).
 * Usage: node scripts/validate-rls.mjs
 *
 * Requires .env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 * Demo tenant: tenant@rentcredit.demo / DemoTenant123! (run npm run seed:demo first)
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[trimmed.slice(0, eq).trim()] = value;
  }
  return env;
}

const env = { ...loadEnvFile(join(rootDir, '.env')), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
const tenantEmail = env.RLS_TEST_TENANT_EMAIL || 'tenant@rentcredit.demo';
const tenantPassword = env.RLS_TEST_TENANT_PASSWORD || 'DemoTenant123!';

const results = [];

function assert(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(ok ? `✓ ${name}` : `✗ ${name}: ${detail}`);
}

async function main() {
  if (!url || !anonKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

  const { data: signIn, error: signErr } = await supabase.auth.signInWithPassword({
    email: tenantEmail,
    password: tenantPassword,
  });
  if (signErr || !signIn.user) {
    console.error('Tenant login failed:', signErr?.message || 'no user');
    console.error('Run: npm run seed:demo');
    process.exit(1);
  }

  const uid = signIn.user.id;
  console.log(`\nRLS check as tenant ${tenantEmail} (${uid})\n`);

  const { data: profile, error: profileErr } = await supabase.from('profiles').select('id, role').eq('id', uid).maybeSingle();
  assert('profiles_select_own', !profileErr && profile?.id === uid, profileErr?.message || 'profile mismatch');

  const { data: allProfiles, error: allProfErr } = await supabase.from('profiles').select('id').limit(5);
  const leakedProfiles = (allProfiles || []).filter((p) => p.id !== uid);
  assert(
    'profiles_no_other_rows',
    !allProfErr && leakedProfiles.length === 0,
    allProfErr?.message || `saw ${leakedProfiles.length} other profile row(s)`,
  );

  const { data: payments, error: payErr } = await supabase.from('payments').select('id, tenant_id').limit(50);
  const badPayments = (payments || []).filter((p) => p.tenant_id !== uid);
  assert(
    'payments_tenant_scope',
    !payErr && badPayments.length === 0,
    payErr?.message || `${badPayments.length} payment(s) for other tenants`,
  );

  const { data: notes, error: noteErr } = await supabase.from('notifications').select('id, user_id').limit(20);
  const badNotes = (notes || []).filter((n) => n.user_id !== uid);
  assert(
    'notifications_owner_scope',
    !noteErr && badNotes.length === 0,
    noteErr?.message || `${badNotes.length} notification(s) for other users`,
  );

  const fakeId = '00000000-0000-4000-8000-000000000001';
  const { data: foreignPay, error: foreignErr } = await supabase.from('payments').select('id').eq('tenant_id', fakeId).limit(1);
  assert(
    'payments_foreign_tenant_empty',
    !foreignErr && (foreignPay || []).length === 0,
    foreignErr?.message || 'unexpected foreign tenant rows',
  );

  await supabase.auth.signOut();

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} RLS checks passed`);
  console.log('\nNote: Nest API uses service_role and bypasses RLS — this script validates direct Supabase client access.\n');
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
