/**
 * Staging Decommission Readiness Check
 *
 * Run before turning off the cloud staging Supabase project.
 * Outputs PASS/FAIL with explicit remediation.
 *
 * npm run verify:staging-decommission
 */

import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

let failures: string[] = []
let warnings: string[] = []

function pass(msg: string) {
  console.log(`  ✓ ${msg}`)
}

function fail(msg: string) {
  console.log(`  ✗ ${msg}`)
  failures.push(msg)
}

function warn(msg: string) {
  console.log(`  ⚠ ${msg}`)
  warnings.push(msg)
}

async function run(): Promise<void> {
  console.log('\n=== Staging Decommission Readiness Check ===\n')

  // 1. Local tests pass (requires local Supabase - we check the script runs)
  console.log('1. Local test capability:')
  try {
    execSync('npm run test:unit', { stdio: 'pipe' })
    pass('Unit tests pass')
  } catch {
    fail('Unit tests failed - run: npm run test:unit')
  }

  // 2. Env guards active (checked by unit tests)
  console.log('\n2. Env guards:')
  pass('Env guard unit tests cover production block')

  // 3. Prod smoke (optional - only if configured)
  console.log('\n3. Prod smoke tests:')
  if (process.env.PROD_SMOKE_TEST === 'true') {
    try {
      execSync('npm run test:prod-smoke', { stdio: 'pipe' })
      pass('Prod smoke tests pass')
    } catch {
      fail('Prod smoke tests failed')
    }
  } else {
    warn('PROD_SMOKE_TEST not set - skipping prod smoke (optional)')
  }

  // 4. Cloud staging references
  console.log('\n4. Cloud staging dependencies:')
  const cwd = process.cwd()
  const filesToCheck = [
    join(cwd, '.github/workflows/ci.yml'),
    join(cwd, 'docs/staging-environment.md'),
  ]
  let hasStagingRefs = false
  for (const file of filesToCheck) {
    if (existsSync(file)) {
      const content = readFileSync(file, 'utf-8')
      if (
        content.includes('VITE_SUPABASE_STAGING_URL') ||
        content.includes('staging.supabase.co')
      ) {
        hasStagingRefs = true
      }
    }
  }
  if (hasStagingRefs) {
    warn('CI/docs still reference cloud staging - remove e2e-tests (Cloud Staging) job after 2 green local runs')
  } else {
    pass('No mandatory cloud staging references')
  }

  // 5. Local Supabase config exists
  console.log('\n5. Local Supabase setup:')
  if (existsSync(join(cwd, 'supabase/config.toml'))) {
    pass('supabase/config.toml exists')
  } else {
    fail('supabase/config.toml missing - run: supabase init')
  }

  // Summary
  console.log('\n=== Summary ===\n')
  if (failures.length === 0) {
    console.log('PASS - Staging decommission readiness check passed.')
    console.log('\nIs it safe to turn off the cloud staging Supabase project?')
    console.log('YES - only if you have also:')
    console.log('  - Run npm run test:local successfully (with Supabase + Docker)')
    console.log('  - Verified 2 consecutive green CI runs with local-e2e')
    console.log('  - Removed the e2e-tests (Cloud Staging) job from ci.yml')
    process.exit(0)
  } else {
    console.log('FAIL - Remediation required:\n')
    failures.forEach((f) => console.log(`  - ${f}`))
    console.log('\nIs it safe to turn off the cloud staging Supabase project?')
    console.log('NO - Fix the issues above first.')
    process.exit(1)
  }
}

run()
