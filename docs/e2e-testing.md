# E2E Testing Strategy — uhome

## Overview

End-to-end (E2E) testing in uhome uses the **adapter architecture** to enable reliable, fast, and rate-limit-free testing. E2E tests use mock providers to avoid Supabase rate limits, email sending restrictions, and flaky data.

## Philosophy

**"Test intent, not delivery."**

E2E tests verify that workflows complete successfully and that side effects are **intended**, not that they are **delivered**. This approach:

- **Avoids rate limits**: No real emails sent, no real notifications delivered
- **Faster tests**: No waiting for external service delivery
- **More reliable**: No external service failures affecting tests
- **Deterministic**: Same results every run

## Adapter Architecture & E2E Testing

E2E tests are built on the adapter architecture that separates data access and side effects from UI logic. See [Adapter Architecture Guide](adapter-architecture.md) for detailed information.

### Mock Providers in E2E

E2E tests **must** use mock providers:

- **Data Provider**: `MockDataProvider` (deterministic, in-memory data)
- **Side Effect Provider**: `MockSideEffectProvider` (records intents, doesn't execute)

### How It Works

When E2E tests run:

1. Tests enable mock mode via `?mock=true` or `VITE_USE_MOCK_PROVIDERS=true`
2. Provider context selects `MockDataProvider` and `MockSideEffectProvider`
3. All hooks use mock providers (no Supabase calls)
4. All side effects are recorded (not executed)
5. Tests assert intents (email queued, notification sent) not delivery

## Rate Limit Avoidance

### The Problem

Without mock providers, E2E tests face:

- **Supabase rate limits**: 30 sign-ups per 5 minutes per IP
- **Email rate limits**: 2 emails per hour (if email confirmation enabled)
- **Account restrictions**: High bounce rates from fake test emails
- **Flaky tests**: Rate limit errors cause test failures

### The Solution

Mock providers eliminate rate limits by design:

- **No Supabase calls**: All data from `MockDataProvider` (in-memory)
- **No email sending**: All emails recorded by `MockSideEffectProvider`
- **No notifications**: All notifications recorded, not delivered
- **Deterministic**: Same data every run, no flakiness

### Asserting Intent vs Delivery

E2E tests assert **intent**, not **delivery**:

**❌ Wrong (asserts delivery)**:
```typescript
// This would require waiting for email delivery, hitting rate limits
await expect(emailService).toHaveReceivedEmail({
  to: 'tenant@example.com',
  subject: 'Rent Due Reminder'
})
```

**✅ Correct (asserts intent)**:
```typescript
// This verifies the intent was recorded, no rate limits
const sideEffectProvider = getMockSideEffectProvider()
await createRentRecord(tenantId, amount)

expect(sideEffectProvider.getRecordedEmails()).toContainEqual({
  to: 'tenant@example.com',
  subject: 'Rent Due Reminder',
  queued: true
})
```

## Test Structure

E2E tests are located in `tests/`:

```
tests/
├── auth/                    # Authentication tests
├── landlord/                # Landlord workflow tests
├── tenant/                  # Tenant workflow tests
├── helpers/                 # Test helpers
│   ├── auth-helpers.ts      # Auth test utilities
│   ├── db-helpers.ts        # Database utilities (for cleanup)
│   └── page-objects/        # Page object models
└── visual/                  # Visual UAT tests (separate)
```

## Running E2E Tests

### Local Development

```bash
# Run all E2E tests (with mock providers)
npm run test:e2e

# Run E2E tests headless
npm run test:e2e:headless

# Run specific test file
npx playwright test tests/auth/landlord-login.spec.ts
```

### CI/CD

E2E tests run automatically in CI:

- **Mock providers enabled**: Tests use `MockDataProvider` and `MockSideEffectProvider`
- **No rate limits**: No Supabase calls, no email sending
- **Deterministic**: Same results every run

## Test Patterns

### Authentication Tests

**Pattern**: Create test users via mock provider, verify login flow

```typescript
test('should login with valid credentials', async ({ page }) => {
  // Mock provider creates user in-memory (no Supabase call)
  const testUser = await createTestUserViaMockProvider({
    email: 'test@example.com',
    password: 'password123'
  })
  
  // Login flow uses mock provider
  await page.goto('/login?mock=true')
  await page.fill('input[type="email"]', testUser.email)
  await page.fill('input[type="password"]', testUser.password)
  await page.click('button[type="submit"]')
  
  // Verify redirect to dashboard
  await expect(page).toHaveURL('/dashboard')
})
```

### Workflow Tests

**Pattern**: Execute workflow, verify side effects recorded

```typescript
test('should create rent record and queue reminder email', async ({ page }) => {
  await page.goto('/rent?mock=true')
  
  // Create rent record
  await page.click('button:has-text("Add Rent Record")')
  await page.fill('input[name="amount"]', '1500')
  await page.selectOption('select[name="tenant"]', tenantId)
  await page.click('button:has-text("Save")')
  
  // Verify rent record created (mock provider)
  const rentRecords = await getMockDataProvider().getRentRecords()
  expect(rentRecords).toHaveLength(1)
  
  // Verify email intent recorded (not delivered)
  const sideEffects = getMockSideEffectProvider().getRecordedEmails()
  expect(sideEffects).toContainEqual({
    to: tenant.email,
    subject: 'Rent Due Reminder',
    queued: true
  })
})
```

### Side Effect Assertions

**Pattern**: Assert intents recorded, not delivery

```typescript
test('should send tenant invite email', async ({ page }) => {
  await page.goto('/tenants?mock=true')
  
  // Send invite
  await page.click('button:has-text("Invite Tenant")')
  await page.fill('input[name="email"]', 'newtenant@example.com')
  await page.click('button:has-text("Send Invite")')
  
  // Verify email intent recorded
  const sideEffects = getMockSideEffectProvider()
  const emails = sideEffects.getRecordedEmails()
  
  expect(emails).toContainEqual({
    to: 'newtenant@example.com',
    subject: 'Tenant Invitation',
    body: expect.stringContaining('invitation'),
    queued: true
  })
  
  // Verify email was NOT actually sent (no rate limit hit)
  expect(sideEffects.getEmailSendCount()).toBe(0)
})
```

## Mock Provider Access in Tests

### Getting Mock Providers

```typescript
import { getMockDataProvider, getMockSideEffectProvider } from '@/lib/providers/mock'

// In test
const dataProvider = getMockDataProvider()
const sideEffectProvider = getMockSideEffectProvider()
```

### Asserting Recorded Intents

```typescript
// Get recorded emails
const emails = sideEffectProvider.getRecordedEmails()
expect(emails).toHaveLength(1)
expect(emails[0]).toMatchObject({
  to: 'user@example.com',
  subject: 'Test Email',
  queued: true
})

// Get recorded notifications
const notifications = sideEffectProvider.getRecordedNotifications()
expect(notifications).toContainEqual({
  userId: 'user-123',
  message: 'Test notification',
  queued: true
})

// Clear recorded intents (between tests)
sideEffectProvider.clearRecordedIntents()
```

## Environment Setup

### Required Configuration

E2E tests require mock mode to be enabled:

**Option 1: URL Parameter** (recommended for tests)
```typescript
await page.goto('/dashboard?mock=true')
```

**Option 2: Environment Variable**
```bash
VITE_USE_MOCK_PROVIDERS=true npm run test:e2e
```

### Test Helpers

Update test helpers to enable mock mode:

```typescript
// tests/helpers/test-helpers.ts
export async function navigateWithMockMode(page: Page, path: string) {
  const url = new URL(path, page.url())
  url.searchParams.set('mock', 'true')
  await page.goto(url.toString())
}
```

## Migration from Real Providers

### Current State

Currently, E2E tests may use:
- Real Supabase calls (hitting rate limits)
- Playwright network interception (fragile, hidden)
- Real email sending (hitting rate limits)

### Target State

After migration to adapter architecture:
- Mock providers (no Supabase calls)
- Application-level providers (explicit, visible)
- Recorded side effects (no email sending)

### Migration Steps

1. **Implement adapter architecture** (see [Adapter Architecture Guide](adapter-architecture.md))
2. **Update test helpers** to enable mock mode
3. **Update test assertions** to verify intents, not delivery
4. **Remove network interception** (no longer needed)
5. **Verify tests pass** with mock providers

## Benefits

### Rate Limit Avoidance

- ✅ No Supabase rate limits (no database calls)
- ✅ No email rate limits (no emails sent)
- ✅ No account restrictions (no fake emails)
- ✅ No test failures from rate limits

### Test Reliability

- ✅ Deterministic data (same results every run)
- ✅ Fast execution (no network calls)
- ✅ No external dependencies (no Supabase, no email service)
- ✅ Clear assertions (intent vs delivery)

### Developer Experience

- ✅ Fast test execution
- ✅ No rate limit errors
- ✅ Easy to debug (mock data visible)
- ✅ Clear test failures (intent assertions)

## Troubleshooting

### Tests Still Hitting Rate Limits

**Problem**: Tests are still calling Supabase or sending emails.

**Solution**:
1. Verify mock mode is enabled (`?mock=true` in URL)
2. Check that adapter architecture is implemented
3. Verify `MockDataProvider` and `MockSideEffectProvider` are selected
4. Check test helpers enable mock mode

### Side Effects Not Recorded

**Problem**: Tests can't find recorded side effects.

**Solution**:
1. Verify `MockSideEffectProvider` is selected
2. Check that side effects go through provider (not direct calls)
3. Verify test accesses provider correctly: `getMockSideEffectProvider()`

### Tests Fail After Migration

**Problem**: Tests fail when using mock providers.

**Solution**:
1. Verify mock data matches real data structure
2. Check that mock providers implement all required methods
3. Verify test assertions use intent checks (not delivery checks)
4. Review [Adapter Architecture Guide](adapter-architecture.md) for implementation details

## Best Practices

### 1. Always Use Mock Providers in Tests

```typescript
// ✅ Good: Mock mode enabled
await page.goto('/dashboard?mock=true')

// ❌ Bad: No mock mode (hits Supabase)
await page.goto('/dashboard')
```

### 2. Assert Intent, Not Delivery

```typescript
// ✅ Good: Assert intent recorded
expect(sideEffectProvider.getRecordedEmails()).toContainEqual({...})

// ❌ Bad: Assert email delivered (requires real email service)
expect(emailService).toHaveReceivedEmail({...})
```

### 3. Clear Recorded Intents Between Tests

```typescript
beforeEach(() => {
  getMockSideEffectProvider().clearRecordedIntents()
})
```

### 4. Use Deterministic Test Data

```typescript
// ✅ Good: Deterministic data
const testUser = { email: 'test@example.com', id: 'user-123' }

// ❌ Bad: Random data (flaky tests)
const testUser = { email: generateRandomEmail(), id: generateRandomId() }
```

## Related Documentation

- [Adapter Architecture Guide](adapter-architecture.md) - Architecture details
- [Visual UAT Guide](visual_uat.md) - Visual testing strategy
- [UAT Guide](../tests/UAT_GUIDE.md) - Manual UAT process

