import { Page, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseClient as getDbSupabaseClient, getSupabaseAdminClient } from './db-helpers'
import { isProduction } from './env-guard'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables in .env.test')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Generate a unique test email address
 */
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000)
  return `${prefix}-${timestamp}-${random}@test.uhome.com`
}

/**
 * Wait a bit to avoid rate limits when creating multiple users
 */
export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create and confirm a user for E2E testing
 *
 * Uses the standard signUp flow (proper password hashing) followed by admin confirmation.
 * This ensures passwords are set correctly and mirrors the real user registration process.
 *
 * DO NOT use admin.createUser for loginable users - it bypasses password hashing
 * and leads to "Invalid login credentials" errors.
 *
 * @param email - User email address
 * @param password - User password (will be properly hashed via signUp)
 * @param metadata - Optional user metadata
 * @returns User credentials (userId, email, password)
 */
export async function createAndConfirmUser(
  email: string,
  password: string,
  metadata?: Record<string, any>
): Promise<{ userId: string; email: string; password: string }> {
  if (isProduction()) {
    throw new Error(
      '❌ createAndConfirmUser cannot run against production. ' +
        'SUPABASE_ENV=production or VITE_SUPABASE_URL points to production.'
    )
  }
  const supabase = getDbSupabaseClient()
  const supabaseAdmin = getSupabaseAdminClient()

  console.log(`[createAndConfirmUser] Starting user creation for: ${email}`)

  // Step 1: Sign up user (proper password hashing through Supabase auth system)
  console.log(`[createAndConfirmUser] Step 1: Signing up user...`)
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: metadata ? { data: metadata } : undefined,
  })

  if (signUpError || !data.user) {
    console.error(`[createAndConfirmUser] SignUp failed:`, signUpError)
    throw new Error(
      `Failed to sign up user: ${signUpError?.message || 'No user returned from signup'}`
    )
  }

  console.log(`[createAndConfirmUser] SignUp successful. User ID: ${data.user.id}`)
  console.log(`[createAndConfirmUser] User object:`, {
    id: data.user.id,
    email: data.user.email,
    email_confirmed_at: data.user.email_confirmed_at,
    confirmed_at: data.user.confirmed_at,
    created_at: data.user.created_at,
    last_sign_in_at: data.user.last_sign_in_at,
  })

  // Step 2: Fetch user BEFORE confirmation to see initial state
  console.log(`[createAndConfirmUser] Step 2: Fetching user BEFORE confirmation...`)
  const { data: userBeforeConfirm, error: fetchBeforeError } =
    await supabaseAdmin.auth.admin.getUserById(data.user.id)

  if (fetchBeforeError) {
    console.error(`[createAndConfirmUser] Failed to fetch user before confirm:`, fetchBeforeError)
  } else if (userBeforeConfirm?.user) {
    console.log(`[createAndConfirmUser] User BEFORE confirmation:`, {
      id: userBeforeConfirm.user.id,
      email: userBeforeConfirm.user.email,
      email_confirmed_at: userBeforeConfirm.user.email_confirmed_at,
      confirmed_at: userBeforeConfirm.user.confirmed_at,
    })
  }

  // Step 3: Confirm user via admin API
  console.log(`[createAndConfirmUser] Step 3: Confirming user via admin API...`)
  const { data: confirmData, error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
    data.user.id,
    { email_confirm: true }
  )

  if (confirmError) {
    console.error(`[createAndConfirmUser] Confirm failed:`, confirmError)
    throw new Error(`Failed to confirm user: ${confirmError.message}`)
  }

  console.log(`[createAndConfirmUser] Confirm API call successful`)
  if (confirmData?.user) {
    console.log(`[createAndConfirmUser] Confirm API response user:`, {
      id: confirmData.user.id,
      email: confirmData.user.email,
      email_confirmed_at: confirmData.user.email_confirmed_at,
      confirmed_at: confirmData.user.confirmed_at,
    })
  }

  // Step 4: Fetch user AFTER confirmation to verify state
  console.log(`[createAndConfirmUser] Step 4: Fetching user AFTER confirmation...`)
  const { data: userAfterConfirm, error: fetchAfterError } =
    await supabaseAdmin.auth.admin.getUserById(data.user.id)

  if (fetchAfterError) {
    console.error(`[createAndConfirmUser] Failed to fetch user after confirm:`, fetchAfterError)
  } else if (userAfterConfirm?.user) {
    console.log(`[createAndConfirmUser] User AFTER confirmation (from fetch):`, {
      id: userAfterConfirm.user.id,
      email: userAfterConfirm.user.email,
      email_confirmed_at: userAfterConfirm.user.email_confirmed_at,
      confirmed_at: userAfterConfirm.user.confirmed_at,
    })
  }

  // Step 5: Verify authentication works (prevents silent invalid users)
  console.log(`[createAndConfirmUser] Step 5: Verifying authentication with signInWithPassword...`)
  const { data: signInData, error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  console.log(`[createAndConfirmUser] signInWithPassword result:`, {
    hasData: !!signInData,
    hasSession: !!signInData?.session,
    hasUser: !!signInData?.user,
    hasError: !!verifyError,
    errorMessage: verifyError?.message,
    errorStatus: verifyError?.status,
  })

  if (verifyError) {
    console.error(`[createAndConfirmUser] ============================================`)
    console.error(`[createAndConfirmUser] SIGNIN VERIFICATION FAILED!`)
    console.error(`[createAndConfirmUser] ============================================`)
    console.error(`[createAndConfirmUser] Error object:`, verifyError)
    console.error(`[createAndConfirmUser] Error message:`, verifyError.message)
    console.error(`[createAndConfirmUser] Error status:`, verifyError.status)
    console.error(`[createAndConfirmUser] Error name:`, verifyError.name)

    // Dump user object (excluding secrets)
    const userDump = userAfterConfirm?.user || confirmData?.user || data.user
    if (userDump) {
      console.error(`[createAndConfirmUser] ============================================`)
      console.error(`[createAndConfirmUser] USER OBJECT DUMP (secrets excluded):`)
      console.error(`[createAndConfirmUser] ============================================`)
      const safeDump = {
        id: userDump.id,
        email: userDump.email,
        email_confirmed_at: userDump.email_confirmed_at,
        confirmed_at: userDump.confirmed_at,
        created_at: userDump.created_at,
        updated_at: userDump.updated_at,
        last_sign_in_at: userDump.last_sign_in_at,
        phone: userDump.phone,
        phone_confirmed_at: userDump.phone_confirmed_at,
        recovery_sent_at: userDump.recovery_sent_at,
        email_change_sent_at: userDump.email_change_sent_at,
        new_email: userDump.new_email,
        invited_at: userDump.invited_at,
        is_anonymous: userDump.is_anonymous,
        app_metadata: userDump.app_metadata,
        user_metadata: userDump.user_metadata,
        identities: userDump.identities?.map((identity: any) => ({
          id: identity.id,
          user_id: identity.user_id,
          identity_data: identity.identity_data ? Object.keys(identity.identity_data) : null,
          provider: identity.provider,
          created_at: identity.created_at,
          updated_at: identity.updated_at,
        })),
      }
      console.error(JSON.stringify(safeDump, null, 2))
    }

    // Log auth provider config info
    console.error(`[createAndConfirmUser] ============================================`)
    console.error(`[createAndConfirmUser] AUTH PROVIDER CONFIG INFO:`)
    console.error(`[createAndConfirmUser] ============================================`)
    console.error(
      `[createAndConfirmUser] Supabase URL:`,
      process.env.VITE_SUPABASE_URL || '[NOT SET]'
    )
    console.error(
      `[createAndConfirmUser] Has Service Key:`,
      !!(process.env.SUPABASE_SERVICE_KEY || process.env.TEST_SUPABASE_SERVICE_KEY)
    )
    console.error(`[createAndConfirmUser] Has Anon Key:`, !!process.env.VITE_SUPABASE_ANON_KEY)

    // STOP TEST EXECUTION - throw error immediately
    throw new Error(
      `[AUTH VERIFICATION FAILED] User created but cannot authenticate. ` +
        `Email: ${email}, Error: ${verifyError.message}, Status: ${verifyError.status || 'N/A'}. ` +
        `Check logs above for user object dump and auth provider config.`
    )
  }

  if (!signInData.session) {
    console.error(`[createAndConfirmUser] SignIn returned no session!`)
    console.error(`[createAndConfirmUser] SignIn data:`, signInData)
    throw new Error(
      `[AUTH VERIFICATION FAILED] SignIn succeeded but no session returned. Email: ${email}`
    )
  }

  if (!signInData.session.access_token) {
    console.error(`[createAndConfirmUser] SignIn session has no access_token!`)
    console.error(`[createAndConfirmUser] Session:`, {
      access_token: signInData.session.access_token ? '[PRESENT]' : '[MISSING]',
      refresh_token: signInData.session.refresh_token ? '[PRESENT]' : '[MISSING]',
      expires_in: signInData.session.expires_in,
      token_type: signInData.session.token_type,
      user: signInData.session.user
        ? {
            id: signInData.session.user.id,
            email: signInData.session.user.email,
          }
        : null,
    })
    throw new Error(`[AUTH VERIFICATION FAILED] Session missing access_token. Email: ${email}`)
  }

  // Assert that session.access_token exists (already checked above, but log success)
  console.log(`[createAndConfirmUser] SignIn verification successful!`)
  console.log(`[createAndConfirmUser] Session details:`, {
    hasAccessToken: !!signInData.session.access_token,
    hasRefreshToken: !!signInData.session.refresh_token,
    expiresIn: signInData.session.expires_in,
    tokenType: signInData.session.token_type,
    expiresAt: signInData.session.expires_at
      ? new Date(signInData.session.expires_at * 1000).toISOString()
      : null,
    userId: signInData.session.user?.id,
    userEmail: signInData.session.user?.email,
  })
  console.log(`[createAndConfirmUser] ✅ Assertion passed: session.access_token exists`)

  // Sign out the verification session (we just needed to verify it works)
  await supabase.auth.signOut()
  console.log(`[createAndConfirmUser] Verification session signed out`)

  return { userId: data.user.id, email, password }
}

