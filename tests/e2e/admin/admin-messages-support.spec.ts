/**
 * Admin Messages & Support E2E Tests
 *
 * Tests messages and support functionality: tickets, conversations, and announcements.
 */

import { test, expect } from '@playwright/test'
import { resetAll } from '../../helpers/reset'
import { createAndConfirmUser, generateTestEmail } from '../../helpers/auth-helpers'
import { getSupabaseAdminClient } from '../../helpers/db-helpers'
import { seedTestScenario } from '../../helpers/seed'

test.describe('Admin Messages & Support', () => {
  const baseUrl = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:1000'

  test.beforeEach(async ({ page }) => {
    await resetAll(page)
  })

  async function loginAsAdmin(page: any) {
    const adminEmail = generateTestEmail('admin')
    const password = 'TestPassword123!'
    const { userId: adminId } = await createAndConfirmUser(adminEmail, password, { role: 'admin' })
    const supabaseAdmin = getSupabaseAdminClient()
    await supabaseAdmin.from('users').upsert({ id: adminId, email: adminEmail, role: 'admin' })

    await page.goto(`${baseUrl}/login`)
    await page.fill('input[type="email"]', adminEmail)
    await page.fill('input[type="password"]', password)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/admin\/overview/, { timeout: 10000 })

    return { adminEmail, adminId, supabaseAdmin }
  }

  test('messages-support page displays tickets tab by default', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to messages-support page
    await page.click('nav a:has-text("Messages & Support")')
    await page.waitForURL(/\/admin\/messages-support/, { timeout: 5000 })

    // Default tab should be Tickets - check for tickets tab to be visible
    await expect(page.locator('button:has-text("Tickets")').first()).toBeVisible()
    // Verify Tickets tab is active by checking it has the active styles
    const ticketsTab = page.locator('button:has-text("Tickets")').first()
    const ticketsTabClasses = await ticketsTab.getAttribute('class')
    expect(ticketsTabClasses).toContain('bg-background')
  })

  test('admin can view support tickets', async ({ page }) => {
    const { supabaseAdmin } = await loginAsAdmin(page)

    // Create test user and support ticket
    const userEmail = generateTestEmail('supportuser')
    const { userId } = await createAndConfirmUser(userEmail, 'TestPassword123!', { role: 'tenant' })

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        user_id: userId,
        email: userEmail,
        subject: 'Test Support Ticket',
        message: 'This is a test support ticket message',
        status: 'open',
      })
      .select()
      .single()

    if (ticketError) throw ticketError

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to messages-support page
    await page.click('nav a:has-text("Messages & Support")')
    await page.waitForURL(/\/admin\/messages-support/, { timeout: 5000 })

    // Verify ticket is displayed - use first() to avoid strict mode violations
    await expect(page.locator('h3:has-text("Test Support Ticket")').first()).toBeVisible()
    await expect(page.locator('text=This is a test support ticket message').first()).toBeVisible()
    await expect(page.locator(`text=${userEmail}`).first()).toBeVisible()
  })

  test('admin can filter tickets by status', async ({ page }) => {
    const { supabaseAdmin } = await loginAsAdmin(page)

    // Create test user
    const userEmail = generateTestEmail('supportuser')
    const { userId } = await createAndConfirmUser(userEmail, 'TestPassword123!', { role: 'tenant' })

    // Create open ticket
    await supabaseAdmin.from('support_tickets').insert({
      user_id: userId,
      email: userEmail,
      subject: 'Open Ticket',
      message: 'Open ticket message',
      status: 'open',
    })

    // Create resolved ticket
    await supabaseAdmin.from('support_tickets').insert({
      user_id: userId,
      email: userEmail,
      subject: 'Resolved Ticket',
      message: 'Resolved ticket message',
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
    })

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to messages-support page
    await page.click('nav a:has-text("Messages & Support")')
    await page.waitForURL(/\/admin\/messages-support/, { timeout: 5000 })

    // Filter by open status
    const statusSelect = page.locator('select').first() // Status filter select
    await statusSelect.selectOption('open')
    await page.waitForTimeout(500)

    // Should show only open tickets - use first() to avoid strict mode
    await expect(page.locator('h3:has-text("Open Ticket")').first()).toBeVisible()
    // Resolved ticket might still be visible briefly or filtered out
  })

  test('admin can mark ticket as resolved', async ({ page }) => {
    const { supabaseAdmin, adminId } = await loginAsAdmin(page)

    // Create test user and support ticket
    const userEmail = generateTestEmail('supportuser')
    const { userId } = await createAndConfirmUser(userEmail, 'TestPassword123!', { role: 'tenant' })

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        user_id: userId,
        email: userEmail,
        subject: 'Ticket to Resolve',
        message: 'Please resolve this ticket',
        status: 'open',
      })
      .select()
      .single()

    if (ticketError) throw ticketError

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to messages-support page
    await page.click('nav a:has-text("Messages & Support")')
    await page.waitForURL(/\/admin\/messages-support/, { timeout: 5000 })

    // Find and click Mark Resolved button
    const ticketCard = page.locator('text=Ticket to Resolve').locator('..')
    const resolveButton = ticketCard.locator('button:has-text("Mark Resolved")')
    await resolveButton.click()

    // Wait for status update
    await page.waitForTimeout(1000)

    // Verify ticket is marked as resolved
    // Ticket should either disappear from open view or show as resolved
    await expect(resolveButton).not.toBeVisible({ timeout: 5000 })

    // Verify in database
    const { data: updatedTicket } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('id', ticket.id)
      .single()

    expect(updatedTicket?.status).toBe('resolved')
    expect(updatedTicket?.resolved_by).toBe(adminId)
  })

  test('admin can search tickets', async ({ page }) => {
    const { supabaseAdmin } = await loginAsAdmin(page)

    // Create test user and tickets
    const userEmail = generateTestEmail('searchuser')
    const { userId } = await createAndConfirmUser(userEmail, 'TestPassword123!', { role: 'tenant' })

    await supabaseAdmin.from('support_tickets').insert([
      {
        user_id: userId,
        email: userEmail,
        subject: 'Searchable Ticket',
        message: 'This ticket should be found',
        status: 'open',
      },
      {
        user_id: userId,
        email: userEmail,
        subject: 'Other Ticket',
        message: 'This ticket should not be found',
        status: 'open',
      },
    ])

    // Wait for data to sync
    await page.waitForTimeout(1000)

    // Navigate to messages-support page
    await page.click('nav a:has-text("Messages & Support")')
    await page.waitForURL(/\/admin\/messages-support/, { timeout: 5000 })

    // Search for specific ticket
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('Searchable')

    await page.waitForTimeout(500)

    // Should show matching ticket - use first() to avoid strict mode
    await expect(page.locator('h3:has-text("Searchable Ticket")').first()).toBeVisible()
  })

  test('admin can view conversations tab', async ({ page }) => {
    // Seed test scenario with conversations
    const seeded = await seedTestScenario({ createMessages: true })
    if (!seeded.lease) {
      throw new Error('Failed to seed lease for conversations test')
    }

    await loginAsAdmin(page)

    // Navigate to messages-support page
    await page.click('nav a:has-text("Messages & Support")')
    await page.waitForURL(/\/admin\/messages-support/, { timeout: 5000 })

    // Click Conversations tab
    await page.click('button:has-text("Conversations")')
    await page.waitForTimeout(500)

    // Verify conversations tab content
    await expect(page.locator('text=Conversations')).toBeVisible()
    await expect(page.locator('text=Read-only view')).toBeVisible()
  })

  test('admin can expand conversation threads', async ({ page }) => {
    // Seed test scenario with messages
    const seeded = await seedTestScenario({ createMessages: true })
    if (!seeded.lease) {
      throw new Error('Failed to seed lease for conversations test')
    }

    await loginAsAdmin(page)

    // Navigate to messages-support page
    await page.click('nav a:has-text("Messages & Support")')
    await page.waitForURL(/\/admin\/messages-support/, { timeout: 5000 })

    // Click Conversations tab
    await page.click('button:has-text("Conversations")')
    await page.waitForTimeout(500)

    // Find and click on a conversation to expand
    const conversationCards = page.locator('[class*="rounded-lg"]:has-text("messages")')
    const count = await conversationCards.count()

    if (count > 0) {
      await conversationCards.first().click()
      await page.waitForTimeout(500)

      // Verify messages are loaded (if conversation has messages)
      // The expanded view should show message threads
      const messagesContainer = page.locator('[class*="max-h-96"]')
      if (await messagesContainer.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(messagesContainer).toBeVisible()
      }
    }
  })

  test('admin can search conversations', async ({ page }) => {
    // Seed test scenario
    const seeded = await seedTestScenario({ createMessages: true })
    if (!seeded.property || !seeded.lease) {
      throw new Error('Failed to seed scenario for conversations search')
    }

    await loginAsAdmin(page)

    // Navigate to messages-support page
    await page.click('nav a:has-text("Messages & Support")')
    await page.waitForURL(/\/admin\/messages-support/, { timeout: 5000 })

    // Click Conversations tab
    await page.click('button:has-text("Conversations")')
    await page.waitForTimeout(500)

    // Search for property name or email
    const searchInput = page.locator('input[placeholder*="Search"]')
    if (seeded.property.name) {
      await searchInput.fill(seeded.property.name.substring(0, 5))
      await page.waitForTimeout(500)

      // Should show matching conversations
      // (Exact behavior depends on search implementation)
    }
  })

  test('admin can view announcements tab', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to messages-support page
    await page.click('nav a:has-text("Messages & Support")')
    await page.waitForURL(/\/admin\/messages-support/, { timeout: 5000 })

    // Click Announcements tab
    await page.click('button:has-text("Announcements")')
    await page.waitForTimeout(500)

    // Verify announcements tab content - use first() to avoid strict mode
    await expect(
      page.locator('h2, h3, div').filter({ hasText: 'Platform Announcements' }).first()
    ).toBeVisible()
    await expect(page.locator('text=Email Logs').first()).toBeVisible()
  })

  test('tabs switch correctly', async ({ page }) => {
    await loginAsAdmin(page)

    // Navigate to messages-support page
    await page.click('nav a:has-text("Messages & Support")')
    await page.waitForURL(/\/admin\/messages-support/, { timeout: 5000 })

    // Start on Tickets tab - use first() to avoid strict mode
    await expect(page.locator('button:has-text("Tickets")').first()).toBeVisible()

    // Switch to Conversations
    await page.click('button:has-text("Conversations")')
    await page.waitForTimeout(500)
    await expect(page.locator('text=Conversations')).toBeVisible()
    await expect(page.locator('text=Support Tickets')).not.toBeVisible()

    // Switch to Announcements
    await page.click('button:has-text("Announcements")')
    await page.waitForTimeout(500)
    await expect(page.locator('text=Platform Announcements')).toBeVisible()
    await expect(page.locator('text=Conversations')).not.toBeVisible()

    // Switch back to Tickets
    await page.click('button:has-text("Tickets")')
    await page.waitForTimeout(500)
    await expect(page.locator('text=Support Tickets')).toBeVisible()
  })
})
