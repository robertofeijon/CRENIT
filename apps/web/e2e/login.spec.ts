import { expect, test } from '@playwright/test';

const tenantEmail = process.env.E2E_TENANT_EMAIL?.trim();
const tenantPassword = process.env.E2E_TENANT_PASSWORD?.trim();
const hasCredentials = Boolean(tenantEmail && tenantPassword);

test.describe('Tenant login (staging credentials)', () => {
  test.skip(!hasCredentials, 'Set E2E_TENANT_EMAIL and E2E_TENANT_PASSWORD (GitHub Actions secrets in CI)');

  test('tenant can sign in and reach home dashboard', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('button', { name: /open login/i }).click();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await page.getByPlaceholder('you@example.com').fill(tenantEmail!);
    await page.getByPlaceholder('••••••••').fill(tenantPassword!);
    await page.getByRole('button', { name: /^login$/i }).click();
    await expect(page).toHaveURL(/\/tenant\/home/, { timeout: 45_000 });
    await expect(page.locator('body')).toContainText(/tenant|rent|credit/i);
  });
});
