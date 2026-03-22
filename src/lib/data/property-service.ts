/**
 * Property data service - abstraction layer for demo vs real data.
 * Used by useProperties hook. Returns demo data when admin is in landlord-demo mode.
 */

import { supabase } from '@/lib/supabase/client'
import { withRetry } from '@/lib/retry'
import type { ViewMode, DemoState } from '@/contexts/auth-context'
import type { Database } from '@/types/database'

type Property = Database['public']['Tables']['properties']['Row']

export async function getProperties(viewMode: ViewMode, demoState: DemoState): Promise<Property[]> {
  // In demo modes, always fetch real data from DB so property IDs are valid.
  // landlordDemoProperties has fake IDs that break property-detail navigation.
  if (viewMode === 'tenant-demo') {
    return []
  }
  // landlord-demo: return empty when demoState='empty', otherwise fall through to real DB query
  if (viewMode === 'landlord-demo' && demoState === 'empty') {
    return []
  }
  const { data, error } = await withRetry(async () => {
    const res = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })
    return res
  })
  if (error) throw error
  return data || []
}
