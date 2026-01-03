# ⚠️ CRITICAL: Fix Email Bouncing and Rate Limit Issues in E2E Tests

## ⚠️ IMPORTANT: Account Restriction Risk

**If email confirmation is enabled**, tests will send emails to fake addresses like `test-1234567890-1234@test.uhome.com`. These addresses:
- **Do not exist** and will bounce
- **Cause account restrictions** when many bounce
- **Can get your Supabase account suspended**

**You MUST disable email confirmation in your staging/test Supabase instance before running tests!**

## Problem

When running E2E tests with email confirmation enabled:

1. Tests create multiple user accounts quickly
2. Supabase sends confirmation emails to fake test addresses
3. Emails bounce (addresses don't exist)
4. **Supabase restricts/suspends your account** due to high bounce rates
5. Tests fail with rate limit errors

## ✅ Solution: Disable Email Confirmation in Test Supabase Instance

**THIS IS REQUIRED, NOT OPTIONAL!**

### Steps:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your **test/staging project** (the one with URL: `vdrbnwxuyzvbeygxjyjw.supabase.co`)
3. Navigate to: **Authentication** → **Providers** → **Email**
4. Find **"Enable email confirmations"** toggle
5. **Turn it OFF** (disable email confirmations) ⚠️ **DO THIS NOW**
6. Save changes

### Why This Works

- ✅ Users will be automatically signed in after signup (no email confirmation needed)
- ✅ No emails are sent, so no bounces and no account restrictions
- ✅ No rate limits
- ✅ Tests run faster
- ✅ Perfect for test/staging environments
- ✅ **Prevents account restrictions/suspensions**

## Alternative Solutions (if you can't disable email confirmation)

1. **Reduce test parallelism**: Run auth tests sequentially
2. **Add longer delays**: Increase delays between user creations (already added 200ms)
3. **Use service role key**: Create users directly via API (more complex setup)

## After Disabling Email Confirmation

After disabling email confirmation in your test Supabase instance, the tests should pass. The signup flow will:
- Create the user account
- Automatically sign them in
- Redirect to the dashboard
- Tests will verify the user exists and can access protected routes

## If Your Account Is Already Restricted

If you've already hit account restrictions due to bouncing emails:

1. **Disable email confirmation immediately** (steps above)
2. Wait 24-48 hours for restrictions to clear
3. If restrictions persist, contact Supabase support
4. Consider using a separate test Supabase project if restrictions continue

## Verification

After disabling email confirmation:

1. Run a single test: `npx playwright test tests/auth/landlord-signup.spec.ts --project=chromium`
2. Check that signup works without email confirmation
3. User should be automatically signed in and redirected to dashboard
4. No emails should be sent (check Supabase logs if unsure)

## Note

This change only affects your **test/staging** Supabase instance. Your production instance should keep email confirmation enabled for security.

