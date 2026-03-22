/**
 * Re-run supabase/seed.sql against the local database (Supabase CLI must be running).
 * For full demo data (auth users + app rows), use: npm run db:seed:demo
 */

import { execSync } from 'node:child_process'

execSync('npx supabase db seed', { stdio: 'inherit', cwd: process.cwd() })
console.log('\n✓ SQL seed complete. For full demo fixtures: npm run db:seed:demo\n')
