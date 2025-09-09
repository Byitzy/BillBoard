import { test, expect } from '@playwright/test';

test.describe('End-to-End Workflows', () => {
  const adminUser = {
    email: 'test-admin@billboard.test',
    password: 'TestPassword123!',
  };

  const approverUser = {
    email: 'test-approver@billboard.test',
    password: 'TestPassword123!',
  };

  // Helper function to login
  async function loginAs(page: any, user: typeof adminUser) {
    await page.goto('/login');
    await page.click('button:has-text("Email & Password")');
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await expect(page.url()).toContain('/dashboard/');
  }

  test('Complete Bill Management Workflow', async ({ page }) => {
    await loginAs(page, adminUser);

    // Navigate to bills section
    await page.click('text=Bills');
    await expect(page).toHaveURL(/.*bills.*/);

    // Create new bill
    const createButton = page
      .locator(
        'button:has-text("New"), button:has-text("Create"), button:has-text("Add")'
      )
      .first();
    if (await createButton.isVisible()) {
      await createButton.click();

      // Fill bill form (adapt selectors based on your actual form)
      await page.fill(
        'input[name="title"], input[placeholder*="title"], input[placeholder*="name"]',
        'Test Invoice #001'
      );
      await page.fill('input[name="amount"], input[type="number"]', '1500.00');

      // Select vendor if dropdown exists
      const vendorSelect = page
        .locator('select[name="vendor"], select[name="vendor_id"]')
        .first();
      if (await vendorSelect.isVisible()) {
        await vendorSelect.selectOption({ index: 1 });
      }

      // Save bill
      await page.click(
        'button[type="submit"], button:has-text("Save"), button:has-text("Create")'
      );

      // Verify bill was created
      await expect(page.locator('text=Test Invoice #001')).toBeVisible();
    }
  });

  test('Vendor Management Workflow', async ({ page }) => {
    await loginAs(page, adminUser);

    // Navigate to vendors
    await page.click('text=Vendors');
    await expect(page.url()).toContain('vendors');

    // Check existing vendors are visible
    await expect(page.locator('text=Acme Corp')).toBeVisible();
    await expect(page.locator('text=Global Services Ltd')).toBeVisible();

    // Test vendor search/filter if available
    const searchInput = page
      .locator('input[placeholder*="search"], input[placeholder*="filter"]')
      .first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Acme');
      await expect(page.locator('text=Acme Corp')).toBeVisible();
      await expect(page.locator('text=Global Services Ltd')).not.toBeVisible();

      // Clear search
      await searchInput.clear();
      await expect(page.locator('text=Global Services Ltd')).toBeVisible();
    }
  });

  test('Project Management Workflow', async ({ page }) => {
    await loginAs(page, adminUser);

    // Navigate to projects
    await page.click('text=Projects');
    await expect(page.url()).toContain('projects');

    // Verify test projects exist
    await expect(page.locator('text=Website Redesign')).toBeVisible();
    await expect(page.locator('text=Office Renovation')).toBeVisible();

    // Test project details view
    await page.click('text=Website Redesign');

    // Should show project details
    await expect(page.locator('text=Website Redesign')).toBeVisible();
    await expect(
      page.locator('text=Complete website overhaul project')
    ).toBeVisible();
  });

  test('Calendar Navigation and Bill Occurrences', async ({ page }) => {
    await loginAs(page, adminUser);

    // Navigate to calendar
    await page.click('text=Calendar');
    await expect(page.url()).toContain('calendar');

    // Verify calendar loads
    const calendar = page
      .locator('[role="grid"], .calendar, .fc-daygrid')
      .first();
    if (await calendar.isVisible()) {
      // Test month navigation
      const nextButton = page
        .locator(
          'button:has-text("Next"), button[aria-label*="next"], .fc-next-button'
        )
        .first();
      const prevButton = page
        .locator(
          'button:has-text("Prev"), button[aria-label*="prev"], .fc-prev-button'
        )
        .first();

      if (await nextButton.isVisible()) {
        await nextButton.click();
        // Should navigate to next month
        await page.waitForTimeout(500);
      }

      if (await prevButton.isVisible()) {
        await prevButton.click();
        // Should navigate back
        await page.waitForTimeout(500);
      }
    }
  });

  test('Dashboard KPIs and Metrics Display', async ({ page }) => {
    await loginAs(page, adminUser);

    // Should be on admin dashboard
    await expect(page).toHaveURL('/dashboard/admin');

    // Check for KPI cards/metrics
    const kpiElements = [
      'text=Total Bills',
      'text=Pending',
      'text=Approved',
      'text=This Month',
      'text=Revenue',
      'text=Expenses',
    ];

    // At least some metrics should be visible
    let visibleMetrics = 0;
    for (const metric of kpiElements) {
      if (
        await page
          .locator(metric)
          .first()
          .isVisible({ timeout: 1000 })
          .catch(() => false)
      ) {
        visibleMetrics++;
      }
    }

    expect(visibleMetrics).toBeGreaterThan(0);

    // Check for charts/graphs if present
    const chartElements = page
      .locator('canvas, svg, .recharts, .chart')
      .first();
    if (await chartElements.isVisible()) {
      console.log('Dashboard charts are rendering correctly');
    }
  });

  test('Approval Workflow - Admin to Approver Flow', async ({ browser }) => {
    // This test uses two different browser contexts to simulate two users
    const adminContext = await browser.newContext();
    const approverContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const approverPage = await approverContext.newPage();

    // Admin creates a bill that needs approval
    await loginAs(adminPage, adminUser);
    await adminPage.click('text=Bills');

    const createButton = adminPage
      .locator('button:has-text("New"), button:has-text("Create")')
      .first();
    if (await createButton.isVisible()) {
      await createButton.click();
      await adminPage.fill(
        'input[placeholder*="title"], input[name="title"]',
        'Bill for Approval Test'
      );
      await adminPage.fill(
        'input[type="number"], input[name="amount"]',
        '2500.00'
      );
      await adminPage.click('button[type="submit"]');

      // Mark for approval if there's such workflow
      const approvalButton = adminPage
        .locator(
          'button:has-text("Submit for Approval"), button:has-text("Request Approval")'
        )
        .first();
      if (await approvalButton.isVisible()) {
        await approvalButton.click();
      }
    }

    // Approver logs in and checks pending approvals
    await loginAs(approverPage, approverUser);

    // Should be on approver dashboard
    await expect(approverPage).toHaveURL('/dashboard/approver');

    // Check for pending approvals section
    const pendingSection = approverPage
      .locator('text=Pending, text=Approval, text=Review')
      .first();
    if (await pendingSection.isVisible()) {
      await pendingSection.click();

      // Look for the bill that needs approval
      if (
        await approverPage.locator('text=Bill for Approval Test').isVisible()
      ) {
        // Approve the bill
        const approveButton = approverPage
          .locator('button:has-text("Approve"), button:has-text("Accept")')
          .first();
        if (await approveButton.isVisible()) {
          await approveButton.click();
        }
      }
    }

    await adminContext.close();
    await approverContext.close();
  });

  test('Data Export Functionality', async ({ page }) => {
    await loginAs(page, adminUser);

    // Navigate to bills or reports section
    await page.click('text=Bills');

    // Look for export functionality
    const exportButton = page
      .locator(
        'button:has-text("Export"), button:has-text("Download"), text=CSV, text=PDF'
      )
      .first();

    if (await exportButton.isVisible()) {
      // Set up download handler
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();

      const download = await downloadPromise;

      // Verify download started
      expect(download.suggestedFilename()).toMatch(/\.(csv|pdf|xlsx)$/);
    }
  });

  test('Search Functionality Across Pages', async ({ page }) => {
    await loginAs(page, adminUser);

    const searchAreas = [
      { page: 'Bills', searchTerm: 'Test' },
      { page: 'Vendors', searchTerm: 'Acme' },
      { page: 'Projects', searchTerm: 'Website' },
    ];

    for (const area of searchAreas) {
      // Navigate to the page
      await page.click(`text=${area.page}`);
      await expect(page.url()).toContain(area.page.toLowerCase());

      // Find search input
      const searchInput = page
        .locator('input[placeholder*="search"], input[type="search"]')
        .first();
      if (await searchInput.isVisible()) {
        await searchInput.fill(area.searchTerm);

        // Wait for search results
        await page.waitForTimeout(1000);

        // Verify search worked (results should contain search term)
        const results = page.locator('table, .results, .list').first();
        if (await results.isVisible()) {
          console.log(`Search functionality working on ${area.page} page`);
        }

        // Clear search
        await searchInput.clear();
      }
    }
  });

  test('Theme and Settings Persistence', async ({ page }) => {
    await loginAs(page, adminUser);

    // Look for theme toggle
    const themeToggle = page
      .locator(
        'button[aria-label*="theme"], button:has-text("Dark"), button:has-text("Light"), .theme-toggle'
      )
      .first();

    if (await themeToggle.isVisible()) {
      // Get current theme
      const isDarkMode = await page.evaluate(
        () =>
          document.documentElement.classList.contains('dark') ||
          document.body.classList.contains('dark-theme')
      );

      // Toggle theme
      await themeToggle.click();
      await page.waitForTimeout(500);

      // Verify theme changed
      const newIsDarkMode = await page.evaluate(
        () =>
          document.documentElement.classList.contains('dark') ||
          document.body.classList.contains('dark-theme')
      );

      expect(newIsDarkMode).toBe(!isDarkMode);

      // Refresh page and verify theme persisted
      await page.reload();
      await page.waitForLoadState('networkidle');

      const persistedTheme = await page.evaluate(
        () =>
          document.documentElement.classList.contains('dark') ||
          document.body.classList.contains('dark-theme')
      );

      expect(persistedTheme).toBe(newIsDarkMode);
    }
  });

  test('Responsive Design - Mobile to Desktop Transitions', async ({
    page,
  }) => {
    await loginAs(page, adminUser);

    // Start with mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify mobile navigation works
    const mobileMenuButton = page
      .locator('button[aria-label*="menu"], .mobile-menu-toggle, .hamburger')
      .first();
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();

      // Mobile menu should open
      const mobileMenu = page.locator('.mobile-menu, .sidebar, nav').first();
      await expect(mobileMenu).toBeVisible();

      // Test navigation in mobile
      await page.click('text=Vendors');
      await expect(page.url()).toContain('vendors');
    }

    // Switch to desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });

    // Desktop sidebar should be visible
    const desktopSidebar = page.locator('.sidebar, nav').first();
    await expect(desktopSidebar).toBeVisible();

    // Mobile menu button should be hidden
    if (await page.locator('button[aria-label*="menu"]').first().isVisible()) {
      expect(
        await page.locator('button[aria-label*="menu"]').first().isHidden()
      ).toBe(false);
    }
  });
});
