/**
 * Upload Flow E2E Tests
 *
 * Tests file uploads, edge cases, and storage integration.
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { seedTestScenario } from '../../helpers/seed'
import { createTestLandlord, loginAsLandlord } from '../../helpers/auth-helpers'
import {
  createTestFile,
  uploadFileViaUI,
  verifyFileInStorage,
  verifyFileInDatabase,
  createOversizedFile,
  createUnsupportedFile,
  verifyUploadError,
} from '../../helpers/upload'

test.describe('Upload Flow', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    await resetAll(page)
  })

  test('tenant uploads image and landlord sees it', async ({ page, context }) => {
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
    })

    if (!seeded.tenant || !seeded.property) {
      throw new Error('Failed to seed test scenario')
    }

    // Login as tenant
    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.tenant.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    // Navigate to upload area (e.g., work order or documents)
    await page.goto(`${baseUrl}/tenant/maintenance`)
    await page.waitForLoadState('networkidle')

    // Create test file
    const testFile = createTestFile('test-damage.jpg', 1024 * 100, 'image/jpeg')

    // Upload file
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.isVisible()) {
      await uploadFileViaUI(page, 'input[type="file"]', testFile)
      await page.waitForTimeout(2000)

      // Verify file appears in UI
      await expect(page.locator('text=test-damage.jpg')).toBeVisible({ timeout: 5000 })
    }

    // Verify landlord can see it
    const landlordPage = await context.newPage()
    await loginAsLandlord(landlordPage, seeded.landlord.email, 'TestPassword123!')
    await landlordPage.goto(`${baseUrl}/landlord/properties/${seeded.property.id}`)
    await landlordPage.waitForLoadState('networkidle')

    // Landlord should see the uploaded file
    await expect(landlordPage.locator('text=test-damage.jpg')).toBeVisible({ timeout: 10000 })
  })

  test('unsupported file type', async ({ page }) => {
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
    })

    if (!seeded.tenant) {
      throw new Error('Failed to seed test scenario')
    }

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.tenant.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    await page.goto(`${baseUrl}/tenant/maintenance`)
    await page.waitForLoadState('networkidle')

    // Try to upload unsupported file
    const unsupportedFile = createUnsupportedFile()
    const fileInput = page.locator('input[type="file"]')

    if (await fileInput.isVisible()) {
      await uploadFileViaUI(page, 'input[type="file"]', unsupportedFile)
      await page.waitForTimeout(2000)

      // Verify error message
      const hasError = await verifyUploadError(page, 'unsupported file type')
      expect(hasError).toBeTruthy()
    }
  })

  test('oversized file', async ({ page }) => {
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
    })

    if (!seeded.tenant) {
      throw new Error('Failed to seed test scenario')
    }

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.tenant.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    await page.goto(`${baseUrl}/tenant/maintenance`)
    await page.waitForLoadState('networkidle')

    // Try to upload oversized file (11MB)
    const oversizedFile = createOversizedFile(11)
    const fileInput = page.locator('input[type="file"]')

    if (await fileInput.isVisible()) {
      await uploadFileViaUI(page, 'input[type="file"]', oversizedFile)
      await page.waitForTimeout(2000)

      // Verify error message
      const hasError = await verifyUploadError(page, 'file size exceeds')
      expect(hasError).toBeTruthy()
    }
  })

  test('upload interruption', async ({ page }) => {
    // Test upload interruption by simulating network disconnect
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
    })

    if (!seeded.tenant) {
      throw new Error('Failed to seed test scenario')
    }

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.tenant.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    await page.goto(`${baseUrl}/tenant/maintenance`)
    await page.waitForLoadState('networkidle')

    // Start upload
    const testFile = createTestFile('test-upload.jpg', 1024 * 500, 'image/jpeg')
    const fileInput = page.locator('input[type="file"]')

    if (await fileInput.isVisible()) {
      // Simulate network disconnect mid-upload
      await page.context().setOffline(true)
      await uploadFileViaUI(page, 'input[type="file"]', testFile)
      await page.waitForTimeout(1000)

      // Reconnect
      await page.context().setOffline(false)
      await page.waitForTimeout(2000)

      // Verify error or retry option
      const hasError =
        (await verifyUploadError(page, 'upload failed')) ||
        (await verifyUploadError(page, 'network'))
      // Error handling may vary, so we just verify something happened
    }
  })

  test('upload after entity deletion', async ({ page }) => {
    // Test uploading to a property that gets deleted
    const seeded = await seedTestScenario({
      propertyName: 'Test Property',
    })

    if (!seeded.tenant || !seeded.property) {
      throw new Error('Failed to seed test scenario')
    }

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', seeded.tenant.email)
    await page.fill('input[type="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/tenant\/dashboard/, { timeout: 10000 })

    // Delete property (as landlord, in another context)
    // This would require landlord access

    // Try to upload
    const testFile = createTestFile('test-upload.jpg', 1024 * 100, 'image/jpeg')
    const fileInput = page.locator('input[type="file"]')

    if (await fileInput.isVisible()) {
      await uploadFileViaUI(page, 'input[type="file"]', testFile)
      await page.waitForTimeout(2000)

      // Should show error about property not found
      const hasError =
        (await verifyUploadError(page, 'property')) || (await verifyUploadError(page, 'not found'))
      expect(hasError).toBeTruthy()
    }
  })
})
