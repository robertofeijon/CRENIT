import { expect, test } from '@playwright/test';

const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim()?.replace(/\/$/, '');
const tenantEmail = process.env.E2E_TENANT_EMAIL?.trim();
const tenantPassword = process.env.E2E_TENANT_PASSWORD?.trim();
const landlordEmail = process.env.E2E_LANDLORD_EMAIL?.trim() ?? 'landlord@rentcredit.demo';
const landlordPassword = process.env.E2E_LANDLORD_PASSWORD?.trim() ?? 'DemoLandlord123!';

const hasTenantCreds = Boolean(tenantEmail && tenantPassword && apiUrl);

async function apiLogin(request: Parameters<Parameters<typeof test>[1]>[0]['request'], email: string, password: string) {
  const res = await request.post(`${apiUrl}/auth/login`, {
    data: { email, password },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const session = body?.data?.data?.session ?? body?.data?.session ?? body?.session;
  const token = session?.access_token;
  expect(token).toBeTruthy();
  return token as string;
}

test.describe('Staging lifecycle (API + UI)', () => {
  test.skip(!hasTenantCreds, 'Set E2E_TENANT_*, E2E_LANDLORD_* (optional), and NEXT_PUBLIC_API_URL');

  test('tenant can open home after login with lease renewals section', async ({ page }) => {
    await page.goto('/auth');
    await page.getByPlaceholder('you@example.com').fill(tenantEmail!);
    await page.getByPlaceholder('••••••••').fill(tenantPassword!);
    await page.getByRole('button', { name: /^login$/i }).click();
    await expect(page).toHaveURL(/\/tenant\/home/, { timeout: 45_000 });
    await expect(page.getByRole('heading', { name: /lease renewals/i })).toBeVisible();
  });

  test('renewal propose and tenant accept via API', async ({ request }) => {
    const landlordToken = await apiLogin(request, landlordEmail, landlordPassword);
    const tenantToken = await apiLogin(request, tenantEmail!, tenantPassword!);

    const leasesRes = await request.get(`${apiUrl}/landlords/leases`, {
      headers: { Authorization: `Bearer ${landlordToken}` },
    });
    expect(leasesRes.ok()).toBeTruthy();
    const leases = (await leasesRes.json())?.data ?? [];
    const lease = leases.find((l: { status: string; end_date?: string }) => l.status === 'ACTIVE' && l.end_date);
    test.skip(!lease, 'No active lease with end_date in staging seed');

    const proposeRes = await request.post(`${apiUrl}/landlords/leases/${lease.id}/renewals`, {
      headers: { Authorization: `Bearer ${landlordToken}` },
      data: { proposed_rent: lease.monthly_rent },
    });
    if (!proposeRes.ok()) {
      const err = await proposeRes.json();
      expect(String(err?.message || '')).toMatch(/already exists/i);
    }

    const renewalsRes = await request.get(`${apiUrl}/tenants/renewals`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
    });
    expect(renewalsRes.ok()).toBeTruthy();
    const renewals = (await renewalsRes.json())?.data ?? [];
    const pending = renewals.find((r: { status: string }) => r.status !== 'APPROVED' && r.status !== 'REJECTED');
    expect(pending).toBeTruthy();

    const acceptRes = await request.post(`${apiUrl}/tenants/renewals/respond`, {
      headers: { Authorization: `Bearer ${tenantToken}` },
      data: { renewal_id: pending.id, action: 'APPROVE' },
    });
    expect(acceptRes.ok()).toBeTruthy();
  });
});
