/**
 * Boot the local demo: ensure Supabase, reset DB, seed demo data.
 * Use before starting the dev server for a fully populated demo.
 *
 * Run: npm run dev:demo (runs this, then starts dev server)
 * Or: npm run demo:reset (just reset + seed, when Supabase is already running)
 */

import { execSync } from 'child_process'
import { setTimeout } from 'timers/promises'
import './load-dotenv'

// Force local Supabase
process.env.SUPABASE_ENV = 'local'
process.env.VITE_ENVIRONMENT = 'development'
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:55321'

function loadLocalSupabaseEnv(): void {
  let output: string
  try {
    output = execSync('npx supabase status -o env', { encoding: 'utf-8' })
  } catch {
    throw new Error(
      'Supabase status failed. Is local Supabase running? Run: npx supabase start'
    )
  }
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
    throw new Error(
      'Could not parse keys from supabase status. Is local Supabase running?'
    )
  }
  process.env.VITE_SUPABASE_ANON_KEY = anon
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRole
  process.env.SUPABASE_SERVICE_KEY = serviceRole
}

async function main() {
  console.log('🚀 Booting local demo (reset DB + seed)...\n')

  // 1. Ensure Supabase is reachable
  execSync('npx tsx scripts/ensure-local-supabase.ts', {
    stdio: 'inherit',
    env: process.env,
  })

  loadLocalSupabaseEnv()

  // 2. Reset database (apply migrations, wipe data)
  const maxRetries = 3
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`\nRetrying db reset (attempt ${attempt}/${maxRetries})...`)
        await setTimeout(5000)
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

  // 3. Seed demo data (12 months financial/operational data, landlord + tenant congruency)
  execSync('npm run seed:demo', {
    stdio: 'inherit',
    env: process.env,
  })

  console.log('\n✅ Demo boot complete. You now have:')
  console.log('   • 5 properties, 12 tenants')
  console.log('   • 12 months of rent records (144+), expenses (63+), work orders (15+)')
  console.log('   • Landlord: demo-landlord@uhome.internal / DemoLandlord2024!')
  console.log('   • Tenant:  demo-tenant@uhome.internal / DemoTenant2024!')
  console.log('')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
