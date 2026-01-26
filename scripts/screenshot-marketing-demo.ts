// Screenshot script for marketing and demo materials
// Takes screenshots of main pages in both light and dark mode
// Run with: npm run screenshot:marketing

import { chromium, Browser, Page } from 'playwright'
import { config } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const baseURL = process.env.VITE_APP_URL || 'http://localhost:1000'
const outputDir = resolve(process.cwd(), 'screenshots/marketing')

// Pages to screenshot
const pages = [
  {
    name: 'landlord-dashboard',
    path: '/landlord/dashboard',
    requiresAuth: true,
    role: 'landlord',
  },
  {
    name: 'landlord-finances',
    path: '/landlord/finances',
    requiresAuth: true,
    role: 'landlord',
  },
  {
    name: 'landlord-properties',
    path: '/landlord/properties',
    requiresAuth: true,
    role: 'landlord',
  },
  {
    name: 'landlord-tenants',
    path: '/landlord/tenants',
    requiresAuth: true,
    role: 'landlord',
  },
  {
    name: 'landlord-maintenance',
    path: '/landlord/maintenance',
    requiresAuth: true,
    role: 'landlord',
  },
  { name: 'tenant-dashboard', path: '/tenant/dashboard', requiresAuth: true, role: 'tenant' },
  { name: 'tenant-finances', path: '/tenant/finances', requiresAuth: true, role: 'tenant' },
  { name: 'tenant-maintenance', path: '/tenant/maintenance', requiresAuth: true, role: 'tenant' },
]

// Demo credentials
const demoLandlord = {
  email: 'demo-landlord@uhome.internal',
  password: 'DemoLandlord2024!',
}

const demoTenant = {
  email: 'demo-tenant@uhome.internal',
  password: 'DemoTenant2024!',
}

async function loginAs(page: Page, email: string, password: string) {
  await page.goto(`${baseURL}/login`)
  await page.waitForLoadState('networkidle')

  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')

  // Wait for redirect after login
  await page.waitForURL(/\/landlord\/|\/tenant\//, { timeout: 10000 })
  await page.waitForLoadState('networkidle')
}

async function setTheme(page: Page, theme: 'light' | 'dark') {
  // Set theme via localStorage
  await page.evaluate(t => {
    localStorage.setItem('theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }, theme)

  // Wait for theme to apply
  await page.waitForTimeout(500)
}

async function takeScreenshot(
  page: Page,
  name: string,
  theme: 'light' | 'dark',
  fullPage: boolean = true
) {
  const filename = `${name}-${theme}.png`
  const filepath = resolve(outputDir, filename)

  await page.screenshot({
    path: filepath,
    fullPage,
  })

  console.log(`✅ Screenshot saved: ${filename}`)
}

async function screenshotPage(
  browser: Browser,
  pageConfig: { name: string; path: string; requiresAuth: boolean; role: 'landlord' | 'tenant' },
  theme: 'light' | 'dark'
) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // High DPI for marketing materials
  })
  
  const page = await context.newPage()
  
  try {
    // Set theme first
    await setTheme(page, theme)

    if (pageConfig.requiresAuth) {
      // Login based on role
      const credentials = pageConfig.role === 'landlord' ? demoLandlord : demoTenant
      await loginAs(page, credentials.email, credentials.password)
    }

    // Navigate to page
    await page.goto(`${baseURL}${pageConfig.path}`)
    await page.waitForLoadState('networkidle')

    // Wait for content to load (charts, data, etc.)
    await page.waitForTimeout(2000)

    // Take screenshot
    await takeScreenshot(page, pageConfig.name, theme, true)

    await context.close()
  } catch (error) {
    console.error(`❌ Error screenshotting ${pageConfig.name} (${theme}):`, error)
    await context.close()
  }
}

async function main() {
  console.log('📸 Starting marketing screenshot generation...\n')
  console.log(`Base URL: ${baseURL}`)
  console.log(`Output directory: ${outputDir}\n`)
  
  // Create output directory
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
    console.log(`📁 Created output directory: ${outputDir}\n`)
  }
  
  const browser = await chromium.launch({
    headless: true,
  })
  
  try {
    // Screenshot each page in both themes
    for (const pageConfig of pages) {
      console.log(`\n📄 Processing: ${pageConfig.name}`)

      // Light mode
      console.log(`  🌞 Taking light mode screenshot...`)
      await screenshotPage(browser, pageConfig, 'light')

      // Dark mode
      console.log(`  🌙 Taking dark mode screenshot...`)
      await screenshotPage(browser, pageConfig, 'dark')
    }

    console.log(`\n✅ All screenshots completed!`)
    console.log(`📁 Output directory: ${outputDir}`)
  } catch (error) {
    console.error('❌ Error during screenshot generation:', error)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

main().catch(console.error)
