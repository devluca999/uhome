/**
 * Shared environment safety logic - used by both Node (env-guard, seeds) and browser (tenant-dev-mode).
 * Pure functions that take env/url as arguments to work in both contexts.
 */

export const ALLOWED_ENVS = ['local', 'staging', 'test'] as const

// Safe accessor for Node-style env without depending on Node types.
// Uses globalThis to avoid referencing `process` directly (which would
// require @types/node in browser builds).
function getNodeEnvValue(key: string): string | undefined {
  const g = globalThis as any
  return g?.process?.env?.[key]
}

/**
 * Check if the given env/url combination indicates production.
 */
export function isProductionEnv(env: string, url: string): boolean {
  const urlLower = (url || '').toLowerCase()
  if (env === 'production') return true
  if (urlLower.includes('prod') || urlLower.includes('production')) return true
  return false
}

/**
 * Check if the given env/url combination is allowed for tests, seeds, dev mode.
 * Allowed: env in (local, staging, test) OR url contains (localhost, 127.0.0.1, staging, test)
 */
export function isNonProductionEnv(env: string, url: string): boolean {
  if (isProductionEnv(env, url)) return false

  // If env is explicitly set to a known non-production value, allow even when URL is missing.
  if (ALLOWED_ENVS.includes(env as (typeof ALLOWED_ENVS)[number])) return true

  const urlTrimmed = (url || '').trim()
  const urlLower = urlTrimmed.toLowerCase()
  if (!urlTrimmed) return false
  if (urlLower.includes('localhost') || urlLower.includes('127.0.0.1')) return true
  if (urlLower.includes('staging') || urlLower.includes('test')) return true
  return false
}

export interface EnvironmentCapabilities {
  canWrite: boolean
  canResetDb: boolean
  canSeed: boolean
}

/**
 * Assert environment capabilities. Throws if a required capability is false.
 * Prevents accidental writes, resets, or prod seeding by new contributors.
 *
 * @param required - Capabilities that must be true. Throws if any are false.
 * @param env - SUPABASE_ENV (default: process.env or import.meta.env)
 * @param url - VITE_SUPABASE_URL
 */
export function assertEnvironmentCapabilities(
  required: Partial<EnvironmentCapabilities>,
  envSource?: { env?: string; url?: string }
): void {
  // Prefer explicit envSource; fall back to Vite's import.meta.env (browser)
  // and finally to Node-style env via globalThis for scripts.
  const env =
    envSource?.env ??
    (import.meta as any)?.env?.SUPABASE_ENV ??
    (import.meta as any)?.env?.VITE_SUPABASE_ENV ??
    getNodeEnvValue('SUPABASE_ENV') ??
    getNodeEnvValue('VITE_SUPABASE_ENV') ??
    ''
  const url =
    envSource?.url ??
    (import.meta as any)?.env?.VITE_SUPABASE_URL ??
    getNodeEnvValue('VITE_SUPABASE_URL') ??
    ''
  const isProd = isProductionEnv(env, url)
  const isNonProd = isNonProductionEnv(env, url)

  const capabilities: EnvironmentCapabilities = {
    canWrite: !isProd,
    canResetDb: isNonProd, // Only reset non-prod DBs (staging, local)
    canSeed: isNonProd,
  }

  for (const [key, mustBeTrue] of Object.entries(required)) {
    if (mustBeTrue && !capabilities[key as keyof EnvironmentCapabilities]) {
      throw new Error(
        `assertEnvironmentCapabilities: ${key} is not allowed. ` +
          `Env=${env}, URL=${url?.substring(0, 30)}..., isProd=${isProd}`
      )
    }
  }
}
