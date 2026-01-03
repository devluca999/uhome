import { Page, expect } from '@playwright/test'
import { BasePage } from './base-page'

export class FinancesPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  /**
   * Navigate to finances page
   */
  async goto(): Promise<void> {
    await this.page.goto('/landlord/finances')
    await this.waitForLoad()
  }

  /**
   * Verify finances page is loaded
   */
  async verifyLoaded(): Promise<void> {
    await this.waitForVisible('text=/ledger|finances/i', { timeout: 10000 })
  }

  /**
   * Verify rent record appears in ledger
   */
  async verifyRentRecordInLedger(propertyName: string, amount: string): Promise<void> {
    // Look for the property name and amount in the ledger
    const ledgerRow = this.page.locator('text=' + propertyName).locator('..').locator('..')
    await expect(ledgerRow).toBeVisible()
    await expect(ledgerRow.locator('text=' + amount)).toBeVisible()
  }

  /**
   * Click on rent ledger row to expand
   */
  async expandRentRecordRow(recordIndex: number = 0): Promise<void> {
    // Find rent record rows and click the first one (or specified index)
    const rows = this.page.locator('[data-testid="rent-ledger-row"], .rent-record-row').or(
      this.page.locator('text=/rent/i').locator('..').locator('..').first()
    )
    await rows.nth(recordIndex).click()
  }

  /**
   * Click "Generate Receipt" button
   */
  async clickGenerateReceipt(): Promise<void> {
    await this.click(this.getByRole('button', /generate receipt/i))
  }

  /**
   * Verify receipt link is visible
   */
  async verifyReceiptLink(): Promise<void> {
    await this.waitForVisible('a:has-text(/receipt/i), button:has-text(/view receipt/i), a[href*="receipt"]', { timeout: 10000 })
  }

  /**
   * Verify KPI values are displayed
   */
  async verifyKPIDisplayed(): Promise<void> {
    // KPI strip should show financial metrics
    await expect(this.page.locator('text=/collected|income/i')).toBeVisible()
  }
}

