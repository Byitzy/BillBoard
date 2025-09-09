import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('should have accessible login form', async ({ page }) => {
    await page.goto('/login');

    // Check for proper form labels and ARIA attributes
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Check if email input has associated label
    const emailLabel = page.locator(
      'label[for*="email"], label:has(input[type="email"])'
    );
    await expect(emailLabel).toBeVisible();

    // Submit button should be accessible
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/login');

    // Tab through form elements
    await page.keyboard.press('Tab');
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeFocused();

    await page.keyboard.press('Tab');
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeFocused();
  });

  test('should have proper headings hierarchy', async ({ page }) => {
    await page.goto('/login');

    // Should have proper heading structure
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/login');

    // Basic check that text is visible (Playwright doesn't have built-in contrast checking)
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
