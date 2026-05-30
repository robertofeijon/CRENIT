/**
 * Pre-presentation smoke test — registration, login, roles, admin KYC, invite.
 * Usage: node scripts/smoke-presentation.mjs
 * Requires API on http://localhost:3001
 */

const API = process.env.API_URL ?? 'http://localhost:3001';
const WEB = process.env.WEB_URL ?? 'http://localhost:3002';

const DEMO = {
  admin: { email: 'admin@rentcredit.demo', password: 'DemoAdmin123!', role: 'ADMIN' },
  landlord: { email: 'landlord@rentcredit.demo', password: 'DemoLandlord123!', role: 'LANDLORD' },
  tenant: { email: 'tenant@rentcredit.demo', password: 'DemoTenant123!', role: 'TENANT' },
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
  const session = body?.data?.data?.session ?? body?.data?.session;
  if (!session?.access_token) throw new Error('No access token in login response');
  return session.access_token;
}

async function authMe(token) {
  const { res, body } = await jsonFetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
  return body?.data?.profile;
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
  console.log(`\nCRENIT presentation smoke test\nAPI: ${API}\nWEB: ${WEB}\n`);

  await run('API auth health', async () => {
    const { res } = await jsonFetch(`${API}/auth/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });

  await run('API admin health', async () => {
    const { res } = await jsonFetch(`${API}/admin/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });

  await run('API landlords health', async () => {
    const { res } = await jsonFetch(`${API}/landlords/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  });

  await run('Web homepage', async () => {
    const res = await fetch(WEB);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    if (!html.includes('CRENIT')) throw new Error('Missing CRENIT');
  });

  for (const [label, creds] of Object.entries(DEMO)) {
    await run(`Login ${label} (${creds.email})`, async () => {
      const token = await login(creds.email, creds.password);
      const profile = await authMe(token);
      const role = (profile?.role || '').toUpperCase();
      if (role !== creds.role) {
        throw new Error(`Expected role ${creds.role}, got ${role}`);
      }
    });
  }

  await run('Admin KYC queue (no 500)', async () => {
    const token = await login(DEMO.admin.email, DEMO.admin.password);
    const { res, body } = await jsonFetch(`${API}/admin/kyc/pending?status=PENDING&limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
    if (!body?.success) throw new Error('success=false');
    if (!Array.isArray(body?.data?.submissions)) throw new Error('Missing submissions array');
  });

  await run('Landlord overview', async () => {
    const token = await login(DEMO.landlord.email, DEMO.landlord.password);
    const { res, body } = await jsonFetch(`${API}/landlords/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
  });

  await run('Tenant dashboard /tenants/me', async () => {
    const token = await login(DEMO.tenant.email, DEMO.tenant.password);
    const { res, body } = await jsonFetch(`${API}/tenants/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
    if (!body?.data?.profile) throw new Error('Missing profile');
  });

  await run('Register new tenant (unique email)', async () => {
    const email = `smoke.${Date.now()}@rentcredit.demo`;
    const { res, body } = await jsonFetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'SmokeTest123!',
        full_name: 'Smoke Test User',
        role: 'TENANT',
        market_data_consent: true,
      }),
    });
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
    const token = await login(email, 'SmokeTest123!');
    const profile = await authMe(token);
    if ((profile?.role || '').toUpperCase() !== 'TENANT') {
      throw new Error(`New user role should be TENANT, got ${profile?.role}`);
    }
  });

  await run('Register duplicate email → 400', async () => {
    const { res } = await jsonFetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: DEMO.tenant.email,
        password: 'SmokeTest123!',
        full_name: 'Duplicate',
        role: 'TENANT',
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await run('Landlord tenant invite (API)', async () => {
    const token = await login(DEMO.landlord.email, DEMO.landlord.password);
    const propsRes = await jsonFetch(`${API}/landlords/properties`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!propsRes.res.ok) throw new Error('Cannot load properties');
    const properties = propsRes.body?.data || [];
    const unit = properties.flatMap((p) => (p.units || []).map((u) => ({ ...u, property_name: p.property_name })))[0];
    const inviteEmail = `invite.${Date.now()}@example.com`;
    const { res, body } = await jsonFetch(`${API}/landlords/invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail,
        full_name: 'Invited Tenant',
        unit_id: unit?.id,
      }),
    });
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
    if (!body?.data?.invite?.token) throw new Error('No invite token returned');
  });

  await run('Lease document PDF endpoint', async () => {
    const token = await login(DEMO.landlord.email, DEMO.landlord.password);
    const propsRes = await jsonFetch(`${API}/landlords/properties`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!propsRes.res.ok) throw new Error(propsRes.body?.message || `properties HTTP ${propsRes.res.status}`);
    const unit = (propsRes.body?.data || []).flatMap((p) => p.units || [])[0];
    if (!unit?.id) throw new Error('No unit in portfolio — run supabase seed for demo landlord');
    const pdfRes = await fetch(`${API}/landlords/leases/document/download`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unit_id: unit.id,
        tenant_full_name: 'Test Tenant',
        monthly_rent: unit.monthly_rent || 5000,
        start_date: '2026-06-01',
        payment_method: 'PLATFORM',
      }),
    });
    if (!pdfRes.ok) {
      const errText = await pdfRes.text();
      throw new Error(errText.slice(0, 200) || `HTTP ${pdfRes.status}`);
    }
    const ct = pdfRes.headers.get('content-type') || '';
    if (!ct.includes('pdf')) throw new Error(`Expected PDF, got ${ct}`);
  });

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${passed}/${results.length} passed`);
  if (failed.length) {
    console.log('\nFailed:');
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.error}`));
    process.exit(1);
  }
  console.log('\nReady for presentation.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
