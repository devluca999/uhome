# E2E Test Authentication Seeding

## Overview

This document explains how user authentication works in E2E tests and why we use `signUp + confirm` instead of `admin.createUser` for creating loginable test users.

## Why `admin.createUser` is Unsafe for Password Authentication

**DO NOT use `auth.admin.createUser` for creating users that need to log in with passwords.**

The `admin.createUser` method is designed for administrative tasks and service accounts, not for creating users that authenticate with passwords. Using it for loginable users leads to:

1. **Password Hashing Bypass**: `admin.createUser` may bypass Supabase's password hashing flow, resulting in passwords that cannot be used for authentication
2. **"Invalid login credentials" Errors**: Users created with `admin.createUser` often cannot authenticate, leading to test failures
3. **Unrealistic Test Flow**: E2E tests should test real user registration flows, not admin shortcuts

### What Happens with `admin.createUser`

```typescript
// ❌ WRONG - Don't do this for loginable users
const { data } = await supabaseAdmin.auth.admin.createUser({
  email: 'test@example.com',
  password: 'TestPassword123!',
  email_confirm: true,
})

// Later, login fails with "Invalid login credentials"
await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'TestPassword123!', // ❌ Doesn't work!
})
```

## Why `signUp + confirm` is Required for E2E Realism

E2E tests should mirror real user registration processes. The `signUp + confirm` pattern:

1. **Proper Password Hashing**: Uses Supabase's standard password hashing flow
2. **Real User Flow**: Mirrors the actual user registration process
3. **Reliable Authentication**: Passwords work correctly for login
4. **E2E Realism**: Tests the same code paths that real users experience

### Correct Pattern

```typescript
// ✅ CORRECT - Use signUp + admin confirmation
const supabase = getSupabaseClient()
const supabaseAdmin = getSupabaseAdminClient()

// Step 1: Sign up (proper password hashing)
const { data } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'TestPassword123!',
})

// Step 2: Confirm via admin API
await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
  email_confirmed_at: new Date().toISOString(),
})

// Step 3: Verify authentication works
const { error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'TestPassword123!', // ✅ Works correctly!
})
```

## Using `createAndConfirmUser` Helper

The `createAndConfirmUser` helper function in `tests/helpers/auth-helpers.ts` encapsulates the correct pattern:

```typescript
import { createAndConfirmUser } from '../helpers/auth-helpers'

// Create a confirmed user ready for login
const { userId, email, password } = await createAndConfirmUser(
  'test@example.com',
  'TestPassword123!'
)

// User is now ready to authenticate
await loginAsLandlord(page, email, password)
```

### What `createAndConfirmUser` Does

1. **Signs up user** using `supabase.auth.signUp()` (proper password hashing)
2. **Confirms email** via `admin.updateUserById()` with `email_confirmed_at`
3. **Verifies authentication** by attempting `signInWithPassword`
4. **Returns credentials** ready for use in tests

If any step fails, it throws a clear error message explaining what went wrong.

## Migration Guide

### Before (Incorrect)

```typescript
// ❌ Old pattern - using admin.createUser
const { data } = await supabaseAdmin.auth.admin.createUser({
  email: 'test@example.com',
  password: 'TestPassword123!',
  email_confirm: true,
})

const userId = data.user.id
```

### After (Correct)

```typescript
// ✅ New pattern - using createAndConfirmUser
const { userId } = await createAndConfirmUser(
  'test@example.com',
  'TestPassword123!'
)
```

## Examples

### Creating a Test Landlord

```typescript
import { createAndConfirmUser } from '../helpers/auth-helpers'
import { getSupabaseAdminClient } from '../helpers/db-helpers'

const supabaseAdmin = getSupabaseAdminClient()

// Create confirmed user
const { userId, email, password } = await createAndConfirmUser(
  'landlord@test.com',
  'TestPassword123!'
)

// Set role in users table (if needed)
await supabaseAdmin
  .from('users')
  .upsert({
    id: userId,
    email,
    role: 'landlord',
  })
```

### Creating a Test Tenant

```typescript
const { userId, email, password } = await createAndConfirmUser(
  'tenant@test.com',
  'TestPassword123!'
)

// Set role in users table
await supabaseAdmin
  .from('users')
  .upsert({
    id: userId,
    email,
    role: 'tenant',
  })
```

## Error Handling

The `createAndConfirmUser` helper includes verification that catches authentication issues immediately:

```typescript
// If authentication verification fails, you'll get:
// Error: [AUTH VERIFICATION FAILED] User created but cannot authenticate.
// Email: test@example.com, Error: Invalid login credentials
```

Additionally, login helpers include a guard assertion:

```typescript
// If login fails with "Invalid login credentials":
// Error: [AUTH SEED FAILURE] User exists but cannot authenticate.
// Email: test@example.com
// This usually means admin.createUser was used incorrectly.
```

This prevents wasting time debugging authentication issues caused by incorrect user creation patterns.

## When to Use `admin.createUser`

`admin.createUser` is appropriate for:
- Service accounts that don't authenticate with passwords
- Administrative users created outside the normal registration flow
- Users that authenticate via OAuth only

It is **NOT** appropriate for:
- Users that need to log in with email/password
- E2E test users
- Any user that will use `signInWithPassword`

## Best Practices

1. **Always use `createAndConfirmUser`** for loginable test users
2. **Verify authentication works** after user creation (helper does this automatically)
3. **Use staging environment only** (enforced by env-guard)
4. **Document any exceptions** if you must use `admin.createUser` for a specific reason

## Related Documentation

- [Staging-Only Testing](./staging-only.md) - Environment restrictions
- [E2E Test Scenarios](./e2e-scenarios.md) - Test patterns and examples
- [Lease-Required Policy](./lease-required-policy.md) - User relationships and leases

