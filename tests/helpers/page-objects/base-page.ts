import { Page, Locator } from '@playwright/test'

/**
 * Base page object class with common methods
 */
export class BasePage {
  constructor(protected page: Page) {}

  /**
   * Wait for page to be fully loaded
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Navigate to a specific path
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path)
    await this.waitForLoad()
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url()
  }

  /**
   * Wait for URL to match pattern
   */
  async waitForUrl(url: string | RegExp, options?: { timeout?: number }): Promise<void> {
    await this.page.waitForURL(url, options)
  }

  /**
   * Get element by text
   */
  getByText(text: string | RegExp): Locator {
    return this.page.getByText(text)
  }

  /**
   * Get element by role
   */
  getByRole(role: 'button' | 'link' | 'textbox' | 'heading' | 'cell', name: string | RegExp): Locator {
    return this.page.getByRole(role, { name })
  }

  /**
   * Get element by placeholder
   */
  getByPlaceholder(placeholder: string | RegExp): Locator {
    return this.page.getByPlaceholder(placeholder)
  }

  /**
   * Get element by label
   */
  getByLabel(label: string | RegExp): Locator {
    return this.page.getByLabel(label)
  }

  /**
   * Click an element
   */
  async click(selector: string | Locator): Promise<void> {
    if (typeof selector === 'string') {
      await this.page.click(selector)
    } else {
      await selector.click()
    }
  }

  /**
   * Fill an input field
   */
  async fill(selector: string | Locator, value: string): Promise<void> {
    if (typeof selector === 'string') {
      await this.page.fill(selector, value)
    } else {
      await selector.fill(value)
    }
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string | Locator): Promise<boolean> {
    if (typeof selector === 'string') {
      return await this.page.locator(selector).isVisible()
    }
    return await selector.isVisible()
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(selector: string | Locator, options?: { timeout?: number }): Promise<void> {
    if (typeof selector === 'string') {
      await this.page.locator(selector).waitFor({ state: 'visible', timeout: options?.timeout })
    } else {
      await selector.waitFor({ state: 'visible', timeout: options?.timeout })
    }
  }

  /**
   * Get text content of an element
   */
  async getText(selector: string | Locator): Promise<string | null> {
    if (typeof selector === 'string') {
      return await this.page.locator(selector).textContent()
    }
    return await selector.textContent()
  }

  /**
   * Select option in dropdown
   */
  async selectOption(selector: string | Locator, value: string): Promise<void> {
    if (typeof selector === 'string') {
      await this.page.selectOption(selector, value)
    } else {
      await selector.selectOption(value)
    }
  }
}

