/**
 * Property data service - abstraction layer for demo vs real data.
 * Used by useProperties hook. Returns demo data when admin is in landlord-demo mode.
 */

import { supabase } from '@/lib/supabase/client'
import { withRetry } from '@/lib/retry'
import { landlordDemoProperties } from '@/demo-data/landlordDemoData'
import type { ViewMode, DemoState } from '@/contexts/auth-context'
import type { Database } from '@/types/database'

type Property = Database['public']['Tables']['properties']['Row']

export async function getProperties(
  viewMode: ViewMode,
  demoState: DemoState
): Promise<Property[]> {
  if (viewMode === 'landlord-demo') {
    return demoState === 'empty' ? [] : [...landlordDemoProperties]
  }
  if (viewMode === 'tenant-demo') {
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
