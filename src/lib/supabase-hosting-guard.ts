/**
 * Hosting / Supabase alignment checks for the browser bundle.
 * Pure helpers are exported for unit tests.
 */

export type HostingDeploymentLabel = 'local development' | 'preview deployment' | 'production deployment' | 'unknown build'

export function resolveSupabaseEnvironmentName(
  viteSupabaseEnv: string | undefined,
  supabaseUrl: string
): string {
  const trimmed = (viteSupabaseEnv || '').trim()
  if (trimmed) return trimmed

  const u = (supabaseUrl || '').toLowerCase()
  if (u.includes('127.0.0.1') || u.includes('localhost')) return 'local (inferred from URL)'
  return 'unset — set VITE_ENVIRONMENT (development | staging | production)'
}

export function getHostingDeploymentLabel(isViteDev: boolean, hostingEnv: string | undefined): HostingDeploymentLabel {
  if (isViteDev) return 'local development'
  const h = (hostingEnv || '').trim()
  if (h === 'production') return 'production deployment'
  if (h === 'preview') return 'preview deployment'
  if (h === 'development') return 'local development'
  return 'unknown build'
}

/** Matches {@link AppEnvironmentKind} in config — kept inline to avoid importing config from this test-friendly module. */
export type AppTier = 'development' | 'staging' | 'production'

/** True when this bundle should be treated as production hosting (not preview, not Vite dev). */
export function isStrictProductionHosting(
  isViteDev: boolean,
  isViteProdBuild: boolean,
  hostingEnv: string | undefined,
  appEnvironmentKind: AppTier
): boolean {
  if (isViteDev) return false
  if ((hostingEnv || '').trim() === 'production') return true
  if (isViteProdBuild && appEnvironmentKind === 'production') return true
  return false
}

/**
 * Fail fast if production hosting is configured with the staging Supabase project ref.
 * `stagingProjectRef` is the subdomain of https://<ref>.supabase.co (baked in at build time for production CI).
 */
export function assertProductionHostingDoesNotUseStagingSupabase(options: {
  supabaseUrl: string
  stagingProjectRefToForbid: string | undefined
  isProductionHosting: boolean
}): void {
  const { supabaseUrl, stagingProjectRefToForbid, isProductionHosting } = options
  if (!isProductionHosting) return

  const ref = (stagingProjectRefToForbid || '').trim()
  if (!ref) return

  const url = supabaseUrl || ''
  if (url.includes(`${ref}.supabase.co`) || url.includes(`${ref}.supabase.in`)) {
    throw new Error(
      'Production hosting is pointing at the staging Supabase project. ' +
        'Fix VITE_SUPABASE_URL on your production host or rebuild with the correct production Supabase URL.'
    )
  }
}

export function isProductionOrPreviewForLogging(
  isViteDev: boolean,
  isViteProd: boolean,
  hostingEnv: string | undefined
): 'production' | 'preview' | 'local (vite dev)' | 'unknown (non-Vercel production build)' {
  if (isViteDev) return 'local (vite dev)'
  const h = (hostingEnv || '').trim()
  if (h === 'production') return 'production'
  if (h === 'preview') return 'preview'
  if (isViteProd) return 'unknown (non-Vercel production build)'
  return 'local (vite dev)'
}
