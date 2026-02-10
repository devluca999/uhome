/**
 * Startup validation - confirms required env vars and detects conflicts.
 * Run before dev or test:local.
 *
 * npm run dev (optional pre-step)
 * npm run test:local (invoked internally)
 */

import './load-dotenv'

const url = process.env.VITE_SUPABASE_URL || ''
const env = process.env.SUPABASE_ENV || process.env.VITE_SUPABASE_ENV || ''

function warn(msg: string) {
  console.warn(`⚠️  ${msg}`)
}

function fail(msg: string, code = 1) {
  console.error(`❌ ${msg}`)
  process.exit(code)
}

// Required for test/dev
if (!url || !url.trim()) {
  fail(
    'VITE_SUPABASE_URL is not set. Add to .env.local or .env.test. ' +
      'For local: VITE_SUPABASE_URL=http://127.0.0.1:54321'
  )
}

// Detect conflicts
if (env === 'local' && (url.includes('staging') || url.includes('.supabase.co'))) {
  warn(`SUPABASE_ENV=local but URL looks like cloud (${url}). Use http://127.0.0.1:54321 for local.`)
}

if (env === 'staging' && url.includes('127.0.0.1')) {
  warn(`SUPABASE_ENV=staging but URL is localhost. Use cloud staging URL for staging.`)
}

if (env === 'production') {
  fail('SUPABASE_ENV=production - cannot run dev or tests against production.')
}

// Prod build should never have service key in client
// (This script runs in Node, so we're checking for seed/test contexts)
if (process.env.SUPABASE_SERVICE_ROLE_KEY && env === 'production') {
  warn('SUPABASE_SERVICE_ROLE_KEY is set with production - ensure it is never exposed to client.')
}

console.log('✓ Env validation passed')
