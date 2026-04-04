/**
 * Load env files into process.env before any test helper reads VITE_* / SUPABASE_*.
 * Playwright workers must not rely on dotenv running only in playwright.config.ts.
 *
 * Order: `.env` → `.env.test` → `.env.local` (override).
 * `.env.local` must win so seed scripts and dev against staging are not clobbered by `.env.test`.
 */
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

const root = path.resolve(process.cwd())

function tryLoad(name: string, override: boolean): void {
  const p = path.join(root, name)
  if (!fs.existsSync(p)) return
  dotenv.config({ path: p, override })
}

declare global {
  var __uhomeTestEnvLoaded: boolean | undefined
}

if (!globalThis.__uhomeTestEnvLoaded) {
  globalThis.__uhomeTestEnvLoaded = true
  tryLoad('.env', false)
  tryLoad('.env.test', false)
  tryLoad('.env.local', true)
}
