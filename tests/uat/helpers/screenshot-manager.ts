/**
 * Screenshot Manager for UAT Tests
 * 
 * Manages screenshot capture, storage, and organization
 */

import { Page, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

export interface ScreenshotOptions {
  fullPage?: boolean
  clip?: { x: number; y: number; width: number; height: number }
  timeout?: number
}

/**
 * Generate screenshot filename with naming convention
 */
export function generateScreenshotName(
  page: string,
  feature: string,
  suffix?: string
): string {
  const timestamp = Date.now()
  const sanitizedPage = page.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const sanitizedFeature = feature.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const suffixPart = suffix ? `_${suffix.replace(/[^a-z0-9]/gi, '_').toLowerCase()}` : ''
  
  return `${sanitizedPage}_${sanitizedFeature}${suffixPart}_${timestamp}.png`
}

/**
 * Ensure screenshots directory exists
 */
export function ensureScreenshotsDirectory(): string {
  const screenshotsDir = path.join(process.cwd(), 'docs', 'uat', 'screenshots')
  
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true })
  }
  
  return screenshotsDir
}

/**
 * Capture screenshot with standardized naming
 */
export async function captureUATScreenshot(
  page: Page,
  pageName: string,
  feature: string,
  options: ScreenshotOptions = {},
  suffix?: string
): Promise<string> {
  const screenshotsDir = ensureScreenshotsDirectory()
  const filename = generateScreenshotName(pageName, feature, suffix)
  const filepath = path.join(screenshotsDir, filename)

  await page.screenshot({
    path: filepath,
    fullPage: options.fullPage ?? true,
    clip: options.clip,
    timeout: options.timeout ?? 30000,
  })

  // Return relative path for documentation
  return `screenshots/${filename}`
}

/**
 * Capture screenshot of specific element
 */
export async function captureElementScreenshot(
  page: Page,
  selector: string,
  pageName: string,
  feature: string,
  suffix?: string
): Promise<string> {
  const screenshotsDir = ensureScreenshotsDirectory()
  const filename = generateScreenshotName(pageName, feature, suffix)
  const filepath = path.join(screenshotsDir, filename)

  const element = page.locator(selector).first()
  await expect(element).toBeVisible({ timeout: 10000 })

  await element.screenshot({ path: filepath })

  return `screenshots/${filename}`
}

/**
 * Capture screenshot of modal
 */
export async function captureModalScreenshot(
  page: Page,
  modalSelector: string = '[role="dialog"], [class*="modal"]',
  pageName: string,
  feature: string
): Promise<string> {
  const modal = page.locator(modalSelector).first()
  await expect(modal).toBeVisible({ timeout: 5000 })

  return captureElementScreenshot(page, modalSelector, pageName, feature, 'modal')
}

/**
 * Capture screenshot of chart
 */
export async function captureChartScreenshot(
  page: Page,
  chartSelector: string = 'svg, [class*="chart"]',
  pageName: string,
  feature: string
): Promise<string> {
  const chart = page.locator(chartSelector).first()
  await expect(chart).toBeVisible({ timeout: 5000 })

  return captureElementScreenshot(page, chartSelector, pageName, feature, 'chart')
}

/**
 * Verify screenshot directory structure
 */
export function verifyScreenshotDirectory(): boolean {
  const screenshotsDir = ensureScreenshotsDirectory()
  return fs.existsSync(screenshotsDir) && fs.statSync(screenshotsDir).isDirectory()
}

