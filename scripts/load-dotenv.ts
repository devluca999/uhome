/**
 * Load .env.local before any other imports that depend on env vars.
 * Import this as the FIRST import in seed scripts so env-guard sees the correct values.
 */
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env.test') }) // .env.test overrides for test context
