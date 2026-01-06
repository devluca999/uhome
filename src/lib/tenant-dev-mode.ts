/**
 * Dev Mode Feature Flag Utility (Tenant + Landlord)
 *
 * Controls access to mock data for E2E testing, UAT, demos, and developer onboarding.
 * Supports both tenant and landlord dev modes with real-time sync.
 *
 * Security Model:
 * - Primary gate: VITE_TENANT_DEV_MODE_ENABLED / VITE_LANDLORD_DEV_MODE_ENABLED environment variable (must be 'true')
 * - Secondary trigger: URL parameter ?dev=tenant or ?dev=landlord (runtime toggle)
 * - Both must be true for dev mode to activate
 *
 * This prevents accidental activation in production while allowing easy toggling during development.
 */

export const TENANT_DEV_MODE_STORAGE_KEY = 'tenant-dev-mode-state'
export const LANDLORD_DEV_MODE_STORAGE_KEY = 'landlord-dev-mode-state'
export const TENANT_DEV_MODE_VERSION = '1.0.0'
export const LANDLORD_DEV_MODE_VERSION = '1.0.0'

/**
 * Demo tenant account credentials (seeded in database)
 */
export const DEMO_TENANT_CREDENTIALS = {
  email: 'demo-tenant@uhome.internal',
  password: 'DemoTenant2024!',
} as const

/**
 * Demo landlord account credentials (seeded in database)
 */
export const DEMO_LANDLORD_CREDENTIALS = {
  email: 'demo-landlord@uhome.internal',
  password: 'DemoLandlord2024!',
} as const

/**
 * Check if Tenant Dev Mode is currently active
 *
 * Returns true only if:
 * 1. Environment variable VITE_TENANT_DEV_MODE_ENABLED is 'true'
 * 2. URL parameter ?dev=tenant is present
 *
 * This dual-gate ensures:
 * - Production cannot accidentally enable dev mode (env var is false)
 * - Dev/staging can toggle easily without rebuilds (URL param)
 */
export function isTenantDevModeActive(): boolean {
  // Primary gate: Environment variable must be explicitly enabled
  const envEnabled = import.meta.env.VITE_TENANT_DEV_MODE_ENABLED === 'true'

  if (!envEnabled) {
    return false
  }

  // Secondary trigger: URL parameter for runtime toggling
  if (typeof window === 'undefined') {
    return false // SSR/build-time safety
  }

  const urlParams = new URLSearchParams(window.location.search)
  const urlTrigger = urlParams.get('dev') === 'tenant'

  return urlTrigger
}

/**
 * Check if Tenant Dev Mode is available (env var enabled)
 * even if not currently active via URL param
 */
export function isTenantDevModeAvailable(): boolean {
  return import.meta.env.VITE_TENANT_DEV_MODE_ENABLED === 'true'
}

/**
 * Get configuration for Tenant Dev Mode
 */
export function getTenantDevModeConfig() {
  return {
    isActive: isTenantDevModeActive(),
    isAvailable: isTenantDevModeAvailable(),
    storageKey: TENANT_DEV_MODE_STORAGE_KEY,
    version: TENANT_DEV_MODE_VERSION,
    demoCredentials: DEMO_TENANT_CREDENTIALS,
  }
}

/**
 * Add dev mode URL parameter to current location
 * Useful for programmatic navigation to dev mode
 */
export function getDevModeUrl(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  const url = new URL(window.location.href)
  url.searchParams.set('dev', 'tenant')
  return url.toString()
}

/**
 * Remove dev mode URL parameter from current location
 */
export function getNormalModeUrl(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  const url = new URL(window.location.href)
  url.searchParams.delete('dev')
  return url.toString()
}

/**
 * Check if Landlord Dev Mode is currently active
 *
 * Returns true only if:
 * 1. Environment variable VITE_LANDLORD_DEV_MODE_ENABLED is 'true'
 * 2. URL parameter ?dev=landlord is present
 */
export function isLandlordDevModeActive(): boolean {
  // Primary gate: Environment variable must be explicitly enabled
  const envEnabled = import.meta.env.VITE_LANDLORD_DEV_MODE_ENABLED === 'true'

  if (!envEnabled) {
    return false
  }

  // Secondary trigger: URL parameter for runtime toggling
  if (typeof window === 'undefined') {
    return false // SSR/build-time safety
  }

  const urlParams = new URLSearchParams(window.location.search)
  const urlTrigger = urlParams.get('dev') === 'landlord'

  return urlTrigger
}

/**
 * Check if Landlord Dev Mode is available (env var enabled)
 * even if not currently active via URL param
 */
export function isLandlordDevModeAvailable(): boolean {
  return import.meta.env.VITE_LANDLORD_DEV_MODE_ENABLED === 'true'
}

/**
 * Check if any dev mode is available (either tenant or landlord)
 */
export function isDevModeAvailable(): boolean {
  return isTenantDevModeAvailable() || isLandlordDevModeAvailable()
}

/**
 * Get currently active dev mode role, or null if none active
 */
export function isDevModeActive(): 'tenant' | 'landlord' | null {
  if (isTenantDevModeActive()) return 'tenant'
  if (isLandlordDevModeActive()) return 'landlord'
  return null
}

/**
 * Auto-detect dev mode from demo account email
 * Returns the dev mode role that should be activated for the given email
 */
export function shouldActivateDevMode(email: string): 'tenant' | 'landlord' | null {
  if (!isDevModeAvailable()) return null

  if (email === DEMO_TENANT_CREDENTIALS.email) return 'tenant'
  if (email === DEMO_LANDLORD_CREDENTIALS.email) return 'landlord'
  return null
}

/**
 * Get configuration for Landlord Dev Mode
 */
export function getLandlordDevModeConfig() {
  return {
    isActive: isLandlordDevModeActive(),
    isAvailable: isLandlordDevModeAvailable(),
    storageKey: LANDLORD_DEV_MODE_STORAGE_KEY,
    version: LANDLORD_DEV_MODE_VERSION,
    demoCredentials: DEMO_LANDLORD_CREDENTIALS,
  }
}

/**
 * Log dev mode status (for debugging)
 */
export function logDevModeStatus(): void {
  if (import.meta.env.DEV) {
    const tenantConfig = getTenantDevModeConfig()
    const landlordConfig = getLandlordDevModeConfig()
    const activeMode = isDevModeActive()

    console.log('[Dev Mode Status]', {
      active: activeMode,
      tenantActive: tenantConfig.isActive,
      landlordActive: landlordConfig.isActive,
      tenantAvailable: tenantConfig.isAvailable,
      landlordAvailable: landlordConfig.isAvailable,
      tenantEnvVar: import.meta.env.VITE_TENANT_DEV_MODE_ENABLED,
      landlordEnvVar: import.meta.env.VITE_LANDLORD_DEV_MODE_ENABLED,
      urlParam:
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('dev')
          : null,
    })

    if (activeMode) {
      console.warn(`[${activeMode} Dev Mode] Active - Using staging database`)
    }
  }
}
