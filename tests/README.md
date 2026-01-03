# Playwright E2E Tests for uhome

This directory contains end-to-end tests for uhome using Playwright.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up test environment:**
   - Copy `.env.test.example` to `.env.test` (or create `.env.test` manually)
   - Fill in your test Supabase instance credentials:
     ```
     VITE_SUPABASE_URL=https://your-test-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-test-anon-key
     TEST_SUPABASE_SERVICE_KEY=your-test-service-key (optional)
     ```

3. **⚠️ CRITICAL: Disable email confirmation in your test Supabase instance:**
   - Go to Supabase Dashboard → Your test project → Authentication → Providers → Email
   - **Turn OFF "Enable email confirmations"**
   - **This is REQUIRED** - otherwise tests will send emails to fake addresses, causing bounces and account restrictions
   - See `tests/RATE_LIMIT_FIX.md` for details

4. **Install Playwright browsers:**
   ```bash
   npx playwright install
   ```

## Running Tests

- **Run all tests (headed mode):**
  ```bash
  npm run test:e2e
  ```

- **Run all tests (headless mode - for CI):**
  ```bash
  npm run test:e2e:headless
  ```

- **Run tests with UI mode:**
  ```bash
  npm run test:e2e:ui
  ```

- **Run tests in debug mode:**
  ```bash
  npm run test:e2e:debug
  ```

- **Run specific test file:**
  ```bash
  npx playwright test tests/auth/landlord-signup.spec.ts
  ```

- **Run tests in specific browser (faster, for development):**
  ```bash
  npm run test:e2e:quick
  # or
  npx playwright test --project=chromium
  ```

## Test Structure

```
tests/
├── auth/              # Authentication tests
├── landlord/          # Landlord flow tests
├── tenant/            # Tenant flow tests
├── helpers/           # Test utilities and helpers
│   ├── auth-helpers.ts
│   ├── db-helpers.ts
│   └── page-objects/  # Page object models
└── README.md
```

## Test Data Management

- Each test creates its own test data using unique email addresses (timestamp-based)
- Tests clean up after themselves using `deleteUserAndData` helper
- Test data is isolated per test run

## Test Coverage

### Authentication
- Landlord signup
- Landlord login
- Tenant signup and login

### Landlord Flows
- Property creation (with and without units)
- Property grouping
- Tenant assignment
- Rent logging (external payment method)
- Receipt generation
- Ledger updates and charts

### Tenant Flows
- View rent history
- Submit maintenance requests

## Writing New Tests

1. Use helper functions from `tests/helpers/` for common operations
2. Use page objects from `tests/helpers/page-objects/` for UI interactions
3. Always clean up test data in `afterEach` hooks
4. Use unique email addresses via `generateTestEmail()`
5. Verify both UI state and database state in tests

## CI/CD Integration

Tests are configured to run in CI environments:
- Headless mode by default
- Screenshots and videos on failure
- HTML reports generated
- Trace files for debugging

## Debugging

1. **Use debug mode:**
   ```bash
   npm run test:e2e:debug
   ```

2. **View test report:**
   ```bash
   npx playwright show-report
   ```

3. **Check screenshots:**
   Screenshots are saved in `test-results/` directory on failure

4. **Check videos:**
   Videos are saved in `test-results/` directory on failure (if enabled)

## Notes

- Tests run against local dev server (http://localhost:1000)
- Tests require a separate test Supabase instance with schema set up (see `tests/STAGING_SETUP.md`)
- Tests run sequentially (1 worker) to avoid Supabase rate limits (30 sign-ups per 5 minutes)
- Email confirmation must be disabled in test Supabase instance (see `tests/RATE_LIMIT_FIX.md`)
- Some tests may require edge functions to be deployed (e.g., receipt generation)
- See `tests/RATE_LIMITS.md` for details on rate limit handling

