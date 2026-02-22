/**
 * Unit data service - abstraction layer for demo vs real data.
 * Used by useUnits hook. Returns demo data when admin is in landlord-demo mode.
 */

import { supabase } from '@/lib/supabase/client'
import { landlordDemoUnits } from '@/demo-data/landlordDemoData'
import type { ViewMode, DemoState } from '@/contexts/auth-context'
import type { Database } from '@/types/database'

type Unit = Database['public']['Tables']['units']['Row']

export async function getUnits(
  propertyId: string | undefined,
  viewMode: ViewMode,
  demoState: DemoState
): Promise<Unit[]> {
  if (viewMode === 'landlord-demo') {
    if (demoState === 'empty' || !propertyId) return []
    return landlordDemoUnits.filter(u => u.property_id === propertyId)
  }
  if (viewMode === 'tenant-demo') {
    return []
  }
  if (!propertyId) return []

  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('property_id', propertyId)
    .order('unit_name', { ascending: true })

  if (error) throw error
  return data || []
}
