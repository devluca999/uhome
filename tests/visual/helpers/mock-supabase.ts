/**
 * Playwright Network Interception for Mock Supabase Data
 *
 * Intercepts Supabase REST + auth so E2E can run without a live database.
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
  MOCK_LEASES,
  MOCK_ORGANIZATION_MEMBERS,
  MOCK_SUBSCRIPTIONS,
} from './mock-data'

export type MockSessionRole = 'landlord' | 'tenant' | 'admin'

const RESERVED_PARAMS = new Set(['select', 'order', 'limit', 'offset'])

function getSupabaseUrl(page: Page): string {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
  return supabaseUrl.replace(/\/$/, '')
}

function parseSupabaseRequest(url: string, method: string, postData?: string | null) {
  const urlObj = new URL(url)
  const pathParts = urlObj.pathname.split('/').filter(Boolean)
  const restIndex = pathParts.indexOf('rest')
  if (restIndex === -1 || pathParts[restIndex + 1] !== 'v1') {
    return null
  }

  const table = pathParts[restIndex + 2]
  const select = urlObj.searchParams.get('select')
  const filters: Record<string, string> = {}

  urlObj.searchParams.forEach((value, key) => {
    if (RESERVED_PARAMS.has(key)) return
    filters[key] = value
  })

  return { table, method, select, filters, postData }
}

function filterData(data: any[], filters: Record<string, string>): any[] {
  let filtered = [...data]

  for (const [key, value] of Object.entries(filters)) {
    if (key === 'or') continue
    if (key.includes('.')) continue

    filtered = filtered.filter(item => {
      if (value === 'is.null') {
        return item[key] == null
      }
      if (value.startsWith('eq.')) {
        return String(item[key]) === value.substring(3)
      }
      if (value.startsWith('in.')) {
        const inner = value.substring(3)
        const list = inner.startsWith('(') && inner.endsWith(')')
          ? inner.slice(1, -1).split(',')
          : inner.split(',')
        return list.includes(String(item[key]))
      }
      if (value.startsWith('gte.')) {
        const v = value.substring(4)
        const av = item[key]
        if (typeof av === 'string' && typeof v === 'string') return av >= v
        return Number(av) >= Number(v)
      }
      if (value.startsWith('lte.')) {
        const v = value.substring(4)
        const av = item[key]
        if (typeof av === 'string' && typeof v === 'string') return av <= v
        return Number(av) <= Number(v)
      }
      if (key.endsWith('.eq')) {
        const field = key.replace('.eq', '')
        return item[field] === value
      }
      return String(item[key]) === String(value)
    })
  }

  return filtered
}

function applyOrFilter(table: string, data: any[], orParam: string | undefined): any[] {
  if (!orParam || table !== 'users') return data
  // Suspended tab: account_status in suspended,banned,locked
  if (
    orParam.includes('account_status.eq.suspended') &&
    orParam.includes('account_status.eq.banned')
  ) {
    return data.filter(u =>
      ['suspended', 'banned', 'locked'].includes(String(u.account_status || ''))
    )
  }
  return data
}

function expandNestedSelect(data: any[], select: string): any[] {
  if (!select || !data.length) return data

  return data.map(item => {
    const expanded: any = { ...item }

    if (select.includes('property:properties')) {
      const propertyId = item.property_id
      const property = MOCK_PROPERTIES.find(p => p.id === propertyId)
      if (property) expanded.property = property
    }

    if (select.includes('unit:units')) {
      const uid = item.unit_id
      expanded.unit = uid
        ? { id: uid, unit_number: '1', unit_name: 'Unit', created_at: item.created_at }
        : null
    }

    if (select.includes('users!')) {
      const userId = item.user_id
      const user = MOCK_USERS.find(u => u.id === userId)
      if (user) {
        expanded.user = user
        expanded.users = user
      }
    }

    return expanded
  })
}

function getMockDataForTable(table: string): any[] {
  switch (table) {
    case 'users':
      return MOCK_USERS
    case 'properties':
      return MOCK_PROPERTIES
    case 'tenants':
      return MOCK_TENANTS
    case 'leases':
      return MOCK_LEASES
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
    case 'organization_members':
      return MOCK_ORGANIZATION_MEMBERS
    case 'subscriptions':
      return MOCK_SUBSCRIPTIONS
    case 'compliance_audit_log':
    case 'support_tickets':
    case 'admin_metrics':
    case 'admin_security_logs':
    case 'messages':
      return []
    case 'units':
    case 'property_groups':
    case 'property_group_assignments':
      return []
    default:
      return []
  }
}

function parseRangeHeader(rangeHeader: string | undefined): { start: number; end: number } | null {
  if (!rangeHeader) return null
  const m = rangeHeader.match(/^(\d+)-(\d+)$/)
  if (!m) return null
  return { start: parseInt(m[1], 10), end: parseInt(m[2], 10) }
}

function authUserJson(id: string, email: string) {
  const now = new Date().toISOString()
  return {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: now,
    phone: '',
    confirmed_at: now,
    last_sign_in_at: now,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: now,
    updated_at: now,
  }
}

export interface SetupMockSupabaseOptions {
  /** Email matching an entry in MOCK_USERS for password grant + /user */
  sessionEmail?: string
}

/**
 * Set up mock Supabase interception on a page.
 */
