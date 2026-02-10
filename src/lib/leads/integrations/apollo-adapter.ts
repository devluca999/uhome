/**
 * Apollo Integration Adapter
 * 
 * Adapter for Apollo API integration.
 * Handles fetching leads from Apollo search results.
 */

import type { RawLead } from '../normalization'

export interface ApolloAdapterConfig {
  apiKey: string
  searchParams: {
    personTitles?: string[]
    personLocations?: string[]
    organizationIndustries?: string[]
    [key: string]: any
  }
}

export interface ApolloLeadsResult {
  success: boolean
  leads: RawLead[]
  total: number
  error?: string
}

/**
 * Fetch leads from Apollo
 */
export async function fetchLeadsFromApollo(
  config: ApolloAdapterConfig
): Promise<ApolloLeadsResult> {
  try {
    // Apollo API endpoint
    const baseUrl = 'https://api.apollo.io/v1'
    const url = `${baseUrl}/mixed_people/search`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': config.apiKey,
      },
      body: JSON.stringify({
        ...config.searchParams,
        page: 1,
        per_page: 100, // Adjust as needed
      }),
    })

    if (!response.ok) {
      throw new Error(`Apollo API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Transform Apollo data to system format
    const leads = transformApolloLeads(data.people || [])

    return {
      success: true,
      leads,
      total: data.pagination?.total_entries || leads.length,
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
 * Transform Apollo data to system format
 */
function transformApolloLeads(apolloData: any[]): RawLead[] {
  return apolloData.map(person => ({
    email: person.email || person.email_status === 'verified' ? person.email : '',
    name: person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim() || null,
    phone: person.phone_numbers?.[0]?.raw_number || person.phone || null,
    company: person.organization?.name || person.company_name || null,
    icp_tags: person.organization?.industry || null,
    source: 'apollo',
    metadata: {
      apollo_person_id: person.id || null,
      apollo_organization_id: person.organization?.id || null,
      title: person.title || null,
      location: person.city || null,
      scraped_at: new Date().toISOString(),
    },
  }))
}
