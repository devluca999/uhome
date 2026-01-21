import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// Load test environment variables (staging)
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') })

// Set required environment variables for staging if not already set
if (!process.env.VITE_SUPABASE_URL) {
  // Default to localhost Supabase for staging tests
  process.env.VITE_SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
}
if (!process.env.SUPABASE_ENV && !process.env.VITE_SUPABASE_ENV) {
  process.env.SUPABASE_ENV = 'staging'
}

// HARD ENVIRONMENT GUARD - Must be imported after setting env vars
import { enforceStagingOnly } from './tests/helpers/env-guard'

enforceStagingOnly()

/**
 * Admin test config
 * - Targets the already-running staging server (default http://localhost:1000)
 * - Does NOT start a dev server (avoids waiting for :3000)
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000,
    toHaveScreenshot: {
      threshold: 0.2,
      mode: 'strict',
      animations: 'disabled',
    },
  },
})