/**
 * Create a test landlord user via Supabase
 * Note: Supabase rate limits sign-ups to 30 per 5 minutes per IP
 */
export async function createTestLandlord(
  email: string,
  password: string
): Promise<{ userId: string; error: any }> {
  try {
    // Longer delay to avoid rate limits (30 requests per 5 min = ~10 seconds between requests)
    // Using 500ms as compromise between test speed and rate limit avoidance
    await delay(500)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      return { userId: '', error }
    }

    if (!data.user) {
      return { userId: '', error: new Error('No user returned from signup') }
    }

    // Wait a moment for trigger to complete (trigger creates user record)
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Verify user record exists (created by trigger)
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', data.user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 means no rows returned, which is OK - we'll create it
      // Other errors are actual problems
      return { userId: data.user.id, error: fetchError }
    }

    // Set user role in users table (update if exists, or this will fail if trigger didn't create it)
    const { error: roleError } = await supabase
      .from('users')
      .update({ role: 'landlord', email: data.user.email })
      .eq('id', data.user.id)

    if (roleError) {
      // If update failed, try insert (in case trigger didn't run)
      const { error: insertError } = await supabase
        .from('users')
        .insert({ id: data.user.id, email: data.user.email, role: 'landlord' })

      if (insertError) {
        return { userId: data.user.id, error: insertError }
      }
    }

    return { userId: data.user.id, error: null }
  } catch (error) {
    return { userId: '', error }
  }
}

