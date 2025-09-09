import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect to login page when not authenticated', async ({
    page,
  }) => {
    // Try to access protected dashboard
    await page.goto('/dashboard');

    // Should be redirected to login
    await expect(page).toHaveURL('/login');

    // Should see login page elements
    await expect(page.locator('h1')).toContainText('Welcome');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should show login form', async ({ page }) => {
    await page.goto('/login');

    // Check login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('text=Sign in')).toBeVisible();
  });

  test('should validate email input', async ({ page }) => {
    await page.goto('/login');

    // Try submitting with invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=Invalid email')).toBeVisible();
  });
});
