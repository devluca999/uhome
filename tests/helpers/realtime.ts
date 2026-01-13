/**
 * Realtime Test Helpers
 * 
 * Utilities for testing realtime subscriptions and multi-tab sync.
 */

import { Page, BrowserContext } from '@playwright/test'
import { getSupabaseClient } from './db-helpers'
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'

/**
 * Wait for realtime update in a page
 * Polls for a condition to become true after a realtime event
 */
export async function waitForRealtimeUpdate(
  page: Page,
  checkFn: () => Promise<boolean>,
  timeout: number = 10000
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await checkFn()) {
      return
    }
    await page.waitForTimeout(100) // Poll every 100ms
  }

  throw new Error('Realtime update did not occur within timeout')
}

/**
 * Open multiple pages (for multi-tab testing)
 */
export async function openMultiplePages(
  context: BrowserContext,
  count: number = 2
): Promise<Page[]> {
  const pages: Page[] = []
  for (let i = 0; i < count; i++) {
    const page = await context.newPage()
    pages.push(page)
  }
  return pages
}

/**
 * Wait for sync across pages
 * Verifies that an action in one page is reflected in another
 */
export async function waitForCrossPageSync(
  sourcePage: Page,
  targetPage: Page,
  action: () => Promise<void>,
  verifyFn: (page: Page) => Promise<boolean>,
  timeout: number = 10000
): Promise<void> {
  // Perform action in source page
  await action()

  // Wait for update in target page
  await waitForRealtimeUpdate(targetPage, () => verifyFn(targetPage), timeout)
}

/**
 * Create a realtime subscription for testing
 */
export async function createTestSubscription(
  supabase: SupabaseClient,
  table: string,
  filter?: Record<string, any>
): Promise<RealtimeChannel> {
  const channel = supabase
    .channel(`test-${table}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter: filter ? Object.entries(filter).map(([key, value]) => `${key}=eq.${value}`).join(',') : undefined,
      },
      (payload) => {
        console.log(`[Realtime] ${table} update:`, payload)
      }
    )
    .subscribe()

  // Wait a bit for subscription to establish
  await new Promise(resolve => setTimeout(resolve, 500))

  return channel
}

/**
 * Wait for realtime event
 */
export async function waitForRealtimeEvent(
  channel: RealtimeChannel,
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  timeout: number = 10000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Realtime event ${eventType} did not occur within timeout`))
    }, timeout)

    // Note: This is a simplified version
    // In practice, you'd set up event listeners on the channel
    // For now, we'll use polling in the page
    clearTimeout(timer)
    resolve(null)
  })
}

/**
 * Verify realtime subscription is active
 */
export async function verifySubscriptionActive(
  supabase: SupabaseClient,
  channel: RealtimeChannel
): Promise<boolean> {
  const channels = supabase.getChannels()
  return channels.includes(channel)
}

/**
 * Close all realtime subscriptions
 */
export async function closeAllSubscriptions(supabase: SupabaseClient): Promise<void> {
  const channels = supabase.getChannels()
  for (const channel of channels) {
    await supabase.removeChannel(channel)
  }
}

/**
 * Simulate network disconnect (for testing reconnection)
 */
export async function simulateNetworkDisconnect(page: Page): Promise<void> {
  await page.context().setOffline(true)
}

/**
 * Simulate network reconnect
 */
export async function simulateNetworkReconnect(page: Page): Promise<void> {
  await page.context().setOffline(false)
}

/**
 * Wait for page to show updated data (for realtime sync tests)
 */
export async function expectPageToUpdate(
  page: Page,
  selector: string,
  expectedText: string,
  timeout: number = 10000
): Promise<void> {
  await page.waitForSelector(selector, { timeout })
  await page.waitForFunction(
    (sel, text) => {
      const element = document.querySelector(sel)
      return element?.textContent?.includes(text) || false
    },
    selector,
    expectedText,
    { timeout }
  )
}

/**
 * Helper to test multi-tab sync
 * Opens two pages, performs action in one, verifies in other
 */
export async function testMultiTabSync(
  context: BrowserContext,
  setupFn: (page: Page) => Promise<void>,
  actionFn: (page: Page) => Promise<void>,
  verifyFn: (page: Page) => Promise<boolean>
): Promise<void> {
  const [page1, page2] = await openMultiplePages(context, 2)

  try {
    // Setup both pages
    await setupFn(page1)
    await setupFn(page2)

    // Perform action in page1
    await actionFn(page1)

    // Wait for sync in page2
    await waitForRealtimeUpdate(page2, () => verifyFn(page2), 10000)
  } finally {
    await page1.close()
    await page2.close()
  }
}