/**
 * Create a test tenant user via Supabase
 * Note: Supabase rate limits sign-ups to 30 per 5 minutes per IP
 */
export async function createTestTenant(
  email: string,
  password: string
): Promise<{ userId: string; error: any }> {
  try {
    // Longer delay to avoid rate limits (30 requests per 5 min = ~10 seconds between requests)
    // Using 500ms as compromise between test speed and rate limit avoidance
    await delay(500)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      return { userId: '', error }
    }

    if (!data.user) {
      return { userId: '', error: new Error('No user returned from signup') }
    }

    // Wait a moment for trigger to complete (trigger creates user record)
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Verify user record exists (created by trigger)
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', data.user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 means no rows returned, which is OK - we'll create it
      // Other errors are actual problems
      return { userId: data.user.id, error: fetchError }
    }

    // Set user role in users table (update if exists, or this will fail if trigger didn't create it)
    const { error: roleError } = await supabase
      .from('users')
      .update({ role: 'tenant', email: data.user.email })
      .eq('id', data.user.id)

    if (roleError) {
      // If update failed, try insert (in case trigger didn't run)
      const { error: insertError } = await supabase
        .from('users')
        .insert({ id: data.user.id, email: data.user.email, role: 'tenant' })

      if (insertError) {
        return { userId: data.user.id, error: insertError }
      }
    }

    return { userId: data.user.id, error: null }
  } catch (error) {
    return { userId: '', error }
  }
}

