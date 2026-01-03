# Supabase Rate Limits for E2E Tests

## Current Rate Limits (from Supabase Dashboard)

Your staging Supabase instance has these rate limits:

- **Sign-ups and sign-ins: 30 requests / 5 minutes per IP** (360 per hour)
- **Token refreshes: 30 requests / 5 minutes per IP** (360 per hour)
- **Token verifications: 30 requests / 5 minutes per IP** (360 per hour)
- **Anonymous users: 30 requests / hour per IP**
- **Email sending: 2 / hour** (not relevant if email confirmation is disabled)

## Problem

E2E tests create multiple users in `beforeEach` hooks:
- Each test file creates users for setup
- Tests run in parallel across 3 browsers (chromium, firefox, webkit)
- With 22 test files, that's potentially 66 parallel user creations
- This easily exceeds the 30 requests / 5 minutes limit

## Current Solution

1. **Reduced workers to 1** in `playwright.config.ts`
   - Tests run sequentially instead of in parallel
   - Prevents hitting rate limits

2. **Added 500ms delays** between user creations in `auth-helpers.ts`
   - Helps spread out requests over time

3. **Email confirmation disabled**
   - Prevents email sending rate limits
   - Users are automatically signed in after signup

## Impact on Test Performance

- Tests will run slower (sequential instead of parallel)
- But tests will be more reliable (won't hit rate limits)
- Expected total test time: ~2-5 minutes (vs ~30 seconds with full parallelism)

## Alternative Solutions (if needed)

If you need faster tests:

1. **Increase Supabase rate limits** (requires upgrading Supabase plan)
2. **Use test fixtures** to reuse users across tests (reduce total user creations)
3. **Create users via service role key** (bypasses some rate limits, but more complex)
4. **Use separate test Supabase projects** per test runner (if running in CI with multiple runners)

## Monitoring Rate Limits

If you see these errors:
- `Request rate limit reached`
- `429 Too Many Requests`
- `Rate limit exceeded`

You've hit the rate limit. Solutions:
1. Wait 5 minutes and try again
2. Reduce parallelism further
3. Increase delays between user creations
4. Upgrade Supabase plan for higher limits

