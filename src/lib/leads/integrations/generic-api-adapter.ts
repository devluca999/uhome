/**
 * Generic API Integration Adapter
 *
 * Adapter for generic REST API integrations.
 * Handles fetching leads from any REST API endpoint.
 */

import type { RawLead } from '../normalization'

export interface GenericApiAdapterConfig {
  endpoint: string
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: any
  transformFunction?: (data: any) => RawLead[] // Custom transform function
}

export interface GenericApiLeadsResult {
  success: boolean
  leads: RawLead[]
  total: number
  error?: string
}

/**
 * Fetch leads from generic API
 */
export async function fetchLeadsFromGenericApi(
  config: GenericApiAdapterConfig
): Promise<GenericApiLeadsResult> {
  try {
    const response = await fetch(config.endpoint, {
      method: config.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: config.body ? JSON.stringify(config.body) : undefined,
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Use custom transform function if provided, otherwise use default
    const leads = config.transformFunction
      ? config.transformFunction(data)
      : transformGenericApiLeads(data)

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
 * Default transform function for generic API data
 */
function transformGenericApiLeads(apiData: any): RawLead[] {
  // Assume data is an array of lead objects
  const items = Array.isArray(apiData) ? apiData : apiData.items || apiData.data || []

  return items.map((item: any) => ({
    email: item.email || item.email_address || '',
    name: item.name || item.full_name || null,
    phone: item.phone || item.phone_number || null,
    company: item.company || item.company_name || null,
    icp_tags: item.tags || item.categories || null,
    source: 'api',
    metadata: {
      api_source: item.source || null,
      fetched_at: new Date().toISOString(),
      raw_data: item, // Store raw data for reference
    },
  }))
}
