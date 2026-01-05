/**
 * Playwright Network Interception for Mock Supabase Data
 *
 * This module intercepts Supabase REST API calls and returns
 * deterministic mock data instead of hitting the real database.
 */

import { Page, Route } from '@playwright/test'
import {
  MOCK_USERS,
  MOCK_PROPERTIES,
  MOCK_TENANTS,
  MOCK_RENT_RECORDS,
  MOCK_EXPENSES,
  MOCK_MAINTENANCE_REQUESTS,
  MOCK_DOCUMENTS,
  MOCK_NOTES,
  MOCK_TASKS,
  MOCK_LANDLORD_ID,
} from './mock-data'

/**
 * Get Supabase URL from environment or page
 */
function getSupabaseUrl(page: Page): string {
  // Try to get from page context or environment
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
  return supabaseUrl.replace(/\/$/, '') // Remove trailing slash
}

/**
 * Parse Supabase REST API request
 */
function parseSupabaseRequest(url: string, method: string, postData?: string) {
  const urlObj = new URL(url)
  const pathParts = urlObj.pathname.split('/').filter(Boolean)

  // Supabase REST API pattern: /rest/v1/{table}
  const restIndex = pathParts.indexOf('rest')
  if (restIndex === -1 || pathParts[restIndex + 1] !== 'v1') {
    return null
  }

  const table = pathParts[restIndex + 2]
  const select = urlObj.searchParams.get('select')
  const filters: Record<string, string> = {}

  // Parse common filters
  urlObj.searchParams.forEach((value, key) => {
    if (
      key.startsWith('id') ||
      key.startsWith('property_id') ||
      key.startsWith('tenant_id') ||
      key.startsWith('user_id') ||
      key.startsWith('owner_id') ||
      key.startsWith('entity_id') ||
      key.startsWith('entity_type') ||
      key.startsWith('status')
    ) {
      filters[key] = value
    }
  })

  return { table, method, select, filters, postData }
}

/**
 * Filter mock data based on query filters
 */
function filterData(data: any[], filters: Record<string, string>): any[] {
  let filtered = [...data]

  for (const [key, value] of Object.entries(filters)) {
    if (key.includes('.')) {
      // Handle nested selects (e.g., property.name)
      continue
    }

    filtered = filtered.filter(item => {
      // Supabase filter syntax: field=eq.value or field=in.value1,value2
      // Check if value starts with an operator
      if (value.startsWith('eq.')) {
        const filterValue = value.substring(3) // Remove 'eq.' prefix
        return String(item[key]) === filterValue
      } else if (value.startsWith('in.')) {
        const filterValues = value.substring(3).split(',') // Remove 'in.' prefix and split
        return filterValues.includes(String(item[key]))
      } else if (value.startsWith('gte.')) {
        const filterValue = value.substring(4)
        return Number(item[key]) >= Number(filterValue)
      } else if (value.startsWith('lte.')) {
        const filterValue = value.substring(4)
        return Number(item[key]) <= Number(filterValue)
      } else if (key.endsWith('.eq')) {
        // Legacy format: field.eq=value
        const field = key.replace('.eq', '')
        return item[field] === value
      } else if (key.endsWith('.in')) {
        // Legacy format: field.in=value1,value2
        const field = key.replace('.in', '')
        const values = value.split(',')
        return values.includes(item[field])
      } else {
        // Direct equality match
        return String(item[key]) === String(value)
      }
    })
  }

  return filtered
}

/**
 * Handle nested select queries (e.g., property:properties(*))
 */
function expandNestedSelect(data: any[], select: string): any[] {
  if (!select || !select.includes(':')) {
    return data
  }

  // Simple expansion for common patterns
  return data.map(item => {
    const expanded: any = { ...item }

    // Handle property:properties(*) pattern
    if (select.includes('property:properties')) {
      const propertyId = item.property_id
      const property = MOCK_PROPERTIES.find(p => p.id === propertyId)
      if (property) {
        expanded.property = property
      }
    }

    // Handle users!tenants_user_id_fkey pattern
    if (select.includes('users!')) {
      const userId = item.user_id
      const user = MOCK_USERS.find(u => u.id === userId)
      if (user) {
        expanded.user = user
        expanded.users = user // Supabase returns both
      }
    }

    return expanded
  })
}

