/**
 * Scraper Integration Adapter
 *
 * Adapter for Python + Playwright scraper integration.
 * Handles communication with scraper via Supabase Edge Function.
 */

import { supabase } from '@/lib/supabase/client'
import type { RawLead } from '../normalization'

export interface ScraperAdapterConfig {
  endpoint: string // Supabase Edge Function endpoint
  apiKey?: string // Optional API key for authentication
  rateLimit?: number // Max requests per hour
}

export interface ScraperLeadsResult {
  success: boolean
  leads: RawLead[]
  total: number
  error?: string
}

/**
 * Fetch leads from scraper
 */
export async function fetchLeadsFromScraper(
  config: ScraperAdapterConfig
): Promise<ScraperLeadsResult> {
  try {
    // Check kill switch
    const killSwitchActive = await checkScraperKillSwitch()
    if (killSwitchActive) {
      return {
        success: false,
        leads: [],
        total: 0,
        error: 'Scraper kill switch is active',
      }
    }

    // Call Edge Function to trigger scraper or fetch results
    const { data, error } = await supabase.functions.invoke('scraper-fetch', {
      body: {
        endpoint: config.endpoint,
        apiKey: config.apiKey,
      },
    })

    if (error) {
      return {
        success: false,
        leads: [],
        total: 0,
        error: error.message,
      }
    }

    return {
      success: true,
      leads: data?.leads || [],
      total: data?.total || 0,
    }
  } catch (error) {
    return {
      success: false,
      leads: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if scraper kill switch is active
 */
async function checkScraperKillSwitch(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('scraper_kill_switch').select('enabled').single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" - default to enabled (safe)
      console.error('Error checking kill switch:', error)
      return true // Fail safe: assume kill switch is on
    }

    return data?.enabled ?? false
  } catch (error) {
    console.error('Error checking kill switch:', error)
    return true // Fail safe
  }
}

/**
 * Transform scraper data to system format
 */
export function transformScraperLeads(scraperData: any[]): RawLead[] {
  return scraperData.map(item => ({
    email: item.email || item.email_address || '',
    name: item.name || item.full_name || null,
    phone: item.phone || item.phone_number || null,
    company: item.company || item.company_name || null,
    icp_tags: item.icp_tags || item.tags || null,
    source: 'scraper',
    metadata: {
      scraper_source: item.source_url || null,
      scraped_at: item.scraped_at || new Date().toISOString(),
    },
  }))
}

/**
 * Validate scraper leads before ingestion
 */
export function validateScraperLeads(leads: RawLead[]): {
  valid: RawLead[]
  invalid: Array<{ lead: RawLead; error: string }>
} {
  const valid: RawLead[] = []
  const invalid: Array<{ lead: RawLead; error: string }> = []

  leads.forEach(lead => {
    if (!lead.email || !lead.email.trim()) {
      invalid.push({ lead, error: 'Missing email' })
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(lead.email)) {
      invalid.push({ lead, error: 'Invalid email format' })
      return
    }

    valid.push(lead)
  })

  return { valid, invalid }
}
