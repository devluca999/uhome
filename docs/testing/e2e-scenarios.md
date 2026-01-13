# E2E Test Scenarios

## Overview

E2E tests validate production-level behavior against the **staging database**. All tests run against real Supabase (staging), not mocks.

## Test Structure

```
tests/e2e/
├── dev-mode/          # Dev mode activation and edge cases
├── invites/           # Invite lifecycle
├── work-orders/       # Work order lifecycle
├── uploads/           # File upload flows
├── messaging/         # Message sync
├── reminders/         # Checklist submission
├── dashboard-sync/    # Data consistency
└── abuse/             # Rate limits and abuse guards
```

## Test Scenarios

### Dev Mode Activation

**File:** `tests/e2e/dev-mode/dev-mode-activation.spec.ts`

- ✅ Dev mode activates only with env + URL param
- ✅ Env false + URL true → dev mode OFF
- ✅ Env true + URL missing → dev mode OFF
- ✅ Production build → dev mode NEVER ON
- ✅ Dev mode toggled mid-session
- ✅ Dev mode does not bypass RLS

### Invite Lifecycle

**File:** `tests/e2e/invites/invite-lifecycle.spec.ts`

- ✅ Tenant joins household and landlord UI updates in real time
- ✅ Invite expired
- ✅ Invite reused
- ✅ Invite accepted twice
- ✅ Tenant removed mid-session

### Work Order Lifecycle

**File:** `tests/e2e/work-orders/work-order-lifecycle.spec.ts`

- ✅ Work order lifecycle syncs across roles
- ✅ Tenant tries to update landlord-only status
- ✅ Work order deleted mid-view
- ✅ Status regression (completed → open)

### Upload Flows

**File:** `tests/e2e/uploads/upload-flow.spec.ts`

- ✅ Tenant uploads image and landlord sees it
- ✅ Unsupported file type
- ✅ Oversized file
- ✅ Upload interruption
- ✅ Upload after entity deletion

### Messaging Sync

**File:** `tests/e2e/messaging/messaging-sync.spec.ts`

- ✅ Messages sync and unread state updates
- ✅ Message spam
- ✅ Empty message
- ✅ Tenant removed from household mid-thread

### Checklist Submission

**File:** `tests/e2e/reminders/checklist-submission.spec.ts`

- ✅ Checklist submission updates landlord UI
- ✅ Submission after deadline
- ✅ Partial completion
- ✅ Duplicate submissions

### Dashboard-Finances Sync

**File:** `tests/e2e/dashboard-sync/dashboard-finances-sync.spec.ts`

- ✅ Dashboard and finances values match
- ✅ Rapid tenant add/remove
- ✅ Concurrent work orders affecting expenses
- ✅ Race conditions with realtime updates

### Rate Limits & Abuse Guards

**Files:** 
- `tests/e2e/abuse/rate-limit-tests.spec.ts`
- `tests/e2e/abuse/abuse-guard-tests.spec.ts`

- ✅ Staging blocks upload spam
- ✅ Message flood protection
- ✅ Invite spam
- ✅ Rapid invite creation (bot-like behavior)
- ✅ Tenant opening same invite in multiple tabs
- ✅ Network disconnect mid-mutation
- ✅ Realtime subscription loss + recovery
- ✅ User deleted while active session open
- ✅ Dev mode toggled mid-session

## Test Helpers

All tests use helpers from `tests/helpers/`:

- `seed.ts` - Staging database seeding
- `reset.ts` - Test cleanup (mandatory)
- `upload.ts` - Upload test utilities
- `realtime.ts` - Multi-tab sync helpers
- `auth-helpers.ts` - Authentication helpers
- `db-helpers.ts` - Database verification

## Mandatory Cleanup

All tests must call reset functions in `beforeEach`:

```typescript
test.beforeEach(async ({ page }) => {
  await resetAll(page); // Calls resetDevState + resetStagingFixtures
});
```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/work-orders/work-order-lifecycle.spec.ts

# Run in UI mode
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug
```

## Test Data

All test data is:
- Tagged with `is_test = true` (where applicable)
- Created with unique email addresses (`generateTestEmail()`)
- Cleaned up in `beforeEach` hooks
- Isolated per test run

## Related Documentation

- [Staging-Only Testing](./staging-only.md) - Environment setup
- [Dev Mode Testing](./dev-mode.md) - Dev mode guide
- [RLS Policies](../security/rls.md) - Security policies

