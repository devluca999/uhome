/**
 * Tenant-scoped data service for useTenantData hook.
 * Returns demo tenant data when admin is in tenant-demo mode.
 */

import { supabase } from '@/lib/supabase/client'
import { tenantDemoData } from '@/demo-data/tenantDemoData'
import type { ViewMode, DemoState } from '@/contexts/auth-context'

export interface TenantData {
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
    lease_start_date: string
    lease_end_date: string | null
    lease_type: 'short-term' | 'long-term'
    rent_amount: number
    rent_frequency: 'monthly' | 'weekly' | 'biweekly' | 'yearly'
    security_deposit: number | null
  }>
}

export async function getTenantData(
  userId: string,
  viewMode: ViewMode,
  demoState: DemoState
): Promise<TenantData | null> {
  if (viewMode === 'tenant-demo') {
    return demoState === 'empty' ? null : { ...tenantDemoData }
  }

  const { data: tenantData, error: tenantError } = await supabase
    .from('tenants')
    .select(
      `
      id,
      property_id,
      move_in_date,
      lease_end_date,
      properties(*)
    `
    )
    .eq('user_id', userId)
    .single()

  if (tenantError || !tenantData) {
    return null
  }

  const property = tenantData.properties as unknown as TenantData['property']
  if (!property) return null

  const { data: leases } = await supabase
    .from('leases')
    .select('*')
    .eq('tenant_id', tenantData.id)
    .order('lease_start_date', { ascending: false })

  return {
    tenant: {
      id: tenantData.id,
      property_id: tenantData.property_id,
      move_in_date: tenantData.move_in_date,
      lease_end_date: tenantData.lease_end_date ?? undefined,
    },
    property: {
      id: property.id,
      name: property.name,
      address: property.address ?? undefined,
      rent_amount: property.rent_amount,
      rent_due_date: property.rent_due_date ?? undefined,
      rules: property.rules ?? undefined,
    },
    leases: (leases || []).map(l => ({
      id: l.id,
      property_id: l.property_id,
      tenant_id: l.tenant_id,
      lease_start_date: l.lease_start_date,
      lease_end_date: l.lease_end_date,
      lease_type: l.lease_type,
      rent_amount: l.rent_amount ?? 0,
      rent_frequency: l.rent_frequency,
      security_deposit: l.security_deposit,
    })),
  }
}
