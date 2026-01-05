import { Page, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

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
export async function loginAsLandlord(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // Fill in login form
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)

  // Submit form
  await page.click('button[type="submit"]')

  // Wait for navigation to dashboard
  await page.waitForURL('/landlord/dashboard', { timeout: 10000 })
}

/**
 * Login as tenant via UI
 */
export async function loginAsTenant(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // Fill in login form
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)

  // Submit form
  await page.click('button[type="submit"]')

  // Wait for navigation to dashboard
  await page.waitForURL('/tenant/dashboard', { timeout: 10000 })
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
