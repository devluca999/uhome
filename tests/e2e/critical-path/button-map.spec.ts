/**
 * Data-driven checks for BUTTON_MAP_ENTRIES (tests/fixtures/button-map.ts).
 * Uses Playwright route mocks (tests/visual/helpers/mock-supabase.ts).
 */
import { test, expect, type Page } from '@playwright/test'
import { setupMockSupabase } from '../../visual/helpers/mock-supabase'
import { BUTTON_MAP_ENTRIES } from '../../fixtures/button-map'

async function mockLogin(page: Page, email: string) {
  await setupMockSupabase(page, { sessionEmail: email })
  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill('mock-password')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await page.waitForURL(/\/(landlord|tenant|admin)\//, { timeout: 25_000 })
}

test.describe('Button map (mock Supabase)', () => {
  for (const entry of BUTTON_MAP_ENTRIES) {
    const title = `${entry.mapRole} — ${entry.id}`

    if (entry.skipE2e) {
      test.skip(title, () => {
        /* documented in fixture */
      })
      continue
    }

    test(title, async ({ page }) => {
      test.setTimeout(60_000)

      if (entry.mapRole === 'auth' || !entry.sessionEmail) {
        await setupMockSupabase(page, { sessionEmail: 'landlord@example.com' })
      } else {
        await mockLogin(page, entry.sessionEmail)
      }

      await page.goto(entry.route)
      await page.waitForLoadState('domcontentloaded')
      // networkidle can hang on pages with polling; cap wait so assertions still run.
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

      // Clear only renders when at least one filter is non-default; align with landlord/properties.tsx.
      if (entry.id === 'll-prop-clear-filters') {
        await page.getByText('Sort:', { exact: true }).locator('..').locator('select').selectOption('oldest')
      }

      if (entry.id === 'ad-users-modal-cancel') {
        await page
          .locator(
            'button[title="Ban user"], button[title="Lock account"], button[title="Reset password"]'
          )
          .first()
          .click()
        const cancel = page.getByRole('button', { name: 'Cancel' })
        await expect(cancel.first()).toBeVisible({ timeout: 20_000 })
        await cancel.first().click()
        const exModal = entry.expect
        if (exModal.kind === 'url') {
          await expect(page).toHaveURL(exModal.pattern)
        } else if (exModal.kind === 'visible') {
          if (exModal.text) {
            await expect(page.getByText(exModal.text).first()).toBeVisible({ timeout: 12_000 })
          }
        } else if (exModal.kind === 'dialog') {
          await expect(page.getByRole('dialog', { name: exModal.name })).toBeVisible({
            timeout: 12_000,
          })
        } else if (exModal.kind === 'loaded') {
          await expect(page.getByRole('heading', { name: exModal.heading })).toBeVisible({
            timeout: 12_000,
          })
        }
        return
      }

      const { role, name, exact } = entry.playwright
      const loc = page.getByRole(role, { name, exact })
      await expect(loc.first()).toBeVisible({ timeout: 20_000 })
      await loc.first().click()

      const ex = entry.expect
      if (ex.kind === 'url') {
        await expect(page).toHaveURL(ex.pattern)
      } else if (ex.kind === 'visible') {
        if (ex.text) {
          await expect(page.getByText(ex.text).first()).toBeVisible({ timeout: 12_000 })
        }
      } else if (ex.kind === 'dialog') {
        await expect(page.getByRole('dialog', { name: ex.name })).toBeVisible({
          timeout: 12_000,
        })
      } else if (ex.kind === 'loaded') {
        await expect(page.getByRole('heading', { name: ex.heading })).toBeVisible({
          timeout: 12_000,
        })
      }
    })
  }
})