export async function setupMockSupabase(page: Page, options: SetupMockSupabaseOptions = {}) {
  const supabaseUrl = getSupabaseUrl(page)

  let sessionProfile = MOCK_USERS.find(
    u => u.email === (options.sessionEmail || 'landlord@example.com')
  ) || MOCK_USERS[0]

  await page.route(`${supabaseUrl}/rest/v1/**`, async route => {
    await handleSupabaseRequest(route, route.request())
  })

  await page.route(`${supabaseUrl}/auth/v1/user`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(authUserJson(sessionProfile.id, sessionProfile.email || '')),
    })
  })

  await page.route(`${supabaseUrl}/auth/v1/logout**`, async route => {
    await route.fulfill({ status: 204, body: '' })
  })

  await page.route(`${supabaseUrl}/auth/v1/revoke**`, async route => {
    await route.fulfill({ status: 204, body: '' })
  })

  await page.route(`${supabaseUrl}/auth/v1/token*`, async route => {
    const req = route.request()
    if (req.method() !== 'POST') {
      await route.continue()
      return
    }

    try {
      const bodyText = req.postData() || ''
      const headers = req.headers()
      let body: Record<string, string> = {}
      const ct = (headers['content-type'] || '').toLowerCase()
      if (ct.includes('application/json')) {
        body = bodyText ? JSON.parse(bodyText) : {}
      } else {
        const params = new URLSearchParams(bodyText)
        params.forEach((v, k) => {
          body[k] = v
        })
      }
      const email = String(body.email || '').toLowerCase()
      const matched = MOCK_USERS.find(u => (u.email || '').toLowerCase() === email)
      if (matched) {
        sessionProfile = matched
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: authUserJson(sessionProfile.id, sessionProfile.email || ''),
        }),
      })
    } catch {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'mock_auth_parse_error' }),
      })
    }
  })
}

async function handleSupabaseRequest(route: Route, request: any) {
  const url = request.url()
  const method = request.method()
  const postData = request.postData()

  const parsed = parseSupabaseRequest(url, method, postData)
  if (!parsed) {
    await route.continue()
    return
  }

  const { table, method: httpMethod, select, filters } = parsed
  const prefer = String(request.headers()['prefer'] || '')
  const wantsCount = prefer.includes('count=exact')
  const range = parseRangeHeader(request.headers()['range'])
  const accept = String(request.headers()['accept'] || '')
  const wantsObject = accept.includes('application/vnd.pgrst.object+json')

  let data = getMockDataForTable(table)
  const orParam = filters.or
  const filterNoOr = { ...filters }
  delete filterNoOr.or

  if (Object.keys(filterNoOr).length > 0) {
    data = filterData(data, filterNoOr)
  }
  data = applyOrFilter(table, data, orParam)

  if (
    data.length === 0 &&
    [
      'units',
      'property_groups',
      'property_group_assignments',
      'compliance_audit_log',
      'support_tickets',
      'admin_metrics',
      'admin_security_logs',
      'messages',
    ].includes(table)
  ) {
    const total = 0
    if (httpMethod === 'HEAD' || (httpMethod === 'GET' && wantsCount)) {
      await route.fulfill({
        status: 200,
        headers: {
          'content-type': 'application/json',
          'content-range': `*/${total}`,
        },
        body: httpMethod === 'HEAD' ? '' : '[]',
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
    return
  }

  if (httpMethod === 'HEAD') {
    const total = data.length
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/json',
        'content-range': `*/${total}`,
      },
      body: '',
    })
    return
  }

  if (httpMethod === 'GET') {
    if (table === 'notes' && filters.entity_id && data.length === 0) {
      const entityId = filters.entity_id.startsWith('eq.')
        ? filters.entity_id.substring(3)
        : filters.entity_id
      if (entityId.startsWith('fallback-')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
        return
      }
    }

    let expanded = expandNestedSelect(data, select || '')
    if (table === 'leases' && (select || '').includes('properties!')) {
      expanded = expanded.map((lease: any) => ({
        ...lease,
        properties:
          MOCK_PROPERTIES.find((p: any) => p.id === lease.property_id) || null,
      }))
    }
    let slice = expanded
    if (range) {
      slice = expanded.slice(range.start, range.end + 1)
    }

    const total = expanded.length
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    }
    if (wantsCount) {
      const end = slice.length ? range ? range.end : slice.length - 1 : 0
      const start = slice.length ? range ? range.start : 0 : 0
      headers['content-range'] = `${start}-${end}/${total}`
    }

    if (wantsObject) {
      const bodyJson = slice.length === 0 ? 'null' : JSON.stringify(slice[0])
      await route.fulfill({
        status: 200,
        headers,
        body: bodyJson,
      })
      return
    }

    if (filterNoOr.id && slice.length === 1) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify(slice[0]),
      })
      return
    }

    await route.fulfill({
      status: 200,
      headers,
      body: JSON.stringify(slice),
    })
    return
  }

  if (httpMethod === 'POST') {
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
    return
  }

  if (httpMethod === 'PATCH' || httpMethod === 'PUT') {
    const updateData = postData ? JSON.parse(postData) : {}
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(updateData),
    })
    return
  }

  if (httpMethod === 'DELETE') {
    await route.fulfill({
      status: 204,
      contentType: 'application/json',
      body: '',
    })
    return
  }

  await route.continue()
}
