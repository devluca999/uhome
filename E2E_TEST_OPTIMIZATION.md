# E2E Test Optimization Guide - uhome
**Date:** March 22, 2025  
**Current State:** 84 E2E test files, 1 worker, sequential execution

---

## Quick Answer

**No, 2 hours is NOT the actual test runtime.** Here's the breakdown:

| Activity | Estimated Time | What It Is |
|----------|----------------|------------|
| **Actual E2E test execution** | 15-30 minutes | Running all 84 test files |
| Manual review of results | 15-30 minutes | Checking failures, screenshots |
| Debugging any failures | 30-60 minutes | Investigating and fixing issues |
| **Total QA process** | **1-2 hours** | Full testing cycle |

**Your current config is ALREADY OPTIMIZED for reliability over speed** (1 worker to avoid Supabase rate limits). This is the right choice for your app.

---

## Current Configuration Analysis

### ✅ What's Already Good

**1. Single Worker (Intentional Throttling)**
```typescript
workers: process.env.CI ? 1 : 1  // Avoiding Supabase rate limits
```
- **Why:** Supabase has 30 sign-ups per 5 minutes per IP
- **Impact:** Sequential test execution (safer, slower)
- **Verdict:** CORRECT for your setup

**2. Chromium-Only Quick Test**
```bash
npm run test:e2e:quick  # Only runs Chromium
```
- **Benefit:** ~3x faster than all browsers
- **Use Case:** Pre-commit checks, rapid iteration

**3. Conditional Retries**
```typescript
retries: process.env.CI ? 2 : 0
```
- **Benefit:** No retries locally (faster feedback)
- **Verdict:** Optimal

---

## Optimization Strategies

### Strategy 1: Tiered Testing (RECOMMENDED)

Create different test suites for different stages:


**Smoke Tests (2-5 minutes)**
```typescript
// tests/smoke/critical-path.spec.ts
test.describe('Smoke Tests - Critical Path Only', () => {
  test('landlord can login and see dashboard', async ({ page }) => {
    // Fast happy path only
  })
  
  test('tenant can accept invite and join household', async ({ page }) => {
    // The new flow we just fixed
  })
  
  test('landlord can create property', async ({ page }) => {
    // Core functionality
  })
})
```

**Usage:**
```bash
# Before every commit (2-5 min)
npm run test:smoke

# Full suite before push (15-30 min)
npm run test:e2e:quick  

# All browsers before deploy (30-45 min)
npm run test:e2e:headless
```

**Implementation:**
```json
// package.json
{
  "scripts": {
    "test:smoke": "playwright test tests/smoke --project=chromium",
    "test:critical": "playwright test tests/e2e/critical-path --project=chromium",
    "test:e2e:quick": "playwright test --project=chromium",
    "test:e2e:full": "playwright test"
  }
}
```

---

### Strategy 2: Parallel Workers (RISKY but Faster)

**⚠️ WARNING: May hit Supabase rate limits**

```typescript
// playwright.config.ts - EXPERIMENTAL
export default defineConfig({
  // Try 2-3 workers with rate limit handling
  workers: process.env.CI ? 2 : 3,
  
  // Add delays between tests
  use: {
    actionTimeout: 10_000,
    // Add custom delay between tests
  },
})
```

**Add rate limit backoff:**
```typescript
// tests/helpers/auth-helpers.ts
export async function createAndConfirmUser(email: string, password: string) {
  const maxRetries = 3
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Create user
      return await supabase.auth.signUp({ email, password })
    } catch (err) {
      if (err.message.includes('rate limit')) {
        await new Promise(resolve => setTimeout(resolve, 10000 * (i + 1)))
        continue
      }
      throw err
    }
  }
}
```

**Verdict:** Only if you consistently hit rate limits, otherwise not worth the complexity.

---

### Strategy 3: Shared Test Data (BIG SPEEDUP)

**Problem:** Each test creates fresh users/properties (slow)  
**Solution:** Pre-seed test data, share across tests

**Create test data pool:**
```typescript
// tests/helpers/test-data-pool.ts
const TEST_USERS = [
  { email: 'landlord-1@test.local', password: 'Test123!', role: 'landlord' },
  { email: 'landlord-2@test.local', password: 'Test123!', role: 'landlord' },
  { email: 'tenant-1@test.local', password: 'Test123!', role: 'tenant' },
  // 10-20 pre-created users
]

export async function getTestLandlord(index: number) {
  const user = TEST_USERS.filter(u => u.role === 'landlord')[index]
  // Login and return session
}
```

**Seed script:**
```bash
# Run once before tests
npm run test:seed
```

**Benefit:** 
- User creation: 2-5s → 0.5s
- Can run 3-5 workers safely (using different users)
- **Speedup:** 2-3x faster

**Trade-off:** Tests must clean up their own data (properties, not users)

---

### Strategy 4: Test Sharding (CI Only)

**Run tests across multiple machines:**

```yaml
# .github/workflows/test.yml
jobs:
  test:
    strategy:
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    steps:
      - run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
```

**Benefit:** 4 shards = 4x faster on CI  
**Local:** Not applicable (single machine)

---

