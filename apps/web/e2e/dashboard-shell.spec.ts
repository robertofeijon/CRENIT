import { expect, test, type Page } from '@playwright/test';

const tenantEmail = process.env.E2E_TENANT_EMAIL?.trim();
const tenantPassword = process.env.E2E_TENANT_PASSWORD?.trim();
const landlordEmail = process.env.E2E_LANDLORD_EMAIL?.trim() ?? 'landlord@rentcredit.demo';
const landlordPassword = process.env.E2E_LANDLORD_PASSWORD?.trim() ?? 'DemoLandlord123!';
const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim() ?? 'admin@rentcredit.demo';
const adminPassword = process.env.E2E_ADMIN_PASSWORD?.trim() ?? 'DemoAdmin123!';

const hasTenantCreds = Boolean(tenantEmail && tenantPassword);
const hasApi = Boolean(process.env.NEXT_PUBLIC_API_URL?.trim());

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/auth');
  await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /^login$/i }).click();
}

async function expectNotificationBell(page: Page) {
  const bell = page.getByRole('button', { name: /notification/i });
  await expect(bell).toBeVisible({ timeout: 45_000 });
  await bell.click();
  await expect(page.getByText('Notifications', { exact: true })).toBeVisible();
}

test.describe('Dashboard notification bell', () => {
  test.skip(!hasTenantCreds || !hasApi, 'Set E2E_TENANT_* and NEXT_PUBLIC_API_URL for authenticated shell tests');

  test('tenant header bell opens notification panel', async ({ page }) => {
    await signIn(page, tenantEmail!, tenantPassword!);
    await expect(page).toHaveURL(/\/tenant\/home/, { timeout: 45_000 });
    await expectNotificationBell(page);
  });

  test('landlord header bell opens notification panel', async ({ page }) => {
    await signIn(page, landlordEmail, landlordPassword);
    await expect(page).toHaveURL(/\/landlord/, { timeout: 45_000 });
    await expectNotificationBell(page);
  });

  test('admin header bell opens notification panel', async ({ page }) => {
    await signIn(page, adminEmail, adminPassword);
    await expect(page).toHaveURL(/\/admin/, { timeout: 45_000 });
    await expectNotificationBell(page);
  });
});

test.describe('Lease renewal UI', () => {
  test.skip(!hasTenantCreds || !hasApi, 'Set E2E_TENANT_* and NEXT_PUBLIC_API_URL for authenticated shell tests');

  test('tenant home shows lease renewals section', async ({ page }) => {
    await signIn(page, tenantEmail!, tenantPassword!);
    await expect(page).toHaveURL(/\/tenant\/home/, { timeout: 45_000 });
    await expect(page.getByRole('heading', { name: /lease renewals/i })).toBeVisible();
    await expect(page.getByText(/no renewal proposals|current term ends|proposed end/i).first()).toBeVisible();
  });

  test('landlord leases shows renewal proposals section', async ({ page }) => {
    await signIn(page, landlordEmail, landlordPassword);
    await page.goto('/landlord/leases');
    await expect(page.getByRole('heading', { name: /lease renewal proposals/i })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/no renewal proposals|current term ends|proposed end/i).first()).toBeVisible();
  });
});
