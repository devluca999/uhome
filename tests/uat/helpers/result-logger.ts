/**
 * Result Logger for UAT Tests
 * 
 * Structured logging for test results with:
 * - Page, feature, role, action tracking
 * - Automatic screenshot capture on failures
 * - Result aggregation
 * - Report generation
 */

import { Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

export interface TestResult {
  page: string
  feature: string
  role: 'landlord' | 'tenant' | 'both'
  action: string
  status: 'passed' | 'failed' | 'skipped'
  error?: string
  screenshot?: string
  timestamp: string
  duration?: number
}

export interface VisualMismatch {
  page: string
  feature: string
  element: string
  issue: string
  screenshot: string
  expected?: string
  actual?: string
  error?: string
}

export interface FunctionalFailure {
  page: string
  feature: string
  workflow: string
  error: string
  screenshot?: string
  steps: string[]
}

class ResultLogger {
  private results: TestResult[] = []
  private visualMismatches: VisualMismatch[] = []
  private functionalFailures: FunctionalFailure[] = []
  private screenshotDir: string

  constructor() {
    // Create screenshots directory
    this.screenshotDir = path.join(process.cwd(), 'docs', 'uat', 'screenshots')
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true })
    }
  }

  /**
   * Log a test result
   */
  logResult(result: Omit<TestResult, 'timestamp'>): void {
    this.results.push({
      ...result,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Log a visual mismatch
   */
  logVisualMismatch(mismatch: Omit<VisualMismatch, 'screenshot'> & { screenshot?: string }): void {
    this.visualMismatches.push({
      ...mismatch,
      screenshot: mismatch.screenshot || '',
    })
  }

  /**
   * Log a functional failure
   */
  logFunctionalFailure(failure: Omit<FunctionalFailure, 'screenshot'> & { screenshot?: string }): void {
    this.functionalFailures.push({
      ...failure,
      screenshot: failure.screenshot || '',
    })
  }

  /**
   * Capture screenshot and return path
   */
  async captureScreenshot(
    page: Page,
    name: string
  ): Promise<string> {
    const timestamp = Date.now()
    const filename = `${name}_${timestamp}.png`
    const filepath = path.join(this.screenshotDir, filename)

    await page.screenshot({ path: filepath, fullPage: true })

    return `screenshots/${filename}`
  }

  /**
   * Get all results
   */
  getResults(): TestResult[] {
    return this.results
  }

  /**
   * Get visual mismatches
   */
  getVisualMismatches(): VisualMismatch[] {
    return this.visualMismatches
  }

  /**
   * Get functional failures
   */
  getFunctionalFailures(): FunctionalFailure[] {
    return this.functionalFailures
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number
    passed: number
    failed: number
    skipped: number
    visualMismatches: number
    functionalFailures: number
  } {
    return {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'passed').length,
      failed: this.results.filter(r => r.status === 'failed').length,
      skipped: this.results.filter(r => r.status === 'skipped').length,
      visualMismatches: this.visualMismatches.length,
      functionalFailures: this.functionalFailures.length,
    }
  }

  /**
   * Clear all results (for test isolation)
   */
  clear(): void {
    this.results = []
    this.visualMismatches = []
    this.functionalFailures = []
  }
}

// Singleton instance
export const resultLogger = new ResultLogger()

/**
 * Helper to log test result with automatic screenshot on failure
 */
export async function logTestResult(
  page: Page,
  result: Omit<TestResult, 'timestamp' | 'screenshot'> & { captureScreenshot?: boolean }
): Promise<void> {
  let screenshot: string | undefined

  if (result.status === 'failed' && result.captureScreenshot !== false) {
    screenshot = await resultLogger.captureScreenshot(
      page,
      `${result.page}_${result.feature}_${result.action}`.replace(/[^a-z0-9]/gi, '_')
    )
  }

  resultLogger.logResult({
    ...result,
    screenshot,
  })
}

/**
 * Helper to log visual mismatch with screenshot
 */
export async function logVisualMismatch(
  page: Page,
  mismatch: Omit<VisualMismatch, 'screenshot'>
): Promise<void> {
  const screenshot = await resultLogger.captureScreenshot(
    page,
    `visual_${mismatch.page}_${mismatch.feature}`.replace(/[^a-z0-9]/gi, '_')
  )

  resultLogger.logVisualMismatch({
    ...mismatch,
    screenshot,
  })
}

/**
 * Helper to log functional failure with screenshot
 */
export async function logFunctionalFailure(
  page: Page,
  failure: Omit<FunctionalFailure, 'screenshot'>
): Promise<void> {
  const screenshot = await resultLogger.captureScreenshot(
    page,
    `functional_${failure.page}_${failure.feature}`.replace(/[^a-z0-9]/gi, '_')
  )

  resultLogger.logFunctionalFailure({
    ...failure,
    screenshot,
  })
}

