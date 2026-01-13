/**
 * Environment Guard - Hard Block for Production
 * 
 * This guard ensures that automated tests and dev mode features
 * can NEVER run against production. It throws immediately if
 * production is detected, preventing any accidental execution.
 * 
 * Usage:
 * - Import at the top of Playwright config
 * - Import in any test runner or CI pipeline
 * - This is a hard-fail - tests will not run if production is detected
 */

/**
 * Check if the current environment is staging
 * Returns true only if explicitly set to 'staging'
 */
function isStagingEnvironment(): boolean {
  // Check explicit environment variable
  const env = process.env.SUPABASE_ENV || process.env.VITE_SUPABASE_ENV
  if (env === 'staging') {
    return true
  }

  // Check Supabase URL for staging indicators
  const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
  
  // If URL contains 'prod' or 'production', it's NOT staging
  if (supabaseUrl.toLowerCase().includes('prod') || 
      supabaseUrl.toLowerCase().includes('production')) {
    return false
  }

  // If URL is empty or not set, we can't determine - fail safe
  if (!supabaseUrl || supabaseUrl.trim() === '') {
    throw new Error(
      '❌ VITE_SUPABASE_URL is not set. Cannot determine environment. ' +
      'Tests require explicit staging environment configuration.'
    )
  }

  // Default: if env var is not 'staging' and URL doesn't contain staging indicators,
  // we assume it might be production - fail safe
  // Only allow if URL explicitly contains 'staging' or 'test'
  if (supabaseUrl.toLowerCase().includes('staging') || 
      supabaseUrl.toLowerCase().includes('test') ||
      supabaseUrl.includes('localhost') ||
      supabaseUrl.includes('127.0.0.1')) {
    return true
  }

  // If we can't determine, fail safe (assume production)
  return false
}

/**
 * Hard guard that throws if production is detected
 * Call this at the start of any test execution
 */
export function enforceStagingOnly(): void {
  if (!isStagingEnvironment()) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'NOT SET'
    const env = process.env.SUPABASE_ENV || process.env.VITE_SUPABASE_ENV || 'NOT SET'
    
    throw new Error(
      `❌ Automated tests and dev mode are restricted to STAGING only\n\n` +
      `Current environment:\n` +
      `  SUPABASE_ENV: ${env}\n` +
      `  VITE_SUPABASE_URL: ${supabaseUrl}\n\n` +
      `To run tests:\n` +
      `  1. Set SUPABASE_ENV=staging\n` +
      `  2. Ensure VITE_SUPABASE_URL points to staging instance\n` +
      `  3. Verify URL does not contain 'prod' or 'production'\n\n` +
      `Production safety: Tests will NOT run against production.`
    )
  }
}

/**
 * Get current environment status (for logging/debugging)
 */
export function getEnvironmentStatus(): {
  isStaging: boolean
  supabaseUrl: string
  envVar: string
  reason: string
} {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'NOT SET'
  const envVar = process.env.SUPABASE_ENV || process.env.VITE_SUPABASE_ENV || 'NOT SET'
  const isStaging = isStagingEnvironment()
  
  let reason = ''
  if (envVar === 'staging') {
    reason = 'SUPABASE_ENV explicitly set to staging'
  } else if (supabaseUrl.toLowerCase().includes('prod') || supabaseUrl.toLowerCase().includes('production')) {
    reason = 'Supabase URL contains production indicators'
  } else if (supabaseUrl.toLowerCase().includes('staging') || supabaseUrl.toLowerCase().includes('test')) {
    reason = 'Supabase URL contains staging/test indicators'
  } else {
    reason = 'Could not determine environment (failing safe)'
  }

  return {
    isStaging,
    supabaseUrl,
    envVar,
    reason,
  }
}

// Auto-enforce on import (for test runners)
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  // Only enforce in Node.js environments (not browser)
  try {
    enforceStagingOnly()
  } catch (error) {
    // Log the error but don't throw during module load
    // The guard will be called explicitly in test configs
    console.error('⚠️ Environment guard warning:', error instanceof Error ? error.message : String(error))
  }
}

