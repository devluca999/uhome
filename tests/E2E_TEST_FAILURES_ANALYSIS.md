# E2E Test Failures Analysis

**Date:** $(date)  
**Status:** Multiple tests failing

## Summary

Several e2e tests are failing due to **email rate limit errors** from Supabase. The primary issue is that signup attempts are hitting Supabase's email rate limits, which prevents user creation and causes downstream test failures.

## Root Causes Identified

### 1. Email Rate Limit Exceeded (Primary Issue)
- **Affected Tests:**
  - `auth/landlord-signup.spec.ts` - "should sign up a new landlord and redirect to dashboard"
  - `auth/tenant-signup-login.spec.ts` - "should sign up a new tenant and redirect to dashboard"
  
- **Error Message:** "email rate limit exceeded"
- **Location:** Error appears in signup form UI after submission

### 2. Invalid Login Credentials (Secondary Issue)
- **Affected Tests:**
  - `auth/landlord-login.spec.ts` - "should login with valid credentials and redirect to dashboard"
  - `landlord/property-creation.spec.ts` - "should create property without units"
  - Potentially other tests that rely on user creation in `beforeEach`

- **Error Message:** "Invalid login credentials"
- **Root Cause:** Users are not being created successfully due to rate limit errors in `beforeEach`, so login attempts fail

### 3. Test Execution Pattern
- Tests run sequentially (1 worker) but across 3 browsers (chromium, firefox, webkit)
- Each test file creates users independently
- Multiple signup attempts happen in quick succession despite 500ms delays
- 66 total tests across 11 test files = potential for many signup operations

## Detailed Failure Analysis

### Landlord Signup Test Failure
```
Error Context: Page shows "email rate limit exceeded" error message
Test: auth/landlord-signup.spec.ts - "should sign up a new landlord and redirect to dashboard"
Browser: chromium, firefox, webkit (all failing)
```

### Tenant Signup Test Failure
```
Error Context: Page shows "email rate limit exceeded" error message  
Test: auth/tenant-signup-login.spec.ts - "should sign up a new tenant and redirect to dashboard"
Browser: chromium, firefox, webkit (all failing)
```

### Landlord Login Test Failure
```
Error Context: Page shows "Invalid login credentials" error message
Test: auth/landlord-login.spec.ts - "should login with valid credentials and redirect to dashboard"
Root Cause: User creation in beforeEach() fails due to rate limits
Browser: chromium, firefox, webkit (all failing)
```

### Property Creation Test Failure
```
Error Context: Page shows "Invalid login credentials" error message
Test: landlord/property-creation.spec.ts - "should create property without units"
Root Cause: User creation in beforeEach() fails due to rate limits
Browser: chromium, firefox, webkit (all failing)
```

## Supabase Rate Limits

According to the documentation (`tests/RATE_LIMITS.md`):
- **Sign-ups and sign-ins: 30 requests / 5 minutes per IP** (360 per hour)
- **Email sending: 2 / hour** (if email confirmation is enabled)

## Recommended Solutions (Priority Order)

### ✅ Solution 1: Disable Email Confirmation (CRITICAL - REQUIRED)
**This is the most important fix and should be done FIRST.**

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your **test/staging project**
3. Navigate to: **Authentication** → **Providers** → **Email**
4. Find **"Enable email confirmations"** toggle
5. **Turn it OFF** (disable email confirmations)
6. Save changes

**Why this fixes the issue:**
- Prevents email sending entirely (no rate limit hits)
- Users are automatically signed in after signup (no confirmation needed)
- Eliminates the "email rate limit exceeded" errors
- Recommended by the project documentation (`tests/RATE_LIMIT_FIX.md`)

**Verification:**
- After disabling, run a single signup test to verify emails are not sent
- Check Supabase logs to confirm no email sends occur

### Solution 2: Increase Delays Between User Creations
If email confirmation cannot be disabled, increase the delay in `tests/helpers/auth-helpers.ts`:

**Current:** 500ms delay  
**Recommended:** 12-15 seconds between signups (to stay under 30 per 5 minutes)

```typescript
// In createTestLandlord() and createTestTenant()
await delay(12000) // 12 seconds = 25 requests per 5 minutes (safety margin)
```

**Trade-off:** Significantly slower test execution (~30 minutes total vs ~5 minutes)

### Solution 3: Use Service Role Key for User Creation (Advanced)
Create users directly via Supabase Admin API using the service role key, which bypasses some rate limits:

1. Add `TEST_SUPABASE_SERVICE_KEY` to `.env.test`
2. Modify `createTestLandlord()` and `createTestTenant()` to use service role client
3. Create users via Admin API instead of Auth API

**Pros:**
- Bypasses some rate limits
- More control over user creation
- Can create users in batches

**Cons:**
- More complex implementation
- Requires additional setup
- Still subject to some Supabase limits

### Solution 4: Reduce Test Parallelism Further
Currently using 1 worker sequentially. Could:
- Run tests for only one browser at a time (e.g., `--project=chromium`)
- Group auth tests to run separately from other tests
- Use test fixtures to reuse users across tests (reduce total user creations)

## Immediate Action Plan

1. **URGENT:** Verify and disable email confirmation in test Supabase instance
   - Check current status
   - Disable if still enabled
   - Verify changes

2. **Test:** Run a single signup test to verify the fix works
   ```bash
   npx playwright test tests/auth/landlord-signup.spec.ts --project=chromium
   ```

3. **If still failing:** Implement Solution 2 (increase delays) as temporary measure

4. **Long-term:** Consider Solution 3 (service role key) for more robust test suite

## Verification Steps

After implementing fixes:

1. **Clean test run:**
   ```bash
   npm run test:e2e:headless
   ```

2. **Check for rate limit errors:**
   - No "email rate limit exceeded" messages
   - No "Invalid login credentials" due to failed user creation
   - All auth tests pass

3. **Monitor Supabase logs:**
   - Verify no email sends (if email confirmation disabled)
   - Check rate limit metrics in Supabase dashboard

## Additional Notes

- The tests already have error handling for rate limits in `landlord-signup.spec.ts` (lines 49-52)
- Tests are configured to run sequentially (1 worker) to avoid rate limits
- Documentation exists in `tests/RATE_LIMIT_FIX.md` but issue persists
- Consider adding a test setup verification step to check if email confirmation is disabled

## Files to Review

- `tests/helpers/auth-helpers.ts` - User creation logic
- `tests/auth/landlord-signup.spec.ts` - Signup test with rate limit handling
- `tests/auth/landlord-login.spec.ts` - Login test that fails due to user creation
- `playwright.config.ts` - Test configuration (currently 1 worker)
- `.env.test` - Test environment variables

