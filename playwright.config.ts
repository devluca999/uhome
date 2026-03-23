import { defineConfig, devices } from '@playwright/test'
import './tests/helpers/load-test-env'

// HARD ENVIRONMENT GUARD - Must be imported before any test execution
// This ensures tests NEVER run against production
import { enforceNonProduction } from './tests/helpers/env-guard'

// Enforce non-production environment (local, staging, test)
enforceNonProduction()

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/prod-smoke/**', '**/unit/**'],

  /* Run tests in files in parallel, but limit parallelism for auth tests to avoid rate limits */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. Limit workers to avoid Supabase rate limits */
  /* Supabase rate limit: 30 sign-ups per 5 minutes per IP */
  workers: process.env.CI ? 1 : 1, // Use 1 worker to avoid hitting rate limits

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  /* Blob reporter enables merge-reports when running sharded tests in CI */
  reporter: process.env.CI ? [['blob'], ['list']] : [['html'], ['list']],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
      },
    },

    /* Visual tests project */
    {
      name: 'visual',
      testMatch: /visual\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        baseURL: process.env.VISUAL_TEST_BASE_URL || 'http://localhost:3000',
      },
      timeout: 60 * 1000, // Longer timeout for visual tests to allow animations
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'vite --port 3000 --host --mode test',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Test timeout */
  timeout: 30 * 1000,

  /* Expect timeout */
  expect: {
    timeout: 5 * 1000,
    /* Visual comparison configuration */
    toHaveScreenshot: {
      threshold: 0.2,
      mode: 'strict',
      animations: 'disabled',
    },
  },
})
