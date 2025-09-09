import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load homepage and redirect to login', async ({ page }) => {
    await page.goto('/');

    // Should redirect to login since not authenticated
    await expect(page).toHaveURL('/login');
  });

  test('should have proper page titles', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/BillBoard/);
  });

  test('should be responsive', async ({ page }) => {
    await page.goto('/login');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should handle 404 pages', async ({ page }) => {
    await page.goto('/non-existent-page');

    // Should show some kind of error or redirect
    // This depends on your app's 404 handling
    const url = page.url();
    expect(url.includes('404') || url.includes('login')).toBeTruthy();
  });
});
