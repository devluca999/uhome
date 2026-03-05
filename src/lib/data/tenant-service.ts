/**
 * Tenant data service - abstraction layer for demo vs real data.
 * Used by useTenants hook. Returns demo data when admin is in landlord-demo mode.
 */

import { supabase } from '@/lib/supabase/client'
import { landlordDemoTenants } from '@/demo-data/landlordDemoData'
import type { ViewMode, DemoState } from '@/contexts/auth-context'
import type { Database } from '@/types/database'

type Tenant = Database['public']['Tables']['tenants']['Row']

export async function getTenants(viewMode: ViewMode, demoState: DemoState): Promise<Tenant[]> {
  if (viewMode === 'landlord-demo') {
    return demoState === 'empty' ? [] : [...landlordDemoTenants]
  }
  if (viewMode === 'tenant-demo') {
    return []
  }

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
