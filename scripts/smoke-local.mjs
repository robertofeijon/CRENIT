/**
 * Quick local smoke test. Usage: node scripts/smoke-local.mjs
 * Requires API on http://localhost:3001
 */

const API = process.env.API_URL ?? 'http://localhost:3001';
const WEB = process.env.WEB_URL ?? 'http://localhost:3002';

async function check(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (error) {
    console.error(`✗ ${name}:`, error?.message ?? error);
    return false;
  }
}

async function main() {
  let passed = 0;
  let total = 0;

  const run = async (name, fn) => {
    total += 1;
    if (await check(name, fn)) passed += 1;
  };

  await run('API auth health', async () => {
    const res = await fetch(`${API}/auth/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error('success=false');
  });

  await run('API admin health', async () => {
    const res = await fetch(`${API}/admin/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });

  await run('Report verify endpoint', async () => {
    const res = await fetch(`${API}/reports/verify/RC-TEST01`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error('success=false');
  });

  await run('Admin login', async () => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@rentcredit.demo', password: 'DemoAdmin123!' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const session = json?.data?.session ?? json?.data?.data?.session;
    if (!session?.access_token) throw new Error('No session token');
  });

  await run('Web homepage', async () => {
    const res = await fetch(WEB);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    if (!html.includes('CRENIT')) throw new Error('Missing CRENIT branding');
  });

  await run('Web verify page', async () => {
    const res = await fetch(`${WEB}/verify/RC-TEST01`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    if (!html.includes('Report verification') && !html.includes('Report not found')) {
      throw new Error('Unexpected verify page HTML');
    }
  });

  console.log(`\n${passed}/${total} checks passed`);
  process.exit(passed === total ? 0 : 1);
}

main();
