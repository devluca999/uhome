/**
 * Report Generator for UAT Tests
 * 
 * Generates markdown reports from test results:
 * - Visual test results
 * - Functional test results
 * - Product readiness report
 */

import * as fs from 'fs'
import * as path from 'path'
import { resultLogger, type VisualMismatch, type FunctionalFailure } from './result-logger'

/**
 * Generate visual test results report
 */
export function generateVisualTestResults(): string {
  const mismatches = resultLogger.getVisualMismatches()
  const summary = resultLogger.getSummary()

  let report = `# Visual Test Results\n\n`
  report += `Generated: ${new Date().toISOString()}\n\n`
  report += `## Summary\n\n`
  report += `- **Total Visual Mismatches:** ${summary.visualMismatches}\n`
  report += `- **Total Tests:** ${summary.total}\n`
  report += `- **Passed:** ${summary.passed}\n`
  report += `- **Failed:** ${summary.failed}\n\n`

  if (mismatches.length === 0) {
    report += `## ✅ No Visual Mismatches\n\n`
    report += `All visual tests passed. No design spec mismatches found.\n`
    return report
  }

  report += `## Visual Mismatches\n\n`

  // Group by page
  const byPage = mismatches.reduce((acc, mismatch) => {
    if (!acc[mismatch.page]) {
      acc[mismatch.page] = []
    }
    acc[mismatch.page].push(mismatch)
    return acc
  }, {} as Record<string, VisualMismatch[]>)

  for (const [page, pageMismatches] of Object.entries(byPage)) {
    report += `### ${page}\n\n`

    for (const mismatch of pageMismatches) {
      report += `#### ${mismatch.feature} - ${mismatch.element}\n\n`
      report += `**Issue:** ${mismatch.issue}\n\n`
      
      if (mismatch.expected) {
        report += `**Expected:** ${mismatch.expected}\n\n`
      }
      
      if (mismatch.actual) {
        report += `**Actual:** ${mismatch.actual}\n\n`
      }

      if (mismatch.screenshot) {
        report += `![Screenshot](${mismatch.screenshot})\n\n`
      }

      report += `---\n\n`
    }
  }

  return report
}

/**
 * Generate functional test results report
 */
export function generateFunctionalTestResults(): string {
  const failures = resultLogger.getFunctionalFailures()
  const summary = resultLogger.getSummary()

  let report = `# Functional Test Results\n\n`
  report += `Generated: ${new Date().toISOString()}\n\n`
  report += `## Summary\n\n`
  report += `- **Total Functional Failures:** ${summary.functionalFailures}\n`
  report += `- **Total Tests:** ${summary.total}\n`
  report += `- **Passed:** ${summary.passed}\n`
  report += `- **Failed:** ${summary.failed}\n\n`

  if (failures.length === 0) {
    report += `## ✅ No Functional Failures\n\n`
    report += `All functional tests passed. No workflow failures found.\n`
    return report
  }

  report += `## Functional Failures\n\n`

  // Group by page
  const byPage = failures.reduce((acc, failure) => {
    if (!acc[failure.page]) {
      acc[failure.page] = []
    }
    acc[failure.page].push(failure)
    return acc
  }, {} as Record<string, FunctionalFailure[]>)

  for (const [page, pageFailures] of Object.entries(byPage)) {
    report += `### ${page}\n\n`

    for (const failure of pageFailures) {
      report += `#### ${failure.feature} - ${failure.workflow}\n\n`
      report += `**Error:** ${failure.error}\n\n`
      
      if (failure.steps.length > 0) {
        report += `**Steps:**\n`
        for (const step of failure.steps) {
          report += `1. ${step}\n`
        }
        report += `\n`
      }

      if (failure.screenshot) {
        report += `![Screenshot](${failure.screenshot})\n\n`
      }

      report += `---\n\n`
    }
  }

  return report
}

/**
 * Generate product readiness report
 */
