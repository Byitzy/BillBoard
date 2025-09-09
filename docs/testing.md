# Testing Guide

This document covers the testing setup and procedures for the BillBoard application.

## End-to-End Testing with Playwright

### Prerequisites

1. **Environment Setup**: Ensure you have `.env.local` configured with Supabase credentials including the service role key.
2. **Dependencies**: Run `pnpm install` to install all testing dependencies.

### Test Data Setup

For comprehensive E2E testing, you can set up a complete test organization with sample data:

```bash
# Set up test organization with users, vendors, projects, and bills
pnpm test:setup
```

This script creates:

- **Test Organization**: "E2E Test Organization"
- **6 Test Users** with different roles:
  - `test-admin@billboard.test` (admin)
  - `test-approver@billboard.test` (approver)
  - `test-accountant@billboard.test` (accountant)
  - `test-data-entry@billboard.test` (data_entry)
  - `test-analyst@billboard.test` (analyst)
  - `test-viewer@billboard.test` (viewer)
- **4 Sample Vendors**: Acme Corp, Global Services Ltd, Tech Solutions Inc, Office Supplies Co
- **4 Sample Projects**: Website Redesign, Office Renovation, Software Development, Marketing Campaign
- **4 Sample Bills** in different states (pending, approved, on hold)

**Default Password**: `TestPassword123!` for all test users.

### Running Tests

```bash
# Run all tests
pnpm playwright

# Run specific test suite
pnpm playwright test tests/e2e/auth.spec.ts

# Run tests with UI (great for debugging)
pnpm playwright:ui

# Run tests in headed mode (see browser)
pnpm playwright:headed

# Run tests in debug mode
pnpm playwright:debug

# Run tests for CI
pnpm playwright:ci
```

### Test Organization

Tests are organized in `/tests/e2e/`:

- `auth.spec.ts` - Authentication and login flows
- `accessibility.spec.ts` - Accessibility compliance testing
- `navigation.spec.ts` - Navigation and routing tests

### Best Practices

1. **Cleanup**: The test setup script automatically cleans up existing test data before creating new data.

2. **Isolation**: Tests should be independent and not rely on specific data states from other tests.

3. **Selectors**: Use specific selectors that won't break easily:

   ```typescript
   // Good - specific and stable
   await page
     .locator('button[type="submit"]:has-text("Send magic link")')
     .click();

   // Better - use data-testid for test-specific selectors
   await page.locator('[data-testid="login-submit"]').click();
   ```

4. **Wait for Elements**: Always wait for elements before interacting:

   ```typescript
   await expect(page.locator('h1:has-text("Sign in")')).toBeVisible();
   ```

5. **Multiple Elements**: When multiple elements might match, be more specific:
   ```typescript
   // Instead of just 'h1', use content to distinguish
   await expect(page.locator('h1:has-text("Sign in")')).toBeVisible();
   ```

### Debugging Failed Tests

1. **Screenshots**: Failed tests automatically capture screenshots saved in `test-results/`
2. **HTML Reports**: Run `pnpm exec playwright show-report` to view detailed test results
3. **Traces**: Failed tests include trace files for step-by-step debugging

### Adding New Tests

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Use the test organization data created by the setup script
3. Add appropriate cleanup if your tests create data
4. Test across multiple browsers (chromium, firefox, webkit)
5. Consider mobile viewports for responsive testing

## Unit Testing with Vitest

Unit tests are located in `/src/lib/` and use the `.test.ts` suffix.

```bash
# Run unit tests
pnpm test

# Run unit tests once
pnpm test:run
```

## Type Checking

```bash
# Check TypeScript types
pnpm typecheck
```

## Quality Checks

```bash
# Run all quality checks (types, lint, format)
pnpm quality
```

## Continuous Integration

The project includes GitHub Actions workflows for:

- Building and testing on every push/PR
- Running E2E tests on pull requests
- Security auditing of dependencies
- Deployment checks for production readiness

See `.github/workflows/` for workflow configurations.
