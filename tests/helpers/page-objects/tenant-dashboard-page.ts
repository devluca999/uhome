import { Page } from '@playwright/test'
import { BasePage } from './base-page'

export class TenantDashboardPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  /**
   * Navigate to tenant dashboard
   */
  async goto(): Promise<void> {
    await this.page.goto('/tenant/dashboard')
    await this.waitForLoad()
  }

  /**
   * Verify dashboard is loaded
   */
  async verifyLoaded(): Promise<void> {
    await this.waitForVisible('h1:has-text("Dashboard")', { timeout: 10000 })
  }

  /**
   * Verify rent status is displayed
   */
  async verifyRentStatusDisplayed(): Promise<void> {
    await this.waitForVisible('text=/rent|payment/i', { timeout: 5000 })
  }
}
