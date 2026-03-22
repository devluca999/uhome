/**
 * Central environment configuration for the Vite app.
 * All Supabase client settings come from env vars only (no hardcoded URLs or keys).
 */

export type AppEnvironmentKind = 'development' | 'staging' | 'production'

export interface AppEnvironment {
  kind: AppEnvironmentKind
  /** Original label before normalization (e.g. `local`, `dev`) */
  label: string
  supabaseUrl: string
  supabaseAnonKey: string
}

function trimOrEmpty(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function parseKind(raw: string): AppEnvironmentKind {
  const s = raw.trim().toLowerCase()
  if (['development', 'dev', 'local'].includes(s)) return 'development'
  if (s === 'staging') return 'staging'
  if (['production', 'prod'].includes(s)) return 'production'
  throw new Error(
    `Invalid VITE_ENVIRONMENT "${raw}". Expected development | staging | production (aliases: dev, local, prod).`
  )
}

function loadAppEnvironment(): AppEnvironment {
  const supabaseUrl = trimOrEmpty(import.meta.env.VITE_SUPABASE_URL)
  const supabaseAnonKey = trimOrEmpty(import.meta.env.VITE_SUPABASE_ANON_KEY)

  if (!supabaseUrl) {
    throw new Error(
      'Missing VITE_SUPABASE_URL. Add it to .env.local (see .env.example). The app cannot start without it.'
    )
  }
  if (!supabaseAnonKey) {
    throw new Error(
      'Missing VITE_SUPABASE_ANON_KEY. Add it to .env.local (see .env.example). The app cannot start without it.'
    )
  }

  const primary = trimOrEmpty(import.meta.env.VITE_ENVIRONMENT)
  const legacy = trimOrEmpty(import.meta.env.VITE_SUPABASE_ENV)
  const raw = primary || legacy

  if (!raw) {
    throw new Error(
      'Missing VITE_ENVIRONMENT. Set it to development, staging, or production. ' +
        '(Legacy: VITE_SUPABASE_ENV is still accepted as a fallback.)'
    )
  }

  const kind = parseKind(raw)
  return {
    kind,
    label: raw,
    supabaseUrl,
    supabaseAnonKey,
  }
}

/** Parsed once; throws on missing/invalid configuration before any client use. */
export const appEnvironment: AppEnvironment = loadAppEnvironment()

export const isDevelopment: boolean = appEnvironment.kind === 'development'
export const isStaging: boolean = appEnvironment.kind === 'staging'
export const isProduction: boolean = appEnvironment.kind === 'production'
