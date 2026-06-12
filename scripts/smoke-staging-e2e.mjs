/**
 * Staging E2E smoke: invite → accept → KYC → approve → EFT confirm → score; renewal; cron probe.
 * Usage: API_URL=https://your-api npm run smoke:staging
 * Optional: CRON_SECRET to probe GET /internal/cron/jobs
 * Requires API running and demo seed (or staging).
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
  let inviteToken;
  let inviteEmail;
  let lifecycleTenantToken;
  let lifecycleTenantId;

  const FAKE_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const LIFECYCLE_PASSWORD = 'E2eLifecycle123!';

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
    inviteEmail = email;
    const { res, body } = await jsonFetch(`${API}/landlords/invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${landlordToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: 'E2E Invitee', unit_id: unit?.id }),
    });
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`);
    if (!body?.data?.invite?.token) throw new Error('No invite token');
    inviteToken = body.data.invite.token;
  });

  await run('Invite accept → lease + pending payment', async () => {
    if (!inviteToken) throw new Error('No invite token');
    const { res, body } = await jsonFetch(`${API}/auth/invite/${inviteToken}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: 'E2E Lifecycle', password: LIFECYCLE_PASSWORD }),
    });
    if (!res.ok) throw new Error(body?.message || 'invite accept failed');
    lifecycleTenantId = body?.data?.tenant_id;
    if (!lifecycleTenantId) throw new Error('No tenant_id after accept');
  });

  await run('New tenant KYC submit → admin approve', async () => {
    const { token } = await login(inviteEmail, LIFECYCLE_PASSWORD);
    lifecycleTenantToken = token;
    const fakeDoc = { filename: 'e2e.png', fileBase64: FAKE_PNG_BASE64 };
    const kycRes = await jsonFetch(`${API}/kyc/wizard/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${lifecycleTenantToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personal: {
          first_name: 'E2E',
          surname: 'Lifecycle',
          phone: '+264811000999',
          date_of_birth: '1990-01-15',
          gender: 'OTHER',
          nationality: 'Namibian',
          national_id_number: `E2E${Date.now()}`,
        },
        residence: {
          country: 'Namibia',
          region: 'Khomas',
          city: 'Windhoek',
          street_address: '123 Test Street',
          postal_code: '10001',
          residential_status: 'TENANT',
        },
        documents: {
          government_id: fakeDoc,
          selfie: fakeDoc,
          income_proof: fakeDoc,
          proof_of_address: fakeDoc,
        },
      }),
    });
    if (!kycRes.res.ok) throw new Error(kycRes.body?.message || 'KYC wizard submit failed');
    const approveRes = await jsonFetch(`${API}/admin/kyc/review/${lifecycleTenantId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });
    if (!approveRes.res.ok) throw new Error(approveRes.body?.message || 'KYC approve failed');
  });

  await run('New tenant EFT pending → landlord confirm → score', async () => {
    if (!lifecycleTenantToken) throw new Error('Lifecycle tenant not logged in');
    const upcomingRes = await jsonFetch(`${API}/payments/upcoming`, {
      headers: { Authorization: `Bearer ${lifecycleTenantToken}` },
    });
    if (!upcomingRes.res.ok) throw new Error(upcomingRes.body?.message || 'upcoming payments failed');
    const listRes = await jsonFetch(`${API}/landlords/payments?status=PENDING&limit=30`, {
      headers: { Authorization: `Bearer ${landlordToken}` },
    });
    if (!listRes.res.ok) throw new Error(listRes.body?.message || 'landlord payments failed');
    const payments = listRes.body?.data?.payments ?? listRes.body?.data ?? [];
    const pending = (Array.isArray(payments) ? payments : []).find((p) => p.tenant_id === lifecycleTenantId);
    if (!pending?.id) {
      console.log('  (no pending payment for lifecycle tenant — skip confirm)');
      return;
    }
    const confirmRes = await jsonFetch(`${API}/landlords/payments/${pending.id}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${landlordToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ received_date: new Date().toISOString().slice(0, 10) }),
    });
    if (!confirmRes.res.ok) throw new Error(confirmRes.body?.message || 'payment confirm failed');
    const scoreRes = await jsonFetch(`${API}/credit-score/me`, {
      headers: { Authorization: `Bearer ${lifecycleTenantToken}` },
    });
    if (!scoreRes.res.ok) throw new Error(scoreRes.body?.message || 'credit score failed');
    if (scoreRes.body?.data?.score == null) throw new Error('No score after payment confirm');
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

  await run('Landlord confirm pending payment (if any)', async () => {
    const listRes = await jsonFetch(`${API}/landlords/payments?status=PENDING&limit=5`, {
      headers: { Authorization: `Bearer ${landlordToken}` },
    });
    if (!listRes.res.ok) throw new Error(listRes.body?.message || 'payments list failed');
    const payments = listRes.body?.data?.payments ?? listRes.body?.data ?? [];
    const pending = Array.isArray(payments) ? payments : payments.items || [];
    const first = pending.find((p) => p.status === 'PENDING' || p.status === 'PROCESSING');
    if (!first?.id) {
      console.log('  (no pending payment to confirm — OK for empty seed)');
      return;
    }
    const confirmRes = await jsonFetch(`${API}/landlords/payments/${first.id}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${landlordToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ received_date: new Date().toISOString().slice(0, 10) }),
    });
    if (!confirmRes.res.ok) throw new Error(confirmRes.body?.message || 'confirm failed');
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
    const obs = body?.data?.observability;
    if (obs) {
      console.log(`  observability: sentry=${obs.sentry_api ? 'on' : 'off'}, cron=${obs.cron_secret_configured ? 'on' : 'off'}`);
    }
  });

  await run('Landlord propose lease renewal', async () => {
    const leasesRes = await jsonFetch(`${API}/landlords/leases`, {
      headers: { Authorization: `Bearer ${landlordToken}` },
    });
    if (!leasesRes.res.ok) throw new Error(leasesRes.body?.message || 'leases list failed');
    const lease = (leasesRes.body?.data || []).find((l) => l.status === 'ACTIVE' && l.end_date);
    if (!lease) {
      console.log('  (no active lease with end_date — skip renewal propose)');
      return;
    }
    const proposeRes = await jsonFetch(`${API}/landlords/leases/${lease.id}/renewals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${landlordToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposed_rent: lease.monthly_rent }),
    });
    if (!proposeRes.res.ok && !proposeRes.body?.message?.includes('already exists')) {
      throw new Error(proposeRes.body?.message || 'renewal propose failed');
    }
  });

  await run('Tenant accept lease renewal', async () => {
    const renewalsRes = await jsonFetch(`${API}/tenants/renewals`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    if (!renewalsRes.res.ok) throw new Error(renewalsRes.body?.message || 'renewals list failed');
    const renewal = (renewalsRes.body?.data || []).find((r) => r.status !== 'APPROVED' && r.status !== 'REJECTED');
    if (!renewal) {
      console.log('  (no pending renewal — skip tenant accept)');
      return;
    }
    const respondRes = await jsonFetch(`${API}/tenants/renewals/respond`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ renewal_id: renewal.id, action: 'APPROVE' }),
    });
    if (!respondRes.res.ok) throw new Error(respondRes.body?.message || 'tenant renewal accept failed');
  });

  await run('External cron job registry', async () => {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) {
      console.log('  (skip — set CRON_SECRET to probe /internal/cron/jobs)');
      return;
    }
    const { res, body } = await jsonFetch(`${API}/internal/cron/jobs`, {
      headers: { 'X-Cron-Secret': secret },
    });
    if (!res.ok) throw new Error(body?.message || body?.error || 'cron jobs list failed');
    if (!Array.isArray(body?.data?.jobs) || !body.data.jobs.length) throw new Error('No cron jobs returned');
    console.log(`  jobs: ${body.data.jobs.join(', ')}`);
  });

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} E2E checks passed\n`);
  process.exit(passed === results.length ? 0 : 1);
}

main();
