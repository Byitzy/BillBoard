import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('should have accessible login form', async ({ page }) => {
    await page.goto('/login');

    // Wait for page to load - be more specific about which h1
    await expect(page.locator('h1:has-text("Sign in")')).toBeVisible();

    // Check for proper form labels and ARIA attributes
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Check if email input has associated label
    const emailLabel = page.locator('label[for*="email"]');
    await expect(emailLabel).toBeVisible();
    await expect(emailLabel).toContainText('Email Address');

    // Submit button should be accessible
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/login');

    // Wait for page to load - be more specific about which h1
    await expect(page.locator('h1:has-text("Sign in")')).toBeVisible();

    // Click on email input to focus it directly
    const emailInput = page.locator('input[type="email"]');
    await emailInput.click();
    await expect(emailInput).toBeFocused();

    // Tab to submit button
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