/**
 * Login as landlord via UI
 */
/**
 * Login as landlord via UI
 *
 * Redirect-aware: Handles both cases:
 * 1. User already authenticated → detects redirect to dashboard → returns early
 * 2. User not authenticated → waits for form → submits credentials → waits for redirect
 */
export async function loginAsLandlord(page: Page, email: string, password: string): Promise<void> {
  // Clear all storage first to ensure no residual auth state
  await page.goto('about:blank')
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch (e) {
      // Ignore errors
    }
  })

  // Navigate to login page
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // Wait for either redirect to dashboard OR login form to appear
  // Use Promise.race pattern to handle both cases deterministically
  const expectedDashboardPath = '/landlord/dashboard'
  const formLocator = page.locator('#email')

  try {
    // Wait for either redirect to dashboard (user already authenticated) or form to appear
    // Use longer timeout to account for auth loading state
    await Promise.race([
      // Option 1: Redirect to dashboard (user already authenticated)
      page
        .waitForURL(url => url.pathname === expectedDashboardPath, { timeout: 10000 })
        .then(() => 'redirected'),
      // Option 2: Login form appears (user not authenticated)
      formLocator.waitFor({ state: 'visible', timeout: 10000 }).then(() => 'form'),
    ])

    // Check current URL to determine which case occurred
    const currentUrl = page.url()
    const currentPath = new URL(currentUrl).pathname

    // Case 1: Already redirected to dashboard (user was authenticated)
    if (currentPath === expectedDashboardPath) {
      // User is already logged in - no action needed
      return
    }

    // Case 2: Form is visible - proceed with login
    if (await formLocator.isVisible()) {
      // Fill in login form
      await page.fill('#email', email)
      await page.fill('input[type="password"]', password)

      // Submit form
      await page.click('button[type="submit"]')

      // Wait a moment for login to process
      await page.waitForTimeout(2000)

      // Check if already navigated away from login (success)
      const postSubmitPath = new URL(page.url()).pathname
      if (postSubmitPath === expectedDashboardPath) {
        return
      }

      // Still on login — check for a visible error message (narrow selector)
      const errorElement = page
        .locator('.text-destructive, .bg-destructive\\/20')
        .first()
      const hasError = await errorElement.isVisible({ timeout: 3000 }).catch(() => false)

      if (hasError) {
        const errorText = await errorElement.textContent()
        const screenshotPath = `test-results/login-error-${Date.now()}.png`
        await page.screenshot({ path: screenshotPath })

        // Guard assertion: Fail loudly if credentials are invalid
        if (
          errorText?.includes('Invalid login credentials') ||
          errorText?.toLowerCase().includes('invalid')
        ) {
          throw new Error(
            `[AUTH SEED FAILURE] User exists but cannot authenticate.
     Email: ${email}
     Error: ${errorText}
     Screenshot: ${screenshotPath}
     This usually means admin.createUser was used incorrectly or email confirmation failed.`
          )
        }

        throw new Error(
          `Login failed: ${errorText || 'Unknown error'} (Email: ${email}, Screenshot: ${screenshotPath})`
        )
      }

      // Wait for navigation to dashboard
      try {
        await page.waitForURL(expectedDashboardPath, { timeout: 10000 })
      } catch (error) {
        // Take screenshot if navigation fails
        const screenshotPath = `test-results/login-timeout-${Date.now()}.png`
        await page.screenshot({ path: screenshotPath })
        const finalUrl = page.url()
        throw new Error(
          `Login navigation timeout.
     Current URL: ${finalUrl}
     Expected: ${expectedDashboardPath}
     Email: ${email}
     Screenshot: ${screenshotPath}`
        )
      }
    } else {
      // Neither redirect nor form - this shouldn't happen
      const screenshotPath = `test-results/login-unexpected-state-${Date.now()}.png`
      await page.screenshot({ path: screenshotPath })
      throw new Error(
        `Unexpected state: Neither redirect nor login form appeared.
     Current URL: ${currentUrl}
     Email: ${email}
     Screenshot: ${screenshotPath}`
      )
    }
  } catch (error) {
    // Re-throw specific errors we already formatted
    if (error instanceof Error && (
      error.message.includes('[AUTH SEED FAILURE]') ||
      error.message.includes('Login failed:') ||
      error.message.includes('Login navigation timeout') ||
      error.message.includes('Unexpected state:')
    )) {
      throw error
    }
    // Check if we actually made it to the dashboard despite the error
    const currentUrl = page.url()
    const currentPath = new URL(currentUrl).pathname
    if (currentPath === expectedDashboardPath) {
      return
    }
    const formVisible = await formLocator.isVisible().catch(() => false)
    const screenshotPath = `test-results/login-timeout-${Date.now()}.png`
    await page.screenshot({ path: screenshotPath })

    throw new Error(
      `Login helper timeout: Neither redirect nor form appeared within timeout.
     Current URL: ${currentUrl}
     Form visible: ${formVisible}
     Email: ${email}
     Screenshot: ${screenshotPath}
     Original error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Login as tenant via UI
 *
 * Redirect-aware: Handles both cases:
 * 1. User already authenticated → detects redirect to dashboard → returns early
 * 2. User not authenticated → waits for form → submits credentials → waits for redirect
 */
export async function loginAsTenant(page: Page, email: string, password: string): Promise<void> {
  // Clear all storage first to ensure no residual auth state
  await page.goto('about:blank')
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch (e) {
      // Ignore errors
    }
  })

  // Navigate to login page
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // Wait a moment for auth state to resolve (auth context needs time to check session)
  await page.waitForTimeout(1000)

  // Check current URL first - might have redirected already
  const expectedDashboardPath = '/tenant/dashboard'
  let currentUrl = page.url()
  let currentPath = new URL(currentUrl).pathname

  // Case 1: Already redirected to dashboard (user was authenticated)
  if (currentPath === expectedDashboardPath) {
    // User is already logged in - no action needed
    return
  }

  // Case 2: Still on login page - wait for form to appear
  const formLocator = page.locator('#email')

  try {
    // Wait for login form to appear (user not authenticated)
    await formLocator.waitFor({ state: 'visible', timeout: 15000 })

    // Verify we're still on login page (should be, but double-check)
    currentUrl = page.url()
    currentPath = new URL(currentUrl).pathname

    if (currentPath === expectedDashboardPath) {
      // Redirect happened while waiting - user was authenticated
      return
    }

    // Form is visible - proceed with login
    if (await formLocator.isVisible()) {
      // Fill in login form
      await page.fill('#email', email)
      await page.fill('input[type="password"]', password)

      // Submit form
      await page.click('button[type="submit"]')

      // Wait a moment for login to process
      await page.waitForTimeout(2000)

      // Check if already navigated away from login (success)
      const postSubmitPath = new URL(page.url()).pathname
      if (postSubmitPath === expectedDashboardPath) {
        return
      }

      // Still on login — check for a visible error message (narrow selector)
      const errorElement = page
        .locator('.text-destructive, .bg-destructive\\/20')
        .first()
      const hasError = await errorElement.isVisible({ timeout: 3000 }).catch(() => false)

      if (hasError) {
        const errorText = await errorElement.textContent()
        const screenshotPath = `test-results/login-error-${Date.now()}.png`
        await page.screenshot({ path: screenshotPath })

        // Guard assertion: Fail loudly if credentials are invalid
        if (
          errorText?.includes('Invalid login credentials') ||
          errorText?.toLowerCase().includes('invalid')
        ) {
          throw new Error(
            `[AUTH SEED FAILURE] User exists but cannot authenticate.
     Email: ${email}
     Error: ${errorText}
     Screenshot: ${screenshotPath}
     This usually means admin.createUser was used incorrectly or email confirmation failed.`
          )
        }

        throw new Error(
          `Login failed: ${errorText || 'Unknown error'} (Email: ${email}, Screenshot: ${screenshotPath})`
        )
      }

      // Wait for navigation to dashboard
      try {
        await page.waitForURL(expectedDashboardPath, { timeout: 10000 })
      } catch (error) {
        // Take screenshot if navigation fails
        const screenshotPath = `test-results/login-timeout-${Date.now()}.png`
        await page.screenshot({ path: screenshotPath })
        const finalUrl = page.url()
        throw new Error(
          `Login navigation timeout.
     Current URL: ${finalUrl}
     Expected: ${expectedDashboardPath}
     Email: ${email}
     Screenshot: ${screenshotPath}`
        )
      }
    } else {
      // Neither redirect nor form - this shouldn't happen
      const screenshotPath = `test-results/login-unexpected-state-${Date.now()}.png`
      await page.screenshot({ path: screenshotPath })
      throw new Error(
        `Unexpected state: Neither redirect nor login form appeared.
     Current URL: ${currentUrl}
     Email: ${email}
     Screenshot: ${screenshotPath}`
      )
    }
  } catch (error) {
    // Re-throw specific errors we already formatted
    if (error instanceof Error && (
      error.message.includes('[AUTH SEED FAILURE]') ||
      error.message.includes('Login failed:') ||
      error.message.includes('Login navigation timeout') ||
      error.message.includes('Unexpected state:')
    )) {
      throw error
    }
    // Check if we actually made it to the dashboard despite the error
    const currentUrl = page.url()
    const currentPath = new URL(currentUrl).pathname
    if (currentPath === expectedDashboardPath) {
      return
    }
    const formVisible = await formLocator.isVisible().catch(() => false)
    const screenshotPath = `test-results/login-timeout-${Date.now()}.png`
    await page.screenshot({ path: screenshotPath })

    throw new Error(
      `Login helper timeout: Neither redirect nor form appeared within timeout.
     Current URL: ${currentUrl}
     Form visible: ${formVisible}
     Email: ${email}
     Screenshot: ${screenshotPath}
     Original error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Sign out via UI
 */
export async function signOut(page: Page): Promise<void> {
  // Look for sign out button (adjust selector based on actual UI)
  const signOutButton = page.locator('text=/sign out/i').or(page.locator('text=/logout/i'))
  if (await signOutButton.isVisible()) {
    await signOutButton.click()
    await page.waitForURL('/login', { timeout: 5000 })
  }
}

/**
 * Get Supabase client for backend validation
 * Note: This client uses the anon key and may not have authenticated session
 * For authenticated operations, create a client with a user's session token
 */
export function getSupabaseClient() {
  return supabase
}
