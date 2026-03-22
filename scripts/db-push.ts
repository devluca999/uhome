/**
 * Apply local migration files to the linked Supabase project (`supabase db push`).
 * Blocks pushes to the production project ref unless CONFIRM_PRODUCTION_DB_PUSH=yes.
 *
 * Prerequisite: `npx supabase link --project-ref <ref>` (stores ref under supabase/.temp/).
 */

import './load-dotenv'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const PROJECT_REF_FILE = path.join(ROOT, 'supabase', '.temp', 'project-ref')

function readLinkedProjectRef(): string | null {
  try {
    if (fs.existsSync(PROJECT_REF_FILE)) {
      return fs.readFileSync(PROJECT_REF_FILE, 'utf-8').trim()
    }
  } catch {
    /* ignore */
  }
  return null
}

function main(): void {
  const prodRef = (process.env.SUPABASE_PRODUCTION_PROJECT_REF || '').trim()
  const linked = readLinkedProjectRef()

  if (prodRef && linked && linked === prodRef) {
    const confirm = process.env.CONFIRM_PRODUCTION_DB_PUSH
    if (confirm !== 'yes') {
      console.error(`
❌ Refusing to push migrations to the production Supabase project.

The linked project ref matches SUPABASE_PRODUCTION_PROJECT_REF.

If you intentionally need to apply schema changes to production:

  CONFIRM_PRODUCTION_DB_PUSH=yes npm run db:migrate

Never run database reset or raw destructive SQL against production from automation.
`)
      process.exit(1)
    }
  } else if (!linked) {
    console.warn(
      '⚠️  No linked project found (supabase/.temp/project-ref missing). Run: npx supabase link --project-ref <ref>\n'
    )
  } else if (prodRef) {
    console.log(`✓ Linked project ${linked.slice(0, 8)}… is not equal to SUPABASE_PRODUCTION_PROJECT_REF — push allowed.`)
  }

  execSync('npx supabase db push', { stdio: 'inherit', cwd: ROOT })
}

main()
