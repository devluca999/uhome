/**
 * Preemptive startup validation - ensures local Supabase is running before tests/seeds.
 * Fails fast with actionable error if not reachable.
 *
 * Run: npx tsx scripts/ensure-local-supabase.ts
 * Or invoke from test:local, Playwright globalSetup, or seed scripts.
 */

import './load-dotenv'

// Use URL from env (set by get-local-supabase-env / supabase status) or default from supabase/config.toml [api].port
const API_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:55321'
const API_BASE = API_URL.replace(/\/$/, '')

async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        apikey: process.env.VITE_SUPABASE_ANON_KEY || 'placeholder',
        Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY || 'placeholder'}`,
      },
    })
    return res.status < 500
  } catch {
    return false
  }
}

async function main(): Promise<void> {
  const ok = await checkHealth()
  if (!ok) {
    console.error(`
❌ Local Supabase is not reachable at ${API_BASE}

Ensure:
  1. Docker is running
  2. Run: npm run db:start
  3. Wait for services to be ready (check with: npm run db:status)

Then reset DB (migrations + seed.sql) and optional demo fixtures:
  npm run db:reset
  npm run db:seed:demo
`)
    process.exit(1)
  }
  console.log('✓ Local Supabase is reachable at', API_BASE)
}

main()
