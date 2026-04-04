/**
 * Load env before any other imports that depend on env vars.
 * Import this as the FIRST import in seed scripts.
 * `.env.local` wins over `.env.test` (override) so staging keys in .env.local are not replaced.
 */
import { config } from 'dotenv'
import { resolve } from 'path'

const root = resolve(process.cwd())
config({ path: resolve(root, '.env.test') })
config({ path: resolve(root, '.env.local'), override: true })
