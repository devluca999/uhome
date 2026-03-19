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

**Prerequisite:** If `.env.test` points to local Supabase (`http://127.0.0.1:54321`), you must have local Supabase running first:

```bash
npx supabase start
npx supabase db reset
npm run seed:demo
```

Or use the **one-command** local test runner (does the above + runs tests):
```bash
npm run test:local
```

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
  Requires local Supabase running (or staging URL in `.env.test`). See prerequisite above.

## Test Structure

```
tests/
├── auth/              # Authentication tests
├── landlord/          # Landlord flow tests
├── tenant/            # Tenant flow tests
├── visual/            # Visual UAT tests
│   ├── baselines/     # Baseline screenshots (git-tracked)
│   ├── helpers/       # Visual test utilities
│   └── *.spec.ts      # Visual test files
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

### User Reuse (Rate Limit Optimization)

To reduce Supabase auth signups, use shared auth when tests in a describe block can safely share the same user:

```ts
import { createSharedLandlordForDescribe } from '../fixtures/user-pool'

test.describe('My Tests', () => {
  let sharedLandlord: { email: string; password: string; userId: string }

  test.beforeAll(async () => {
    sharedLandlord = await createSharedLandlordForDescribe()
  })

  test.afterAll(async () => {
    if (sharedLandlord?.userId) await deleteUserAndData(sharedLandlord.userId)
  })

  test('test 1', async ({ page }) => {
    await loginAsLandlord(page, sharedLandlord.email, sharedLandlord.password)
    // ...
  })
})
```

Use `createSharedAuthForDescribe()` when both landlord and tenant are needed. Only use shared auth when tests don't mutate user-specific state (e.g. login tests, read-only flows).

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

## Visual UAT

Visual UAT tests validate UI correctness, data presence, readability, and design integrity using deterministic mock data.

### Quick Start

```bash
# Run visual tests locally
npm run test:visual

# Run visual tests headless (for CI)
npm run test:visual:headless

# Update baseline screenshots (after intentional UI changes)
npm run test:visual:update
```

### Key Features

- **Deterministic Mock Data**: Same data on every run (no randomness, no timestamps)
- **No Database Dependency**: Mock data is in-memory/static, NOT Supabase
- **Power User Simulation**: Tests against realistic, populated data
- **Dark Mode Testing**: Validates depth, contrast, and readability

### Philosophy

**"If mock data makes the app look broken, the MVP is broken."**

- Empty UI = Failed test
- Unreadable UI = Failed test
- Flat, lifeless UI = Failed test

### Documentation

See `docs/visual_uat.md` for complete documentation on:
- Visual UAT philosophy
- Mock data system
- Baseline management
- Acceptance checklist
- Troubleshooting

## Notes

- Tests run against local dev server (http://localhost:1000)
- Visual tests use deterministic mock data (no database required)
- E2E tests require a separate test Supabase instance with schema set up (see `tests/STAGING_SETUP.md`)
- E2E tests run sequentially (1 worker) to avoid Supabase rate limits (30 sign-ups per 5 minutes)
- Email confirmation must be disabled in test Supabase instance (see `tests/RATE_LIMIT_FIX.md`)
- Some tests may require edge functions to be deployed (e.g., receipt generation)
- See `tests/RATE_LIMITS.md` for details on rate limit handling

