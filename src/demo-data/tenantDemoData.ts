/**
 * Tenant demo data for admin "View as Tenant" mode.
 * Aligned with MockTenantData / useTenantData structure.
 */

const now = new Date().toISOString()
const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
const sixMonthsFromNow = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()

const PROP_ID = '10000000-0000-0000-0000-000000000001'
const UNIT_ID = '20000000-0000-0000-0000-000000000001'
const TENANT_ID = '30000000-0000-0000-0000-000000000001'
const LEASE_ID = '40000000-0000-0000-0000-000000000001'

export interface TenantDemoData {
  tenant: {
    id: string
    property_id: string
    move_in_date: string
    lease_end_date?: string
  }
  property: {
    id: string
    name: string
    address?: string
    rent_amount: number
    rent_due_date?: number
    rules?: string
  }
  leases?: Array<{
    id: string
    property_id: string
    tenant_id: string
    unit_id?: string
    lease_start_date: string
    lease_end_date: string | null
    lease_type: 'short-term' | 'long-term'
    rent_amount: number
    rent_frequency: 'monthly' | 'weekly' | 'biweekly' | 'yearly'
    security_deposit: number | null
    status?: 'draft' | 'active' | 'ended'
    created_at?: string
    updated_at?: string
  }>
}

export const tenantDemoData: TenantDemoData = {
  tenant: {
    id: TENANT_ID,
    property_id: PROP_ID,
    move_in_date: sixMonthsAgo,
    lease_end_date: sixMonthsFromNow,
  },
  property: {
    id: PROP_ID,
    name: 'Sunrise Apartments - Unit 1A',
    address: '1234 Oak Street, Portland, OR 97201',
    rent_amount: 1450,
    rent_due_date: 1,
    rules: 'Water and trash included. Quiet hours 10 PM - 7 AM.',
  },
  leases: [
    {
      id: LEASE_ID,
      property_id: PROP_ID,
      tenant_id: TENANT_ID,
      unit_id: UNIT_ID,
      lease_start_date: sixMonthsAgo,
      lease_end_date: sixMonthsFromNow,
      lease_type: 'long-term' as const,
      rent_amount: 1450,
      rent_frequency: 'monthly' as const,
      security_deposit: 1450,
      status: 'active' as const,
      created_at: sixMonthsAgo,
      updated_at: now,
    },
  ],
}
