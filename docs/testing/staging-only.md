# Staging-Only Testing Model

## Overview

uhome uses a **2-environment model** for all development and testing:

- **STAGING** → All development, dev mode, E2E tests, visual UAT, demos
- **PRODUCTION** → Real users only (hard-blocked from tests/dev mode)

**There is NO development database.** All automated tests and dev mode features MUST run against staging only and must be hard-blocked from production.

## Hard Environment Enforcement

### Global Test Kill Switch

All test runners import `tests/helpers/env-guard.ts` which throws immediately if tests attempt to run against production:

```typescript
// tests/helpers/env-guard.ts
if (
  process.env.SUPABASE_ENV !== 'staging' ||
  process.env.VITE_SUPABASE_URL?.includes('prod')
) {
  throw new Error(
    '❌ Automated tests and dev mode are restricted to STAGING only'
  );
}
```

**Required Usage:**
- Imported in `playwright.config.ts` (before any test execution)
- Imported in visual UAT runner
- Imported in any CI pipeline step running tests

### Runtime App Guard (Dev Mode)

In the app itself, dev mode utilities check environment:

```typescript
// src/lib/tenant-dev-mode.ts
if (
  (isTenantDevMode || isLandlordDevMode) &&
  !isStagingEnvironment()
) {
  throw new Error('Dev Mode is not allowed outside staging');
}
```

This ensures:
- Dev mode cannot accidentally activate in production
- Even manual URL hacks fail
- Production builds never have dev mode active

## Staging Is the Source of Truth

Staging must behave as production-identical:

| Feature | Staging |
|---------|---------|
| Schema | ✅ |
| RLS | ✅ |
| Storage policies | ✅ |
| Realtime | ✅ |
| Rate limits | ✅ |
| Abuse guards | ✅ |

**Differences:**
- Separate quotas
- Higher rate-limit ceilings (but still enforced)
- Tagged test data (`is_test = true`)

## Rate Limits & Abuse Guards

Rate limiting and abuse prevention are implemented in **BOTH**:

1. **Supabase Edge Functions** - First line of defense
   - Request-level throttling
   - IP-based limits
   - Burst protection

2. **PostgreSQL** - Final enforcement layer
   - Hard caps that cannot be bypassed
   - Ownership rules
   - Relationship integrity

See [Rate Limits](./rate-limits.md) and [Abuse Prevention](./abuse-prevention.md) for details.

## Rate Limit Matrix

| Action | Staging | Production |
|--------|---------|------------|
| Uploads | Higher (configurable) | Strict |
| Messages | Higher (configurable) | Strict |
| Invites | Same | Same |
| Work Orders | Same | Same |
| Checklist Submissions | Same | Same |

**Note:** Staging is not unlimited, only more forgiving. All limits are enforced.

## Test Execution

### Production-Realistic Demo Data Seeding

A comprehensive seed script creates production-realistic demo data for staging testing:

```bash
npm run seed:demo
```

**Features:**
- Creates 5 properties, 12+ tenants, 20+ rent records, 30+ expenses, 15+ work orders, 50+ messages
- Demo tenant created via real invite flow (validates invite logic)
- All data is lease-scoped and production-realistic
- Hard-fails on production (uses `enforceStagingOnly()` guard)

See `scripts/README.md` for full documentation.

### E2E Tests

E2E tests run against staging database (not mocks):

```bash
npm run test:e2e
```

Tests will **hard-fail** if:
- `SUPABASE_ENV` is not 'staging'
- `VITE_SUPABASE_URL` contains 'prod' or 'production'

**Financial Assertion Tests:**

These tests validate that financial calculations displayed in the UI match database calculations:

- `tests/e2e/financial/dashboard-math.spec.ts` - Dashboard calculation validation (monthly revenue, expenses, net income, occupancy, work orders)
- `tests/e2e/financial/finances-filters.spec.ts` - Filter validation (Month, Quarter, Year, Property filters)
- `tests/e2e/financial/cross-screen-consistency.spec.ts` - Cross-screen consistency (same numbers appear everywhere)
- `tests/e2e/financial/work-order-costs.spec.ts` - Work order cost propagation validation
- `tests/e2e/financial/edge-cases.spec.ts` - Edge case handling (zero income, NaN handling, negative values)

These tests use `tests/helpers/financial-assertions.ts` to query the database (read-only) and compute expected values using the same logic as `src/lib/finance-calculations.ts`, then compare against UI displays. This ensures mathematical correctness and consistency across all app surfaces.

### Visual UAT Tests

Visual UAT tests can use mocks (unchanged):

```bash
npm run test:visual
```

Visual tests use `?mock=true` parameter to enable mock data providers.

**Financial Numeric Lockstep Tests:**
- `tests/visual/financial-numeric-lockstep.spec.ts` - Visual + numeric validation

## Production Safety Guarantees

1. **No automated tests target production** - Hard-fail if production detected
2. **No dev mode flags honored in production** - Runtime check blocks activation
3. **No test users auto-created in production** - Tests only run on staging
4. **No test uploads in production buckets** - Storage cleanup only affects staging
5. **No Supabase flags triggered** - All test data is tagged and isolated

## Logging & Monitoring

All rate limit violations and abuse events are logged with:

- `env` (staging or production)
- `user_id`
- `role`
- `action_type`
- `rate_limit_violation` (boolean)

Logs are visible for:
- Debugging staging failures
- Detecting abuse patterns
- Monitoring rate limit effectiveness

## Environment Variables

### Required for Tests

```bash
# .env.test
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
TEST_SUPABASE_SERVICE_KEY=your-staging-service-key
SUPABASE_ENV=staging
```

### Dev Mode (Staging Only)

```bash
# .env.local (staging only, never production)
VITE_TENANT_DEV_MODE_ENABLED=true
VITE_LANDLORD_DEV_MODE_ENABLED=true
```

## CI/CD Integration

All CI pipelines must:
1. Set `SUPABASE_ENV=staging`
2. Use staging Supabase credentials
3. Import `env-guard.ts` in test runners
4. Never deploy test code to production

## Troubleshooting

### Tests Fail with "Restricted to STAGING only"

**Cause:** Environment variables point to production or are not set.

**Solution:**
1. Verify `SUPABASE_ENV=staging` is set
2. Verify `VITE_SUPABASE_URL` points to staging instance
3. Ensure URL does not contain 'prod' or 'production'

### Dev Mode Not Activating

**Cause:** Environment check is blocking activation.

**Solution:**
1. Verify you're on staging (not production)
2. Check `VITE_TENANT_DEV_MODE_ENABLED=true` is set
3. Verify URL parameter `?dev=tenant` is present

## Related Documentation

- [Dev Mode Testing](./dev-mode.md) - Dev mode testing guide
- [E2E Scenarios](./e2e-scenarios.md) - E2E test scenarios
- [RLS Policies](../security/rls.md) - Row Level Security
- [Rate Limits](../security/rate-limits.md) - Rate limiting
- [Abuse Prevention](../security/abuse-prevention.md) - Abuse guards

