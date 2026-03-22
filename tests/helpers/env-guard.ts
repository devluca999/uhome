/**
 * Environment Guard - Hard Block for Production
 *
 * This guard ensures that automated tests, seed scripts, and dev mode features
 * can NEVER run against production. It throws immediately if production is
 * detected, preventing any accidental execution.
 *
 * Usage:
 * - Import at the top of Playwright config
 * - Import in seed scripts, db-helpers, auth-helpers, reset
 * - This is a hard-fail - tests and seeds will not run if production is detected
 */

import {
  ALLOWED_ENVS,
  isProductionEnv,
  isNonProductionEnv as isNonProductionEnvPure,
} from '../../src/lib/env-safety'

export { ALLOWED_ENVS }

/**
 * True when the Supabase API URL points at local CLI (Docker), including non-default ports.
 */
export function isLocalSupabaseUrl(url: string): boolean {
  const u = (url || '').toLowerCase()
  return u.includes('127.0.0.1') || u.includes('localhost')
}

/**
 * Check if the current environment is production.
 * Returns true when SUPABASE_ENV=production or URL contains prod/production.
 */
export function isProduction(): boolean {
  const env =
    process.env.SUPABASE_ENV !== undefined
      ? process.env.SUPABASE_ENV
      : process.env.VITE_SUPABASE_ENV || ''
  const url = process.env.VITE_SUPABASE_URL || ''
  return isProductionEnv(env, url)
}

/**
 * Check if the current environment is allowed for tests, seeds, and dev mode.
 */
function isNonProductionEnvironment(): boolean {
  const env =
    process.env.SUPABASE_ENV !== undefined
      ? process.env.SUPABASE_ENV
      : process.env.VITE_SUPABASE_ENV || ''
  const supabaseUrl = process.env.VITE_SUPABASE_URL || ''

  if (!supabaseUrl || supabaseUrl.trim() === '') {
    throw new Error('❌ VITE_SUPABASE_URL is not set. Tests and seeds require explicit configuration.')
  }

  const normalizedEnv = env.trim().toLowerCase()
  const normalizedUrl = supabaseUrl.trim().toLowerCase()

  // Fail closed for ambiguous environments (no explicit env and URL doesn't indicate local/staging/test).
  if (
    !normalizedEnv &&
    !normalizedUrl.includes('localhost') &&
    !normalizedUrl.includes('127.0.0.1') &&
    !normalizedUrl.includes('staging') &&
    !normalizedUrl.includes('test')
  ) {
    return false
  }

  return isNonProductionEnvPure(env, supabaseUrl)
}

/**
 * Hard guard that throws if production is detected.
 * Call this at the start of any test execution, seed script, or admin operation.
 * Allows: local, staging, test environments.
 */
export function enforceNonProduction(): void {
  if (isProduction()) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'NOT SET'
    const env =
      process.env.SUPABASE_ENV !== undefined
        ? process.env.SUPABASE_ENV || 'NOT SET'
        : process.env.VITE_SUPABASE_ENV || 'NOT SET'

    throw new Error(
      `❌ Automated tests, seeds, and dev mode are restricted to non-production only\n\n` +
        `Current environment:\n` +
        `  SUPABASE_ENV: ${env}\n` +
        `  VITE_SUPABASE_URL: ${supabaseUrl}\n\n` +
        `To run tests or seeds:\n` +
        `  1. Set SUPABASE_ENV=local (for local Supabase) or staging (for cloud staging)\n` +
        `  2. Ensure VITE_SUPABASE_URL points to local (127.0.0.1:54321) or staging instance\n` +
        `  3. Verify URL does not contain 'prod' or 'production'\n\n` +
        `Production safety: Tests and seeds will NOT run against production.`
    )
  }

  if (!isNonProductionEnvironment()) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'NOT SET'
    const env = process.env.SUPABASE_ENV || process.env.VITE_SUPABASE_ENV || 'NOT SET'

    throw new Error(
      `❌ Cannot determine environment (fail closed)\n\n` +
        `Current environment:\n` +
        `  SUPABASE_ENV: ${env}\n` +
        `  VITE_SUPABASE_URL: ${supabaseUrl}\n\n` +
        `Set SUPABASE_ENV to one of: local, staging, test\n` +
        `Or ensure VITE_SUPABASE_URL contains: localhost, 127.0.0.1, staging, or test`
    )
  }
}

/**
 * @deprecated Use enforceNonProduction() instead. Kept for backwards compatibility.
 */
export function enforceStagingOnly(): void {
  enforceNonProduction()
}

/**
 * Get current environment status (for logging/debugging)
 */
export function getEnvironmentStatus(): {
  isStaging: boolean
  isProduction: boolean
  supabaseUrl: string
  envVar: string
  reason: string
  allowedEnvs: readonly string[]
} {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'NOT SET'
  const envVar =
    process.env.SUPABASE_ENV !== undefined
      ? process.env.SUPABASE_ENV || 'NOT SET'
      : process.env.VITE_SUPABASE_ENV || 'NOT SET'
  const prod = isProduction()

  let reason = ''
  if (envVar === 'production') {
    reason = 'SUPABASE_ENV explicitly set to production'
  } else if (
    (supabaseUrl || '').toLowerCase().includes('prod') ||
    (supabaseUrl || '').toLowerCase().includes('production')
  ) {
    reason = 'Supabase URL contains production indicators'
  } else if (envVar === 'local' || envVar === 'staging' || envVar === 'test') {
    reason = `SUPABASE_ENV explicitly set to ${envVar}`
  } else if (
    (supabaseUrl || '').toLowerCase().includes('staging') ||
    (supabaseUrl || '').toLowerCase().includes('test') ||
    (supabaseUrl || '').includes('localhost') ||
    (supabaseUrl || '').includes('127.0.0.1')
  ) {
    reason = 'Supabase URL contains local/staging/test indicators'
  } else {
    reason = 'Could not determine environment (failing safe)'
  }

  return {
    isStaging: !prod,
    isProduction: prod,
    supabaseUrl,
    envVar,
    reason,
    allowedEnvs: ALLOWED_ENVS,
  }
}

// Auto-enforce on import (for test runners) - skip when NODE_ENV=test (Vitest)
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  try {
    enforceNonProduction()
  } catch (error) {
    console.error(
      '⚠️ Environment guard warning:',
      error instanceof Error ? error.message : String(error)
    )
  }
}
