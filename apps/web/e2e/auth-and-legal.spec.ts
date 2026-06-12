import { expect, test } from '@playwright/test';

test.describe('Public auth and legal pages', () => {
  test('homepage shows CRENIT branding', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('body')).toContainText(/CRENIT/i);
  });

  test('auth page shows login form in modal', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByText(/sign in to your crenit account/i)).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /back to login/i })).toBeVisible();
  });

  test('privacy and terms pages load', async ({ page }) => {
    await page.goto('/company/privacy');
    await expect(page.getByRole('heading', { name: /protects your personal data/i })).toBeVisible();
    await page.goto('/company/terms');
    await expect(page.getByRole('heading', { name: /rules for using the CRENIT platform/i })).toBeVisible();
  });
});