export function generateProductReadinessReport(
  mvpPages: string[],
  testedPages: string[]
): string {
  const summary = resultLogger.getSummary()
  const failures = resultLogger.getFunctionalFailures()
  const mismatches = resultLogger.getVisualMismatches()

  let report = `# Product Readiness Report\n\n`
  report += `Generated: ${new Date().toISOString()}\n\n`
  report += `## Test Summary\n\n`
  report += `- **Total Tests:** ${summary.total}\n`
  report += `- **Passed:** ${summary.passed}\n`
  report += `- **Failed:** ${summary.failed}\n`
  report += `- **Skipped:** ${summary.skipped}\n`
  report += `- **Visual Mismatches:** ${summary.visualMismatches}\n`
  report += `- **Functional Failures:** ${summary.functionalFailures}\n\n`

  report += `## Feature Completeness\n\n`

  // Check MVP pages
  const missingPages = mvpPages.filter(page => !testedPages.includes(page))
  const extraPages = testedPages.filter(page => !mvpPages.includes(page))

  report += `### MVP Pages\n\n`
  if (missingPages.length === 0) {
    report += `✅ All MVP pages are implemented and tested.\n\n`
  } else {
    report += `⚠️ Missing or untested MVP pages:\n\n`
    for (const page of missingPages) {
      report += `- ${page}\n`
    }
    report += `\n`
  }

  if (extraPages.length > 0) {
    report += `### Post-MVP Pages\n\n`
    report += `The following pages are implemented but not in MVP scope:\n\n`
    for (const page of extraPages) {
      report += `- ${page}\n`
    }
    report += `\n`
  }

  report += `## Critical Issues\n\n`

  const criticalFailures = failures.filter(f => 
    f.error.toLowerCase().includes('crash') ||
    f.error.toLowerCase().includes('data loss') ||
    f.error.toLowerCase().includes('security')
  )

  if (criticalFailures.length === 0) {
    report += `✅ No critical issues found.\n\n`
  } else {
    report += `❌ **${criticalFailures.length} critical issues found:**\n\n`
    for (const failure of criticalFailures) {
      report += `- **${failure.page} - ${failure.feature}:** ${failure.error}\n`
    }
    report += `\n`
  }

  report += `## Recommended Fixes\n\n`

  if (failures.length === 0 && mismatches.length === 0) {
    report += `✅ No fixes needed. All tests passed.\n\n`
  } else {
    // Group recommendations by priority
    const highPriority = failures.filter(f => 
      f.error.toLowerCase().includes('crash') ||
      f.error.toLowerCase().includes('data loss')
    )

    if (highPriority.length > 0) {
      report += `### High Priority\n\n`
      for (const failure of highPriority) {
        report += `1. **${failure.page} - ${failure.feature}:** Fix ${failure.error}\n`
      }
      report += `\n`
    }

    if (mismatches.length > 0) {
      report += `### Visual Issues\n\n`
      for (const mismatch of mismatches.slice(0, 10)) {
        report += `1. **${mismatch.page} - ${mismatch.feature}:** ${mismatch.issue}\n`
      }
      if (mismatches.length > 10) {
        report += `\n... and ${mismatches.length - 10} more visual issues\n`
      }
      report += `\n`
    }
  }

  report += `## Readiness Assessment\n\n`

  const passRate = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0

  if (passRate >= 95 && criticalFailures.length === 0) {
    report += `✅ **READY FOR PRODUCTION**\n\n`
    report += `- Pass rate: ${passRate.toFixed(1)}%\n`
    report += `- No critical issues\n`
    report += `- All MVP pages tested\n`
  } else if (passRate >= 80 && criticalFailures.length === 0) {
    report += `⚠️ **NEEDS FIXES BEFORE PRODUCTION**\n\n`
    report += `- Pass rate: ${passRate.toFixed(1)}%\n`
    report += `- ${failures.length} functional failures to address\n`
    report += `- ${mismatches.length} visual issues to address\n`
  } else {
    report += `❌ **NOT READY FOR PRODUCTION**\n\n`
    report += `- Pass rate: ${passRate.toFixed(1)}%\n`
    report += `- ${criticalFailures.length} critical issues must be fixed\n`
    report += `- ${failures.length} functional failures\n`
    report += `- ${mismatches.length} visual issues\n`
  }

  return report
}

/**
 * Write report to file
 */
export function writeReport(filename: string, content: string): void {
  const reportsDir = path.join(process.cwd(), 'docs', 'uat')
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true })
  }

  const filepath = path.join(reportsDir, filename)
  fs.writeFileSync(filepath, content, 'utf-8')
}

/**
 * Generate all reports
 */
export function generateAllReports(mvpPages: string[] = [], testedPages: string[] = []): void {
  const visualReport = generateVisualTestResults()
  const functionalReport = generateFunctionalTestResults()
  const readinessReport = generateProductReadinessReport(mvpPages, testedPages)

  writeReport('visual-test-results.md', visualReport)
  writeReport('functional-test-results.md', functionalReport)
  writeReport('product-readiness.md', readinessReport)
}

