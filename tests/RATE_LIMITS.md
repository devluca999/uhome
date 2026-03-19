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
   - Tests run sequentially within each job
   - Prevents hitting rate limits per IP

2. **CI sharding** (GitHub Actions matrix strategy)
   - Tests are split across 4 parallel jobs (shards)
   - Each shard runs on a different runner = different IP = separate rate limit bucket
   - Staging: 4 shards, chromium-only (~4x faster, ~3x fewer tests)
   - CI local-e2e: 4 shards across all browsers
   - CI visual-tests: 2 shards

3. **Added 500ms delays** between user creations in `auth-helpers.ts`
   - Helps spread out requests over time

4. **Email confirmation disabled**
   - Prevents email sending rate limits
   - Users are automatically signed in after signup

## Impact on Test Performance

- Sharding achieves parallelism via multiple CI jobs (different IPs)
- Staging gate: ~4 hrs → ~45-60 min (sharding + chromium-only)
- CI local-e2e: ~4x faster with 4 shards

## User Reuse Fixtures

`tests/fixtures/user-pool.ts` provides `createSharedLandlordForDescribe()` and `createSharedAuthForDescribe()` for describe-level user reuse. Use in `beforeAll` when tests in the same describe can share credentials (e.g. login tests). See `tests/README.md` for usage.

## Alternative Solutions (if needed)

If you need even faster tests:

1. **Increase Supabase rate limits** (requires upgrading Supabase plan)
2. **Create users via service role key** (bypasses some rate limits, but more complex)

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

