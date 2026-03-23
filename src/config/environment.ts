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

/**
 * Vite injects `import.meta.env` in the browser build. Playwright test workers and other
 * Node contexts load this module without Vite, so fall back to `process.env` (CI sets VITE_*).
 */
function readViteVar(name: string): string {
  try {
    const im = import.meta.env
    if (im && typeof (im as Record<string, unknown>)[name] === 'string') {
      return trimOrEmpty((im as Record<string, string>)[name])
    }
  } catch {
    /* import.meta.env unavailable */
  }
  if (typeof globalThis !== 'undefined' && 'process' in globalThis) {
    const proc = (globalThis as unknown as { process?: { env?: Record<string, unknown> } }).process
    const v = proc?.env?.[name]
    return trimOrEmpty(v)
  }
  return ''
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
  const supabaseUrl = readViteVar('VITE_SUPABASE_URL')
  const supabaseAnonKey = readViteVar('VITE_SUPABASE_ANON_KEY')

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

  const primary = readViteVar('VITE_ENVIRONMENT')
  const legacy = readViteVar('VITE_SUPABASE_ENV')
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
