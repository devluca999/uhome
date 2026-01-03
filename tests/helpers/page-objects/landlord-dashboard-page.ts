import { Page } from '@playwright/test'
import { BasePage } from './base-page'

export class LandlordDashboardPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  /**
   * Navigate to landlord dashboard
   */
  async goto(): Promise<void> {
    await this.goto('/landlord/dashboard')
  }

  /**
   * Verify dashboard is loaded
   */
  async verifyLoaded(): Promise<void> {
    await this.waitForVisible('h1:has-text("Dashboard")', { timeout: 10000 })
  }
}

