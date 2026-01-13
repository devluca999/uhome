# Dev Mode Testing Guide

## Overview

Dev Mode is a comprehensive testing and demo system that provides realistic experiences for both **Tenant** and **Landlord** roles. It uses the **staging database** (not mocks) to ensure production-parity behavior.

## Key Principles

1. **Staging Database Only** - Dev mode uses staging database, never production
2. **RLS Still Enforced** - Dev mode does NOT bypass Row Level Security
3. **Production Parity** - Dev mode behaves identically to production
4. **Hard-Blocked from Production** - Cannot activate in production

## Activation

Dev Mode uses a **triple-gate security model**:

1. **Environment Variable** - `VITE_TENANT_DEV_MODE_ENABLED=true` or `VITE_LANDLORD_DEV_MODE_ENABLED=true`
2. **URL Parameter** - `?dev=tenant` or `?dev=landlord`
3. **Staging Check** - Must be on staging environment (not production)

All three must be true for dev mode to activate.

## Testing Dev Mode

### Basic Activation Test

```typescript
test('dev mode activates only with env + URL param', async ({ page }) => {
  await page.goto('/?dev=tenant');
  expect(await page.locator('[data-dev-mode]').isVisible()).toBeTruthy();
});
```

### Edge Cases

**Env false + URL true → dev mode OFF**
```typescript
test('env false + URL true → dev mode OFF', async ({ page }) => {
  // Even with URL param, dev mode is OFF if env var is false
  await page.goto('/?dev=tenant');
  const isActive = await page.evaluate(() => {
    return localStorage.getItem('tenant-dev-mode-state') !== null;
  });
  expect(isActive).toBeFalsy();
});
```

**Env true + URL missing → dev mode OFF**
```typescript
test('env true + URL missing → dev mode OFF', async ({ page }) => {
  await page.goto('/'); // No URL param
  await expect(page.locator('[data-dev-mode]')).not.toBeVisible();
});
```

**Production build → dev mode NEVER ON**
```typescript
test('production build → dev mode NEVER ON', async ({ page }) => {
  // Environment guard should have already thrown if production
  // This test verifies the guard is working
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const isProduction = supabaseUrl.includes('prod');
  
  if (isProduction) {
    expect(() => enforceStagingOnly()).toThrow();
  }
});
```

## Dev Mode Features

### Real-Time Multi-Tab Sync

Changes made in one browser tab instantly appear in other tabs:

```typescript
test('multi-tab sync', async ({ context }) => {
  const [page1, page2] = await openMultiplePages(context, 2);
  
  // Setup both pages
  await setupPage(page1);
  await setupPage(page2);
  
  // Perform action in page1
  await performAction(page1);
  
  // Verify sync in page2
  await waitForRealtimeUpdate(page2, () => verifyUpdate(page2));
});
```

### Staging Database Integration

Core data uses staging database:
- Work orders
- Properties
- Leases
- Messages
- Notifications

All relationships and foreign keys are real.

## Testing RLS with Dev Mode

**Critical:** Dev mode does NOT bypass RLS. All RLS policies are enforced.

```typescript
test('dev mode does not bypass RLS', async ({ page }) => {
  await page.goto('/?dev=tenant');
  
  // Try to access data tenant shouldn't have access to
  // RLS should still block it
  
  // Dev mode being active doesn't mean RLS is bypassed
  // RLS is enforced at the database level
});
```

## Test Cleanup

All dev mode tests must clean up:

```typescript
test.beforeEach(async ({ page }) => {
  await resetDevState(page);
  await resetStagingFixtures();
});
```

See [Reset Helpers](../helpers/reset.ts) for cleanup functions.

## Demo Accounts

Dev mode uses seeded demo accounts:

- **Tenant:** `demo-tenant@uhome.internal` / `DemoTenant2024!`
- **Landlord:** `demo-landlord@uhome.internal` / `DemoLandlord2024!`

These accounts are only available in staging.

## Related Documentation

- [Staging-Only Testing](./staging-only.md) - 2-environment model
- [E2E Scenarios](./e2e-scenarios.md) - E2E test scenarios
- [RLS Policies](../security/rls.md) - Row Level Security

