/**
 * Lease data service - abstraction layer for demo vs real data.
 * Used by useLeases hook. Returns demo data when admin is in landlord-demo mode.
 */

import { supabase } from '@/lib/supabase/client'
import { landlordDemoLeases } from '@/demo-data/landlordDemoData'
import type { ViewMode, DemoState } from '@/contexts/auth-context'
import type { Database } from '@/types/database'

type Lease = Database['public']['Tables']['leases']['Row']

export interface LeaseFilters {
  propertyId?: string
  tenantId?: string
}

export async function getLeases(
  filters: LeaseFilters | undefined,
  viewMode: ViewMode,
  demoState: DemoState
): Promise<Lease[]> {
  if (viewMode === 'landlord-demo') {
    if (demoState === 'empty') return []
    let result = [...landlordDemoLeases]
    if (filters?.propertyId) {
      result = result.filter(l => l.property_id === filters.propertyId)
    }
    if (filters?.tenantId) {
      result = result.filter(l => l.tenant_id === filters.tenantId)
    }
    return result.sort(
      (a, b) =>
        new Date(b.lease_start_date || 0).getTime() - new Date(a.lease_start_date || 0).getTime()
    )
  }
  if (viewMode === 'tenant-demo') {
    if (demoState === 'empty') return []
    const { tenantDemoData } = await import('@/demo-data/tenantDemoData')
    const rawLeases = tenantDemoData.leases || []
    let filtered = filters?.tenantId
      ? rawLeases.filter(l => l.tenant_id === filters.tenantId)
      : rawLeases
    return filtered.map(l => ({
      id: l.id,
      property_id: l.property_id,
      unit_id: l.unit_id || '',
      tenant_id: l.tenant_id,
      status: (l.status || 'active') as 'draft' | 'active' | 'ended',
      lease_start_date: l.lease_start_date,
      lease_end_date: l.lease_end_date,
      lease_type: l.lease_type,
      rent_amount: l.rent_amount,
      rent_frequency: l.rent_frequency,
      security_deposit: l.security_deposit,
      created_at: l.created_at || new Date().toISOString(),
      updated_at: l.updated_at || new Date().toISOString(),
    })) as Lease[]
  }

  let query = supabase.from('leases').select('*').order('lease_start_date', { ascending: false })

  if (filters?.propertyId) {
    query = query.eq('property_id', filters.propertyId)
  }
  if (filters?.tenantId) {
    query = query.eq('tenant_id', filters.tenantId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}
