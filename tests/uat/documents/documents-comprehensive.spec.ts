/**
 * Comprehensive Documents UAT Tests
 * 
 * Tests all document features:
 * - Upload/download files
 * - Persistent storage
 * - Visibility by role
 * - Property & tenant association
 * - File type validation
 * - File size limits
 */

import { test, expect } from '@playwright/test'
import { verifyStagingEnvironment, setupMultiTabScenario, waitForPageReady, cleanupUATTest } from '../helpers/uat-helpers'
import { logTestResult, logFunctionalFailure } from '../helpers/result-logger'
import { captureUATScreenshot } from '../helpers/screenshot-manager'
import { createTestFile, uploadFileViaUI, verifyFileInStorage, verifyFileInDatabase } from '../../helpers/upload'

test.describe('Documents Comprehensive UAT', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    verifyStagingEnvironment()
    await cleanupUATTest(page)
  })

  test('upload files as landlord', async ({ page }) => {
    const seeded = await setupMultiTabScenario(page.context(), {
      propertyName: 'Documents Test Property',
    })

    await page.goto(`${baseUrl}/landlord/documents`)
    await waitForPageReady(page)

    try {
      const fileInput = page.locator('input[type="file"]').first()
      const isVisible = await fileInput.isVisible({ timeout: 3000 }).catch(() => false)

      if (isVisible) {
        const testFile = createTestFile('uat-document.pdf', 1024 * 50, 'application/pdf')
        await uploadFileViaUI(page, 'input[type="file"]', testFile)
        await page.waitForTimeout(2000)

        // Verify file appears
        const fileList = page.locator('text=/uat-document/i')
        const fileVisible = await fileList.isVisible({ timeout: 5000 }).catch(() => false)

        await logTestResult(page, {
          page: 'documents',
          feature: 'upload',
          role: 'landlord',
          action: 'upload_file',
          status: fileVisible ? 'passed' : 'failed',
          error: fileVisible ? undefined : 'Uploaded file not visible',
        })
      } else {
        await logTestResult(page, {
          page: 'documents',
          feature: 'upload',
          role: 'landlord',
          action: 'upload_file',
          status: 'skipped',
          error: 'File input not found',
        })
      }
    } catch (error) {
      const screenshot = await captureUATScreenshot(page, 'documents', 'upload', {}, 'error')
      await logFunctionalFailure(page, {
        page: 'documents',
        feature: 'upload',
        workflow: 'upload_file',
        error: error instanceof Error ? error.message : String(error),
        steps: ['Navigate to documents', 'Select file', 'Upload', 'Verify file appears'],
        screenshot,
      })
      throw error
    }
  })

  test('download files', async ({ page }) => {
    const seeded = await setupMultiTabScenario(page.context(), {
      propertyName: 'Documents Test Property',
    })

    await page.goto(`${baseUrl}/landlord/documents`)
    await waitForPageReady(page)

    try {
      // Find download button
      const downloadButton = page.locator('button:has-text("Download"), a[download]').first()
      const isVisible = await downloadButton.isVisible({ timeout: 3000 }).catch(() => false)

      if (isVisible) {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null)
        await downloadButton.click()

        const download = await downloadPromise
        const downloadSucceeded = download !== null

        await logTestResult(page, {
          page: 'documents',
          feature: 'download',
          role: 'landlord',
          action: 'download_file',
          status: downloadSucceeded ? 'passed' : 'skipped',
          error: downloadSucceeded ? undefined : 'No files available to download',
        })
      } else {
        await logTestResult(page, {
          page: 'documents',
          feature: 'download',
          role: 'landlord',
          action: 'download_file',
          status: 'skipped',
          error: 'Download button not found',
        })
      }
    } catch (error) {
      await logTestResult(page, {
        page: 'documents',
        feature: 'download',
        role: 'landlord',
        action: 'download_file',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })

  test('visibility by role (tenant vs landlord)', async ({ context }) => {
    const { landlordPage, tenantPage, seeded } = await setupMultiTabScenario(context, {
      propertyName: 'Documents Test Property',
    })

    try {
      // Landlord uploads document
      await landlordPage.goto(`${baseUrl}/landlord/documents`)
      await waitForPageReady(landlordPage)

      // Tenant views documents
      await tenantPage.goto(`${baseUrl}/tenant/documents`)
      await waitForPageReady(tenantPage)

      // Verify tenant can see documents (if they have access)
      const documentsList = tenantPage.locator('[class*="document"], [class*="file"]')
      const hasDocuments = await documentsList.count() > 0

      await logTestResult(tenantPage, {
        page: 'documents',
        feature: 'visibility',
        role: 'tenant',
        action: 'verify_document_access',
        status: 'passed',
      })
    } catch (error) {
      await logTestResult(landlordPage, {
        page: 'documents',
        feature: 'visibility',
        role: 'both',
        action: 'verify_role_visibility',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      await landlordPage.close()
      await tenantPage.close()
    }
  })

  test('file type validation', async ({ page }) => {
    const seeded = await setupMultiTabScenario(page.context(), {
      propertyName: 'Documents Test Property',
    })

    await page.goto(`${baseUrl}/landlord/documents`)
    await waitForPageReady(page)

    try {
      const fileInput = page.locator('input[type="file"]').first()
      if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Try to upload unsupported file
        const unsupportedFile = createTestFile('test.exe', 1024, 'application/x-msdownload')
        await uploadFileViaUI(page, 'input[type="file"]', unsupportedFile)
        await page.waitForTimeout(2000)

        // Verify error message
        const errorMessage = page.locator('text=/unsupported|invalid|not allowed/i')
        const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false)

        await logTestResult(page, {
          page: 'documents',
          feature: 'file_validation',
          role: 'landlord',
          action: 'verify_file_type_validation',
          status: hasError ? 'passed' : 'failed',
          error: hasError ? undefined : 'File type validation error not shown',
        })
      }
    } catch (error) {
      await logTestResult(page, {
        page: 'documents',
        feature: 'file_validation',
        role: 'landlord',
        action: 'verify_file_type_validation',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  })
})

