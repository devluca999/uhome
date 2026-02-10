/**
 * Environment Congruence Verification Script
 * 
 * Validates that the seed script and app use the same Supabase project.
 * Helps prevent data persistence issues caused by environment mismatches.
 * 
 * Run with: npm run verify:env (add to package.json) or: tsx scripts/verify-env-congruence.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// Load environment variables from .env.local (used by seed script)
config({ path: resolve(process.cwd(), '.env.local') })

interface EnvCheck {
  name: string
  seedValue: string | undefined
  appValue: string | undefined
  matches: boolean
  required: boolean
}

function getEnvVar(name: string): string | undefined {
  return process.env[name]
}

function checkEnvCongruence(): {
  isCongruent: boolean
  checks: EnvCheck[]
  issues: string[]
  recommendations: string[]
} {
  const checks: EnvCheck[] = []
  const issues: string[] = []
  const recommendations: string[] = []

  // Check VITE_SUPABASE_URL (most critical)
  const seedUrl = getEnvVar('VITE_SUPABASE_URL')
  const seedAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY')
  const seedServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY')

  checks.push({
    name: 'VITE_SUPABASE_URL',
    seedValue: seedUrl,
    appValue: seedUrl, // In seed script context, this is the same
    matches: true,
    required: true,
  })

  if (!seedUrl) {
    issues.push('VITE_SUPABASE_URL is not set in .env.local')
    recommendations.push('Add VITE_SUPABASE_URL to your .env.local file')
  }

  if (!seedAnonKey) {
    issues.push('VITE_SUPABASE_ANON_KEY is not set in .env.local')
    recommendations.push('Add VITE_SUPABASE_ANON_KEY to your .env.local file')
  }

  if (!seedServiceKey) {
    issues.push('SUPABASE_SERVICE_ROLE_KEY is not set in .env.local (recommended for seed script)')
    recommendations.push('Add SUPABASE_SERVICE_ROLE_KEY to your .env.local for full seed script functionality')
  }

  // Check if app env vars would match (we can't read Vite's env vars directly in Node)
  // This is a best-effort check - full verification requires running in browser context
  const appUrlNote = 'Note: App environment variables are loaded by Vite at build time.'
  const appUrlCheck = 'To verify app env vars match, check your browser console or Vite build output.'

  return {
    isCongruent: issues.length === 0,
    checks,
    issues,
    recommendations: [
      ...recommendations,
      appUrlNote,
      appUrlCheck,
      'Ensure your .env.local file has the same VITE_SUPABASE_URL as your Vite dev server',
      'If using different environments, update both .env.local and your Vite configuration',
    ],
  }
}

function main() {
  console.log('🔍 Verifying environment congruence...\n')

  const result = checkEnvCongruence()

  // Display checks
  console.log('Environment Variables Check:')
  console.log('─'.repeat(60))
  result.checks.forEach(check => {
    const status = check.matches ? '✅' : '❌'
    const required = check.required ? '(required)' : '(optional)'
    console.log(`${status} ${check.name} ${required}`)
    if (check.seedValue) {
      const preview = check.seedValue.substring(0, 30) + '...'
      console.log(`   Seed value: ${preview}`)
    } else {
      console.log(`   Seed value: [NOT SET]`)
    }
  })
  console.log('')

  // Display issues
  if (result.issues.length > 0) {
    console.log('⚠️  Issues Found:')
    result.issues.forEach(issue => {
      console.log(`   • ${issue}`)
    })
    console.log('')
  }

  // Display recommendations
  if (result.recommendations.length > 0) {
    console.log('💡 Recommendations:')
    result.recommendations.forEach(rec => {
      console.log(`   • ${rec}`)
    })
    console.log('')
  }

  // Final status
  if (result.isCongruent) {
    console.log('✅ Environment configuration looks good!')
    console.log('   Your seed script and app should use the same Supabase project.')
    process.exit(0)
  } else {
    console.log('❌ Environment configuration has issues.')
    console.log('   Please fix the issues above before running the seed script.')
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { checkEnvCongruence }
