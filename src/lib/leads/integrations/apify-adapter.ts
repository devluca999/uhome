/**
 * Apify Integration Adapter
 * 
 * Adapter for Apify API integration.
 * Handles fetching leads from Apify actors.
 */

import type { RawLead } from '../normalization'

export interface ApifyAdapterConfig {
  apiKey: string
  actorId: string
  datasetId?: string
  runId?: string
}

export interface ApifyLeadsResult {
  success: boolean
  leads: RawLead[]
  total: number
  error?: string
}

/**
 * Fetch leads from Apify
 */
export async function fetchLeadsFromApify(
  config: ApifyAdapterConfig
): Promise<ApifyLeadsResult> {
  try {
    // Apify API endpoint
    const baseUrl = 'https://api.apify.com/v2'
    const url = config.datasetId
      ? `${baseUrl}/datasets/${config.datasetId}/items`
      : config.runId
        ? `${baseUrl}/actor-runs/${config.runId}/dataset/items`
        : `${baseUrl}/actors/${config.actorId}/runs/last/dataset/items`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Apify API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Transform Apify data to system format
    const leads = transformApifyLeads(Array.isArray(data) ? data : data.items || [])

    return {
      success: true,
      leads,
      total: leads.length,
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
 * Transform Apify data to system format
 */
function transformApifyLeads(apifyData: any[]): RawLead[] {
  return apifyData.map(item => ({
    email: item.email || item.emailAddress || '',
    name: item.name || item.fullName || null,
    phone: item.phone || item.phoneNumber || null,
    company: item.company || item.companyName || null,
    icp_tags: item.tags || item.categories || null,
    source: 'apify',
    metadata: {
      apify_actor_id: item.actorId || null,
      apify_run_id: item.runId || null,
      scraped_at: item.scrapedAt || new Date().toISOString(),
    },
  }))
}
