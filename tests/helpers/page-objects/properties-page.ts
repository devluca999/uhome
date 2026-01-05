import { Page, expect } from '@playwright/test'
import { BasePage } from './base-page'

export class PropertiesPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  /**
   * Navigate to properties page
   */
  async goto(): Promise<void> {
    await this.page.goto('/landlord/properties')
    await this.waitForLoad()
  }

  /**
   * Click "Add Property" button
   */
  async clickAddProperty(): Promise<void> {
    await this.click(this.getByRole('button', /add property/i))
  }

  /**
   * Fill property form
   */
  async fillPropertyForm(data: {
    name: string
    address?: string
    rentAmount: string
    rentDueDate?: string
    rules?: string
  }): Promise<void> {
    await this.fill('input[name="name"], input[placeholder*="name" i]', data.name)

    if (data.address) {
      await this.fill('input[name="address"], input[placeholder*="address" i]', data.address)
    }

    await this.fill('input[name="rent_amount"], input[type="number"]', data.rentAmount)

    if (data.rentDueDate) {
      await this.fill('input[name="rent_due_date"]', data.rentDueDate)
    }

    if (data.rules) {
      await this.fill('textarea[name="rules"], textarea[placeholder*="rules" i]', data.rules)
    }
  }

  /**
   * Submit property form
   */
  async submitPropertyForm(): Promise<void> {
    await this.click('button[type="submit"]:has-text(/save|create|add/i)')
  }

  /**
   * Verify property appears in list
   */
  async verifyPropertyInList(propertyName: string): Promise<void> {
    await expect(this.getByText(propertyName)).toBeVisible()
  }

  /**
   * Click on property card by name
   */
  async clickPropertyCard(propertyName: string): Promise<void> {
    await this.click(this.getByText(propertyName))
  }

  /**
   * Verify empty state is shown
   */
  async verifyEmptyState(): Promise<void> {
    await expect(this.getByText(/no properties/i)).toBeVisible()
  }
}
