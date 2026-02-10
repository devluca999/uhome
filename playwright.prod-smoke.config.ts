/**
 * Playwright config for production read-only smoke tests.
 * Does NOT import env-guard - these tests intentionally run against production.
 * Requires: PROD_SMOKE_TEST=true, VITE_SUPABASE_URL (prod), VITE_SUPABASE_ANON_KEY (prod)
 */

import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') })

export default defineConfig({
  testDir: './tests',
  testMatch: /prod-smoke\/.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.PROD_SMOKE_BASE_URL || 'https://uhome.app',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  timeout: 30 * 1000,
})
