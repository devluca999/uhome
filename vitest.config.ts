import { mergeConfig } from 'vite'
import { defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

/**
 * Unit tests import modules that read `import.meta.env` via `src/config/environment.ts`.
 * These defines match a safe local-dev tier so tests can load without a real `.env`.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://127.0.0.1:54321'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('vitest-anon-key'),
      'import.meta.env.VITE_ENVIRONMENT': JSON.stringify('development'),
      'import.meta.env.VITE_SUPABASE_ENV': JSON.stringify(''),
      'import.meta.env.VITE_HOSTING_ENV': JSON.stringify(''),
      'import.meta.env.VITE_STAGING_SUPABASE_PROJECT_REF': JSON.stringify(''),
    },
    test: {
      environment: 'node',
      include: ['tests/unit/**/*.spec.ts'],
      globals: false,
    },
  })
)
