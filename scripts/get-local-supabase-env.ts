/**
 * Extracts local Supabase env vars from `supabase status` output.
 * Run after supabase start. Outputs key=value lines for export.
 *
 * Usage: eval $(npx tsx scripts/get-local-supabase-env.ts)
 */

import { execSync } from 'child_process'

const output = execSync('npx supabase status -o env', { encoding: 'utf-8' })

let anon = ''
let serviceRole = ''

for (const line of output.split('\n')) {
  const m = line.match(/^(PUBLISHABLE_KEY|ANON_KEY|SECRET_KEY|SERVICE_ROLE_KEY)=(.+)$/)
  if (m) {
    const val = m[2].trim().replace(/^["']|["']$/g, '')
    if (m[1] === 'PUBLISHABLE_KEY' || m[1] === 'ANON_KEY') anon = val
    if (m[1] === 'SECRET_KEY' || m[1] === 'SERVICE_ROLE_KEY') serviceRole = val
  }
}

if (!anon || !serviceRole) {
  console.error('Could not parse anon key or service_role key from supabase status')
  process.exit(1)
}

console.log('VITE_SUPABASE_URL=http://127.0.0.1:54321')
console.log('SUPABASE_ENV=local')
console.log(`VITE_SUPABASE_ANON_KEY=${anon}`)
console.log(`SUPABASE_SERVICE_KEY=${serviceRole}`)
console.log(`SUPABASE_SERVICE_ROLE_KEY=${serviceRole}`)
console.log(`TEST_SUPABASE_SERVICE_KEY=${serviceRole}`)