/**
 * Get mock data for a table
 */
function getMockDataForTable(table: string): any[] {
  switch (table) {
    case 'users':
      return MOCK_USERS
    case 'properties':
      return MOCK_PROPERTIES
    case 'tenants':
      return MOCK_TENANTS
    case 'rent_records':
      return MOCK_RENT_RECORDS
    case 'expenses':
      return MOCK_EXPENSES
    case 'maintenance_requests':
      return MOCK_MAINTENANCE_REQUESTS
    case 'documents':
      return MOCK_DOCUMENTS
    case 'notes':
      return MOCK_NOTES
    case 'tasks':
      return MOCK_TASKS
    case 'units':
    case 'property_groups':
    case 'property_group_assignments':
      // These tables don't exist in the schema yet, return empty array
      return []
    default:
      return []
  }
}

/**
 * Handle Supabase REST API request
 */
async function handleSupabaseRequest(route: Route, request: any) {
  const url = request.url()
  const method = request.method()
  const postData = request.postData()

  const parsed = parseSupabaseRequest(url, method, postData)
  if (!parsed) {
    // Not a Supabase request, continue normally
    await route.continue()
    return
  }

  const { table, method: httpMethod, select, filters } = parsed

  // Get mock data for table
  let data = getMockDataForTable(table)

  // If table not found and it's a known missing table, return empty array
  // This prevents 404s for tables that don't exist in the schema
  if (
    data.length === 0 &&
    ['units', 'property_groups', 'property_group_assignments'].includes(table)
  ) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
    return
  }

  // Apply filters
  if (Object.keys(filters).length > 0) {
    data = filterData(data, filters)
  }

  // Handle different HTTP methods
  if (httpMethod === 'GET') {
    // For notes table, if querying by entity_id and no matches found,
    // return empty array (not 404) - this handles fallback rent record IDs
    if (table === 'notes' && filters.entity_id && data.length === 0) {
      // Check if it's a fallback ID (starts with 'fallback-')
      const entityId = filters.entity_id.startsWith('eq.')
        ? filters.entity_id.substring(3)
        : filters.entity_id

      if (entityId.startsWith('fallback-')) {
        // Return empty array for fallback IDs (they don't have notes in MOCK_NOTES)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
        return
      }
    }

    // Expand nested selects
    data = expandNestedSelect(data, select || '')

    // Handle single record requests (if ID filter present)
    if (filters.id && data.length === 1) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data[0]),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data),
      })
    }
  } else if (httpMethod === 'POST') {
    // For inserts, return the posted data with generated ID
    const insertData = postData ? JSON.parse(postData) : {}
    const newRecord = {
      id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...insertData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(Array.isArray(insertData) ? [newRecord] : newRecord),
    })
  } else if (httpMethod === 'PATCH' || httpMethod === 'PUT') {
    // For updates, return updated data
    const updateData = postData ? JSON.parse(postData) : {}
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(updateData),
    })
  } else if (httpMethod === 'DELETE') {
    await route.fulfill({
      status: 204,
      contentType: 'application/json',
      body: '',
    })
  } else {
    await route.continue()
  }
}

/**
 * Set up mock Supabase interception on a page
 */
export async function setupMockSupabase(page: Page) {
  const supabaseUrl = getSupabaseUrl(page)

  // Intercept all requests to Supabase REST API
  await page.route(`${supabaseUrl}/rest/v1/**`, async route => {
    await handleSupabaseRequest(route, route.request())
  })

  // Also intercept auth requests and return mock user
  await page.route(`${supabaseUrl}/auth/v1/user`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: MOCK_LANDLORD_ID,
        email: 'landlord@example.com',
        role: 'landlord',
      }),
    })
  })

  // Mock auth session/token endpoint
  await page.route(`${supabaseUrl}/auth/v1/token*`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: MOCK_LANDLORD_ID,
          email: 'landlord@example.com',
        },
      }),
    })
  })

  // Mock auth sign-in endpoint
  await page.route(`${supabaseUrl}/auth/v1/token?grant_type=password`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: MOCK_LANDLORD_ID,
          email: 'landlord@example.com',
        },
      }),
    })
  })
}
