/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Primary app tier: development | staging | production (aliases: dev, local, prod). */
  readonly VITE_ENVIRONMENT?: string
  /** @deprecated Use VITE_ENVIRONMENT; still accepted as fallback. */
  readonly VITE_SUPABASE_ENV?: string
  /** Vercel: injected from VERCEL_ENV in vite.config. CI: set explicitly (e.g. production / preview). */
  readonly VITE_HOSTING_ENV?: string
  /** Staging project ref (subdomain only); production builds forbid this ref in VITE_SUPABASE_URL. */
  readonly VITE_STAGING_SUPABASE_PROJECT_REF?: string
  readonly SUPABASE_SERVICE_ROLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
