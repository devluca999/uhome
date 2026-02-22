/**
 * Landlord demo data for admin "View as Landlord" mode.
 * Matches production DB schema - properties, units, tenants, leases.
 */

import type { Database } from '@/types/database'

type Property = Database['public']['Tables']['properties']['Row']
type Unit = Database['public']['Tables']['units']['Row']
type Tenant = Database['public']['Tables']['tenants']['Row']
type Lease = Database['public']['Tables']['leases']['Row']

const now = new Date().toISOString()
const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
const sixMonthsFromNow = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()

// Stable mock IDs
const DEMO_OWNER_ID = '00000000-0000-0000-0000-000000000001'
const PROP_1_ID = '10000000-0000-0000-0000-000000000001'
const PROP_2_ID = '10000000-0000-0000-0000-000000000002'
const UNIT_1A_ID = '20000000-0000-0000-0000-000000000001'
const UNIT_1B_ID = '20000000-0000-0000-0000-000000000002'
const UNIT_2A_ID = '20000000-0000-0000-0000-000000000003'
const TENANT_1_ID = '30000000-0000-0000-0000-000000000001'
const TENANT_2_ID = '30000000-0000-0000-0000-000000000002'
const TENANT_3_ID = '30000000-0000-0000-0000-000000000003'
const LEASE_1_ID = '40000000-0000-0000-0000-000000000001'
const LEASE_2_ID = '40000000-0000-0000-0000-000000000002'
const LEASE_3_ID = '40000000-0000-0000-0000-000000000003'

export const landlordDemoProperties: Property[] = [
  {
    id: PROP_1_ID,
    owner_id: DEMO_OWNER_ID,
    name: 'Sunrise Apartments',
    address: '1234 Oak Street, Portland, OR 97201',
    rent_amount: 1450,
    rent_due_date: 1,
    rules: 'Water and trash included. Quiet hours 10 PM - 7 AM.',
    property_type: 'apartment',
    rules_visible_to_tenants: true,
    is_active: true,
    late_fee_rules: { amount: 50, grace_period_days: 5, applies_after: 'grace_period_end' },
    created_at: sixMonthsAgo,
    updated_at: now,
  },
  {
    id: PROP_2_ID,
    owner_id: DEMO_OWNER_ID,
    name: 'Oak Street Residence',
    address: '5678 Elm Ave, Portland, OR 97202',
    rent_amount: 2100,
    rent_due_date: 15,
    rules: null,
    property_type: 'house',
    rules_visible_to_tenants: true,
    is_active: true,
    late_fee_rules: null,
    created_at: sixMonthsAgo,
    updated_at: now,
  },
]

export const landlordDemoUnits: Unit[] = [
  {
    id: UNIT_1A_ID,
    property_id: PROP_1_ID,
    unit_name: '1A',
    created_at: sixMonthsAgo,
    updated_at: now,
  },
  {
    id: UNIT_1B_ID,
    property_id: PROP_1_ID,
    unit_name: '3B',
    created_at: sixMonthsAgo,
    updated_at: now,
  },
  {
    id: UNIT_2A_ID,
    property_id: PROP_2_ID,
    unit_name: 'Main',
    created_at: sixMonthsAgo,
    updated_at: now,
  },
]

export const landlordDemoTenants: Tenant[] = [
  {
    id: TENANT_1_ID,
    user_id: '50000000-0000-0000-0000-000000000001',
    property_id: PROP_1_ID,
    move_in_date: sixMonthsAgo,
    lease_end_date: sixMonthsFromNow,
    phone: '(503) 555-0101',
    notes: null,
    created_at: sixMonthsAgo,
    updated_at: now,
  },
  {
    id: TENANT_2_ID,
    user_id: '50000000-0000-0000-0000-000000000002',
    property_id: PROP_1_ID,
    move_in_date: sixMonthsAgo,
    lease_end_date: sixMonthsFromNow,
    phone: null,
    notes: null,
    created_at: sixMonthsAgo,
    updated_at: now,
  },
  {
    id: TENANT_3_ID,
    user_id: '50000000-0000-0000-0000-000000000003',
    property_id: PROP_2_ID,
    move_in_date: sixMonthsAgo,
    lease_end_date: sixMonthsFromNow,
    phone: '(503) 555-0103',
    notes: 'Prefers email contact',
    created_at: sixMonthsAgo,
    updated_at: now,
  },
]

export const landlordDemoLeases: Lease[] = [
  {
    id: LEASE_1_ID,
    property_id: PROP_1_ID,
    unit_id: UNIT_1A_ID,
    tenant_id: TENANT_1_ID,
    status: 'active',
    lease_start_date: sixMonthsAgo,
    lease_end_date: sixMonthsFromNow,
    lease_type: 'long-term',
    rent_amount: 1450,
    rent_frequency: 'monthly',
    security_deposit: 1450,
    created_at: sixMonthsAgo,
    updated_at: now,
  },
  {
    id: LEASE_2_ID,
    property_id: PROP_1_ID,
    unit_id: UNIT_1B_ID,
    tenant_id: TENANT_2_ID,
    status: 'active',
    lease_start_date: sixMonthsAgo,
    lease_end_date: sixMonthsFromNow,
    lease_type: 'long-term',
    rent_amount: 1450,
    rent_frequency: 'monthly',
    security_deposit: 1450,
    created_at: sixMonthsAgo,
    updated_at: now,
  },
  {
    id: LEASE_3_ID,
    property_id: PROP_2_ID,
    unit_id: UNIT_2A_ID,
    tenant_id: TENANT_3_ID,
    status: 'active',
    lease_start_date: sixMonthsAgo,
    lease_end_date: sixMonthsFromNow,
    lease_type: 'long-term',
    rent_amount: 2100,
    rent_frequency: 'monthly',
    security_deposit: 2100,
    created_at: sixMonthsAgo,
    updated_at: now,
  },
]
