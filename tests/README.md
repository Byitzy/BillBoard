# BillBoard Testing

This directory contains the testing suite for the BillBoard application.

## Test Structure

- `e2e/` - End-to-end tests using Playwright
- Unit tests are located alongside source files (e.g., `*.test.ts`)

## End-to-End Tests

### Setup

End-to-end tests use Playwright and test the application in real browsers:

```bash
# Install Playwright browsers
npx playwright install

# Run all e2e tests
pnpm playwright

# Run with UI mode (visual test runner)
pnpm playwright:ui

# Run in headed mode (see browser)
pnpm playwright:headed

# Debug mode (step through tests)
pnpm playwright:debug
```

### Test Categories

1. **Authentication** (`auth.spec.ts`)

   - Login page functionality
   - Authentication redirects
   - Form validation

2. **Navigation** (`navigation.spec.ts`)

   - Page routing
   - Responsive design
   - 404 handling

3. **Accessibility** (`accessibility.spec.ts`)
   - Keyboard navigation
   - Form labels and ARIA
   - Heading hierarchy

### Configuration

The Playwright configuration is in `playwright.config.ts` at the project root. It:

- Runs tests against multiple browsers (Chrome, Firefox, Safari)
- Tests mobile viewports
- Automatically starts the dev server
- Captures screenshots on failures
- Generates HTML reports

### Writing Tests

When writing new tests:

1. Use descriptive test names
2. Group related tests in `test.describe()` blocks
3. Use proper selectors (prefer data-testid over CSS selectors)
4. Test user workflows, not implementation details
5. Keep tests independent and idempotent

### CI/CD

Tests run in CI and will:

- Retry failed tests twice
- Run in parallel for speed
- Generate reports for debugging
- Block deployment on failures