### Strategy 5: Smart Test Selection

**Only run tests affected by changes:**

```bash
# Install
npm install -D @playwright/test-plugin-git-diff

# Run only changed areas
npm run test:changed
```

**Manual filtering:**
```bash
# Only auth tests
playwright test tests/auth

# Only landlord tests
playwright test tests/e2e/landlord

# Specific test file
playwright test tests/e2e/critical-path/tenant-invite-cold-signup.spec.ts
```

---

## Recommended Setup for Your Workflow

### Local Development (Fast Iteration)

**Pre-commit (30 seconds - 2 minutes):**
```bash
npm run test:smoke  # Critical path only, Chromium
```

**Pre-push (5-10 minutes):**
```bash
npm run test:critical  # Critical path tests, Chromium
npm run test:unit      # Fast unit tests
```

**Before creating PR (15-20 minutes):**
```bash
npm run test:e2e:quick  # All E2E tests, Chromium only
```

**Before merging to main (30-45 minutes):**
```bash
npm run test:e2e:full  # All E2E tests, all browsers
```

---

### Actual Implementation Steps

**Step 1: Create Smoke Test Suite (10 minutes)**

```typescript
// tests/smoke/critical-flows.spec.ts
import { test } from '@playwright/test'

test.describe('Smoke Tests - Must Pass', () => {
  test('landlord login and dashboard', async ({ page }) => {
    // Minimal happy path
  })
  
  test('tenant invite acceptance', async ({ page }) => {
    // Your new fixed flow
  })
  
  test('create property and tenant', async ({ page }) => {
    // Core workflow
  })
})
```

**Step 2: Update package.json**

```json
{
  "scripts": {
    "test:smoke": "playwright test tests/smoke --project=chromium --timeout=15000",
    "test:critical": "playwright test tests/e2e/critical-path --project=chromium",
    "test:e2e:quick": "playwright test --project=chromium",
    "test:e2e:full": "playwright test",
    "test:changed": "playwright test --grep-invert='@slow'"
  }
}
```

**Step 3: Tag Slow Tests**

```typescript
// Mark slow/flaky tests
test('complex financial calculation @slow', async ({ page }) => {
  // This test can be skipped for quick runs
})
```

**Step 4: Pre-commit Hook (Optional)**

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:smoke && npm run type-check"
    }
  }
}
```

---

## Expected Runtime Improvements

| Test Suite | Before | After | Speedup |
|------------|--------|-------|---------|
| **Smoke tests** | N/A | 2-5 min | N/A (new) |
| **Critical path** | 15-30 min | 5-10 min | 2-3x |
| **Quick (Chromium)** | 15-30 min | 10-20 min | 1.5-2x |
| **Full (all browsers)** | 45-90 min | 30-60 min | 1.5x |

**Key Insight:** You're not trying to make tests faster, you're **choosing which tests to run when**.

---

## What NOT to Do

❌ **Don't increase workers blindly**
- You WILL hit Supabase rate limits
- Tests will fail intermittently
- Debugging nightmare

❌ **Don't skip tests to save time**
- Catches bugs before production
- Regressions are expensive

❌ **Don't run full suite on every commit**
- Developer productivity killer
- Diminishing returns

❌ **Don't parallelize without shared test data**
- Each worker creates users → rate limits
- Need test data pooling first

---

## Recommended Approach for uhome

Given your setup (84 tests, Supabase rate limits):

**Phase 1: Immediate (Today)**
1. Create smoke test suite (5-10 critical tests)
2. Add `test:smoke` script
3. Run smoke tests before commits

**Phase 2: This Week**
1. Add test tagging (@critical, @slow, @flaky)
2. Create filtered test runs
3. Document which suite to run when

**Phase 3: Future (If Needed)**
1. Implement shared test data pool
2. Try 2-3 workers with backoff
3. Consider test sharding for CI

---

## Bottom Line

**Your 84 E2E tests are NOT the problem.** The problem is running ALL of them ALL the time.

**Solution:**
- **Smoke tests (2-5 min)** → Before every commit
- **Quick suite (10-20 min)** → Before every push
- **Full suite (30-45 min)** → Before deploy only

**My "2 hour" estimate breakdown:**
- Run quick suite: 15 min
- Review results: 15 min  
- Debug 1-2 failures: 30-60 min
- Re-run fixed tests: 10 min
- **Total:** 1-2 hours (includes debugging time)

**Actual test execution time:** 15-45 minutes depending on suite

---

## Action Items

**Do This Now (10 minutes):**
```bash
# Create smoke test directory
mkdir tests/smoke

# Copy 3-5 most critical tests into it
# Update package.json with test:smoke script
# Test it:
npm run test:smoke
```

**Do This This Week:**
1. Document test strategy in repo
2. Add test tagging
3. Update CI to use tiered approach

**Consider Later:**
1. Shared test data if you hit rate limits
2. Test sharding if CI is too slow
3. Parallel workers (2-3 max with backoff)

---

**P2 Recommendation:** 
- Implement tiered testing (smoke/quick/full)
- Keep 1 worker (reliability > speed)
- Don't optimize prematurely

Your tests are fine. You just need to run the right subset at the right time.
