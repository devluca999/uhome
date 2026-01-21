/**
 * Upload Test Helpers
 *
 * Utilities for testing file uploads in E2E tests.
 */

import { Page } from '@playwright/test'
import { getSupabaseClient } from './db-helpers'

/**
 * Create a test file (in memory)
 */
export function createTestFile(
  name: string = 'test-file.jpg',
  size: number = 1024, // 1KB default
  type: string = 'image/jpeg'
): File {
  // Create a blob with the specified size
  const content = new Array(size)
    .fill(0)
    .map(() => Math.random().toString(36).charAt(2))
    .join('')
  const blob = new Blob([content], { type })

  // Create a File from the blob
  return new File([blob], name, { type })
}

/**
 * Upload a file via the UI
 */
export async function uploadFileViaUI(
  page: Page,
  fileInputSelector: string,
  file: File
): Promise<void> {
  // Set the file input
  const input = page.locator(fileInputSelector)
  await input.setInputFiles({
    name: file.name,
    mimeType: file.type,
    buffer: Buffer.from(await file.arrayBuffer()),
  })

  // Wait for upload to complete (look for success indicator)
  await page.waitForTimeout(1000) // Give upload time to process
}

/**
 * Verify file was uploaded to storage
 */
export async function verifyFileInStorage(
  filePath: string,
  bucket: string = 'documents'
): Promise<boolean> {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase.storage.from(bucket).list(filePath.split('/')[0] || '')

    if (error) return false

    const fileName = filePath.split('/').pop()
    return data?.some(file => file.name === fileName) || false
  } catch (error) {
    return false
  }
}

/**
 * Verify file metadata in database
 */
export async function verifyFileInDatabase(propertyId: string, fileName: string): Promise<boolean> {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('property_id', propertyId)
      .like('file_name', `%${fileName}%`)
      .limit(1)

    if (error || !data || data.length === 0) return false

    return true
  } catch (error) {
    return false
  }
}

/**
 * Get file URL from storage
 */
export async function getFileUrl(
  filePath: string,
  bucket: string = 'documents'
): Promise<string | null> {
  const supabase = getSupabaseClient()

  try {
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath)

    return publicUrl
  } catch (error) {
    return null
  }
}

/**
 * Delete file from storage
 */
export async function deleteFileFromStorage(
  filePath: string,
  bucket: string = 'documents'
): Promise<void> {
  const supabase = getSupabaseClient()

  try {
    await supabase.storage.from(bucket).remove([filePath])
  } catch (error) {
    console.warn('Failed to delete file from storage:', error)
  }
}

/**
 * Wait for upload to complete (with timeout)
 */
export async function waitForUploadComplete(page: Page, timeout: number = 10000): Promise<void> {
  // Wait for upload indicator to disappear or success message to appear
  await page
    .waitForSelector('[data-upload-status="complete"], [data-upload-status="success"]', {
      timeout,
      state: 'visible',
    })
    .catch(() => {
      // If selector doesn't exist, just wait a bit
      return page.waitForTimeout(2000)
    })
}

/**
 * Verify upload error is displayed
 */
export async function verifyUploadError(page: Page, errorMessage: string): Promise<boolean> {
  const errorElement = page.locator(`text=/${errorMessage}/i`)
  return await errorElement.isVisible()
}

/**
 * Create oversized file (for testing limits)
 */
export function createOversizedFile(sizeMB: number = 11): File {
  const sizeBytes = sizeMB * 1024 * 1024
  return createTestFile('oversized.jpg', sizeBytes, 'image/jpeg')
}

/**
 * Create unsupported file type
 */
export function createUnsupportedFile(): File {
  return createTestFile('test.exe', 1024, 'application/x-msdownload')
}
