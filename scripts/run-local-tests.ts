/**
 * Full local test run: ensure Supabase, reset DB, seed, run E2E.
 * Forces local Supabase URL/keys (overrides .env.local).
 *
 * Run: npm run test:local
 */

import { execSync } from 'child_process'
import './load-dotenv'

// Force local Supabase - override .env.local so we never hit cloud
process.env.SUPABASE_ENV = 'local'

// Load local URL, anon key and service role from `supabase status`
// Uses actual ports from supabase/config.toml (e.g. 55321 on Windows)
function loadLocalSupabaseEnv(): void {
  let output: string
  try {
    output = execSync('npx supabase status -o env', { encoding: 'utf-8' })
  } catch {
    throw new Error('supabase status failed. Is local Supabase running? Run: npx supabase start')
  }
  let apiUrl = ''
  let anon = ''
  let serviceRole = ''
  for (const line of output.split('\n')) {
    const m = line.match(/^(API_URL|PUBLISHABLE_KEY|ANON_KEY|SECRET_KEY|SERVICE_ROLE_KEY)=(.+)$/)
    if (m) {
      const val = m[2].trim().replace(/^["']|["']$/g, '')
      if (m[1] === 'API_URL') apiUrl = val
      if (m[1] === 'PUBLISHABLE_KEY' || m[1] === 'ANON_KEY') anon = val
      if (m[1] === 'SECRET_KEY' || m[1] === 'SERVICE_ROLE_KEY') serviceRole = val
    }
  }
  if (!apiUrl) {
    throw new Error('Could not parse API_URL from supabase status. Is local Supabase running?')
  }
  if (!anon || !serviceRole) {
    throw new Error('Could not parse PUBLISHABLE_KEY/SECRET_KEY from supabase status. Is local Supabase running?')
  }
  process.env.VITE_SUPABASE_URL = apiUrl
  process.env.VITE_SUPABASE_ANON_KEY = anon
  process.env.VITE_ENVIRONMENT = 'development'
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRole
  process.env.SUPABASE_SERVICE_KEY = serviceRole
  process.env.TEST_SUPABASE_SERVICE_KEY = serviceRole
}

console.log('Running local test suite...\n')

// Load URL and keys from supabase status first (uses actual ports from config, e.g. 55321)
loadLocalSupabaseEnv()

execSync('npx tsx scripts/validate-env.ts', {
  stdio: 'inherit',
  env: process.env,
})

execSync('npx tsx scripts/ensure-local-supabase.ts', {
  stdio: 'inherit',
  env: process.env,
})

// db reset can fail intermittently (container timing on Windows/Docker)
const maxRetries = 3
let lastError: Error | null = null
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    if (attempt > 1) {
      console.log(`\nRetrying db reset (attempt ${attempt}/${maxRetries})...`)
      await new Promise((r) => setTimeout(r, 5000))
    }
    execSync('npx supabase db reset', {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
    })
    lastError = null
    break
  } catch (err) {
    lastError = err as Error
    if (attempt === maxRetries) {
      console.error(
        '\n❌ db reset failed after',
        maxRetries,
        'attempts. Try manually: npx supabase db reset --debug'
      )
      throw lastError
    }
  }
}

execSync('npm run seed:demo', {
  stdio: 'inherit',
  env: process.env,
})

execSync('npm run test:e2e:headless', {
  stdio: 'inherit',
  env: process.env,
})

console.log('\n✓ Local test suite complete')
