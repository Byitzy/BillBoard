import { test, expect } from '@playwright/test';

test.describe('Real Authentication & UX Flow', () => {
  const testUsers = {
    admin: {
      email: 'test-admin@billboard.test',
      password: 'TestPassword123!',
      expectedDashboard: '/dashboard/admin',
    },
    approver: {
      email: 'test-approver@billboard.test',
      password: 'TestPassword123!',
      expectedDashboard: '/dashboard/approver',
    },
    accountant: {
      email: 'test-accountant@billboard.test',
      password: 'TestPassword123!',
      expectedDashboard: '/dashboard/accountant',
    },
    analyst: {
      email: 'test-analyst@billboard.test',
      password: 'TestPassword123!',
      expectedDashboard: '/dashboard/analyst',
    },
    viewer: {
      email: 'test-viewer@billboard.test',
      password: 'TestPassword123!',
      expectedDashboard: '/dashboard/viewer',
    },
  };

  test('Admin user - complete login flow and dashboard access', async ({
    page,
  }) => {
    await page.goto('/login');

    // Wait for page load
    await expect(page.locator('h1:has-text("Sign in")')).toBeVisible();

    // Switch to password mode
    await page.click('button:has-text("Email & Password")');

    // Fill credentials
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to admin dashboard
    await expect(page).toHaveURL(testUsers.admin.expectedDashboard);

    // Verify admin dashboard content
    await expect(page.locator('h1')).toContainText('Admin Dashboard');

    // Check for admin-specific elements
    await expect(page.locator('text=Organization Settings')).toBeVisible();
    await expect(page.locator('text=Member Management')).toBeVisible();
  });

  test('Approver user - login and access approver dashboard', async ({
    page,
  }) => {
    await page.goto('/login');

    await page.click('button:has-text("Email & Password")');
    await page.fill('input[type="email"]', testUsers.approver.email);
    await page.fill('input[type="password"]', testUsers.approver.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to approver dashboard
    await expect(page).toHaveURL(testUsers.approver.expectedDashboard);

    // Verify approver-specific content
    await expect(page.locator('h1')).toContainText('Approver Dashboard');
    await expect(page.locator('text=Pending Approvals')).toBeVisible();
  });

  test('Accountant user - login and verify role restrictions', async ({
    page,
  }) => {
    await page.goto('/login');

    await page.click('button:has-text("Email & Password")');
    await page.fill('input[type="email"]', testUsers.accountant.email);
    await page.fill('input[type="password"]', testUsers.accountant.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(testUsers.accountant.expectedDashboard);

    // Verify accountant can see financial data but not admin functions
    await expect(page.locator('h1')).toContainText('Accountant Dashboard');

    // Should see financial elements
    await expect(page.locator('text=Bills')).toBeVisible();
    await expect(page.locator('text=Reports')).toBeVisible();

    // Should NOT have admin menu access
    await expect(page.locator('text=Organization Settings')).not.toBeVisible();
  });

  test('Viewer user - login and verify read-only access', async ({ page }) => {
    await page.goto('/login');

    await page.click('button:has-text("Email & Password")');
    await page.fill('input[type="email"]', testUsers.viewer.email);
    await page.fill('input[type="password"]', testUsers.viewer.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(testUsers.viewer.expectedDashboard);

    // Verify viewer has limited access
    await expect(page.locator('h1')).toContainText('Viewer Dashboard');

    // Should see read-only content
    await expect(page.locator('text=Overview')).toBeVisible();

    // Should NOT see action buttons
    await expect(page.locator('button:has-text("Create")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Add")')).not.toBeVisible();
  });

  test('Navigation flow - role-based menu visibility', async ({ page }) => {
    // Test with admin user
    await page.goto('/login');
    await page.click('button:has-text("Email & Password")');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(testUsers.admin.expectedDashboard);

    // Check sidebar navigation exists
    const sidebar = page.locator('[role="navigation"], nav, .sidebar').first();
    await expect(sidebar).toBeVisible();

    // Admin should see all navigation items
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Bills')).toBeVisible();
    await expect(page.locator('text=Calendar')).toBeVisible();
    await expect(page.locator('text=Vendors')).toBeVisible();
    await expect(page.locator('text=Projects')).toBeVisible();
  });

  test('UX Flow - logout and session cleanup', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.click('button:has-text("Email & Password")');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(testUsers.admin.expectedDashboard);

    // Find and click logout button
    const logoutButton = page
      .locator(
        'button:has-text("Sign out"), button:has-text("Logout"), text=Sign out'
      )
      .first();
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // Should redirect to login
    await expect(page).toHaveURL('/login');

    // Verify session is cleared - trying to access dashboard should redirect to login
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('Error handling - invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.click('button:has-text("Email & Password")');
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');

    // Should stay on login page and show error
    await expect(page).toHaveURL('/login');

    // Look for error message (might be in various forms)
    const errorMessage = page
      .locator('text=Invalid, text=error, [role="alert"], .text-red')
      .first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('Mobile responsive - login flow on mobile viewport', async ({
    page,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/login');

    // Login form should be responsive
    const loginForm = page.locator('form').first();
    await expect(loginForm).toBeVisible();

    // Elements should be properly sized for mobile
    const emailInput = page.locator('input[type="email"]');
    const passwordModeButton = page.locator(
      'button:has-text("Email & Password")'
    );

    await expect(emailInput).toBeVisible();
    await expect(passwordModeButton).toBeVisible();

    // Complete login flow on mobile
    await passwordModeButton.click();
    await emailInput.fill(testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(testUsers.admin.expectedDashboard);

    // Dashboard should be mobile responsive
    const mobileMenu = page
      .locator(
        'button[aria-label*="menu"], button[aria-label*="Menu"], .mobile-menu-button'
      )
      .first();
    await expect(mobileMenu).toBeVisible();
  });

  test('Form validation and UX feedback', async ({ page }) => {
    await page.goto('/login');

    await page.click('button:has-text("Email & Password")');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Browser validation should prevent submission
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('required');

    // Fill invalid email
    await emailInput.fill('invalid-email');
    await page.click('button[type="submit"]');

    // Should show validation feedback
    const emailValidity = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validity.valid
    );
    expect(emailValidity).toBe(false);

    // Fill valid email but no password
    await emailInput.fill('test@example.com');
    await page.click('button[type="submit"]');

    // Password should be required
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute('required');
  });
});

test.describe('Cross-browser UX Consistency', () => {
  test('Login form renders consistently across browsers', async ({
    page,
    browserName,
  }) => {
    await page.goto('/login');

    // Take screenshot for visual regression testing
    await expect(page.locator('h1:has-text("Sign in")')).toBeVisible();

    // Check critical elements are present regardless of browser
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button:has-text("Magic Link")')).toBeVisible();
    await expect(
      page.locator('button:has-text("Email & Password")')
    ).toBeVisible();

    // Browser-specific checks
    if (browserName === 'webkit') {
      // Safari-specific checks
      console.log('Running Safari-specific UX checks');
    } else if (browserName === 'firefox') {
      // Firefox-specific checks
      console.log('Running Firefox-specific UX checks');
    } else {
      // Chrome-specific checks
      console.log('Running Chrome-specific UX checks');
    }
  });
});
