/**
 * Staging E2E smoke: invite → tenant dashboard → payments → admin health smoke.
 * Usage: node scripts/smoke-staging-e2e.mjs
 * Requires API on API_URL (default http://localhost:3001) and demo seed.
 */

const API = process.env.API_URL ?? 'http://localhost:3001';

const DEMO = {
  admin: { email: 'admin@rentcredit.demo', password: 'DemoAdmin123!' },
  landlord: { email: 'landlord@rentcredit.demo', password: 'DemoLandlord123!' },
  tenant: { email: 'tenant@rentcredit.demo', password: 'DemoTenant123!' },
};

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { res, body };
}

async function login(email, password) {
  const { res, body } = await jsonFetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(body?.message || body?.error || `HTTP ${res.status}`);
  const payload = body?.data?.data ?? body?.data ?? body;
  const session = payload?.session ?? body?.data?.session;
  if (!session?.access_token) throw new Error('No access token');
  return { token: session.access_token, requires2fa: Boolean(payload?.requires_two_factor) };
}

const results = [];

async function run(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: e?.message ?? String(e) });
    console.error(`✗ ${name}:`, e?.message ?? e);
  }
}

async function main() {
  console.log(`\nCRENIT staging E2E smoke\nAPI: ${API}\n`);

  let adminToken;
  let landlordToken;
  let tenantToken;

  await run('Login admin', async () => {
    const { token } = await login(DEMO.admin.email, DEMO.admin.password);
    adminToken = token;
  });

  await run('Login landlord', async () => {
    const { token, requires2fa } = await login(DEMO.landlord.email, DEMO.landlord.password);
    landlordToken = token;
    if (requires2fa) {
      throw new Error('Landlord has 2FA — run POST /auth/2fa/verify-session or disable for smoke');
    }
  });

  await run('Login tenant', async () => {
    const { token } = await login(DEMO.tenant.email, DEMO.tenant.password);
    tenantToken = token;
  });

  await run('Landlord invite tenant (API)', async () => {
    const propsRes = await jsonFetch(`${API}/landlords/properties`, {
      headers: { Authorization: `Bearer ${landlordToken}` },
    });
    if (!propsRes.res.ok) throw new Error(propsRes.body?.message || 'properties failed');
    const unit = (propsRes.body?.data || []).flatMap((p) => p.units || [])[0];
    const email = `e2e.${Date.now()}@rentcredit.demo`;
    const { res, body } = await jsonFetch(`${API}/landlords/invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${landlordToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: 'E2E Invitee', unit_id: unit?.id }),
    });
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
    if (!body?.data?.invite?.token) throw new Error('No invite token');
  });

  await run('Tenant /tenants/me + paymentMetrics', async () => {
    const { res, body } = await jsonFetch(`${API}/tenants/me`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
    const metrics = body?.data?.paymentMetrics;
    if (!metrics || typeof metrics.consecutive_on_time_streak !== 'number') {
      throw new Error('Missing paymentMetrics');
    }
  });

  await run('Tenant credit-score/me', async () => {
    const { res, body } = await jsonFetch(`${API}/credit-score/me`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
    if (body?.data?.score == null) throw new Error('No score');
  });

  await run('Tenant payments/upcoming (KYC gate)', async () => {
    const { res, body } = await jsonFetch(`${API}/payments/upcoming`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    if (res.status === 401 && body?.message?.includes('KYC')) {
      console.log('  (skip pay — tenant KYC not approved in seed)');
      return;
    }
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
  });

  await run('Landlord overview (payments in portfolio)', async () => {
    const { res, body } = await jsonFetch(`${API}/landlords/overview`, {
      headers: { Authorization: `Bearer ${landlordToken}` },
    });
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
    if (!body?.data?.stats) throw new Error('Missing overview stats');
  });

  await run('Admin 2FA status endpoint', async () => {
    const { res, body } = await jsonFetch(`${API}/auth/2fa/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
    if (body?.data?.method == null && body?.data?.enabled == null) throw new Error('Invalid 2FA status shape');
  });

  await run('Admin system-health smoke', async () => {
    const { res, body } = await jsonFetch(`${API}/admin/system-health/smoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
    if (!Array.isArray(body?.data?.checks)) throw new Error('Missing checks array');
  });

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} E2E checks passed\n`);
  process.exit(passed === results.length ? 0 : 1);
}

main();
