/**
 * Launch Verification Script
 *
 * Runs all verification checks before Phase 7 sign-off.
 * Use before production launch.
 *
 * Run: npm run verify:launch (or tsx scripts/launch-verification.ts)
 */

import { execSync } from 'child_process'

const steps: { name: string; command: string }[] = [
  { name: 'Lint', command: 'npm run lint' },
  { name: 'Type check', command: 'npm run type-check' },
  { name: 'RLS coverage', command: 'npm run verify:rls' },
  { name: 'Build', command: 'npm run build' },
]

function main() {
  console.log('🚀 Launch Verification — Running all checks\n')
  console.log('─'.repeat(60))

  let failed = false
  for (const step of steps) {
    try {
      console.log(`\n▶ ${step.name}...`)
      execSync(step.command, {
        stdio: 'inherit',
        cwd: process.cwd(),
      })
      console.log(`✅ ${step.name} passed`)
    } catch {
      console.error(`❌ ${step.name} failed`)
      failed = true
    }
  }

  console.log('\n' + '─'.repeat(60))
  if (failed) {
    console.log('\n❌ Some checks failed. Resolve before launch.')
    process.exit(1)
  }

  console.log('\n✅ All automated checks passed.')
  console.log('\nManual verification (run before sign-off):')
  console.log('  • npm run test:e2e:headless    # E2E (staging URL required)')
  console.log('  • npm run test:visual:headless # Visual UAT')
  console.log('  • See docs/smoke-tests.md for production smoke checklist')
  process.exit(0)
}

main()
