/**
 * Tenant data service - abstraction layer for demo vs real data.
 * Used by useTenants hook. Landlord workspace tenants are always scoped to the owner's properties.
 */

import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type TenantRow = Database['public']['Tables']['tenants']['Row']

export type TenantWithRelations = TenantRow & {
  user?: { email: string; role: string }
  property?: { name: string; address?: string | null }
}

/**
 * Tenants linked to properties owned by `ownerId` (for Finances/Dashboard parity with rent records).
 */
export async function fetchTenantsForOwner(ownerId: string): Promise<TenantWithRelations[]> {
  const { data: owned, error: propError } = await supabase
    .from('properties')
    .select('id')
    .eq('owner_id', ownerId)

  if (propError) throw propError
  const propertyIds = (owned ?? []).map(p => p.id)
  if (propertyIds.length === 0) {
    return []
  }

  const { data, error: fetchError } = await supabase
    .from('tenants')
    .select(
      `
          *,
          users!tenants_user_id_fkey(email, role),
          properties!tenants_property_id_fkey(name, address)
        `
    )
    .in('property_id', propertyIds)
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.warn('Nested query failed, trying simple query:', fetchError)
    const { data: simpleData, error: simpleError } = await supabase
      .from('tenants')
      .select('*')
      .in('property_id', propertyIds)
      .order('created_at', { ascending: false })
    if (simpleError) throw simpleError
    const tenantsWithRelations = await Promise.all(
      (simpleData || []).map(async tenant => {
        const [userData, propertyData] = await Promise.all([
          supabase.from('users').select('email, role').eq('id', tenant.user_id).single(),
          tenant.property_id
            ? supabase
                .from('properties')
                .select('name, address')
                .eq('id', tenant.property_id)
                .single()
            : Promise.resolve({ data: null }),
        ])
        return {
          ...tenant,
          user: userData.data || undefined,
          property: propertyData.data || undefined,
        } as TenantWithRelations
      })
    )
    return tenantsWithRelations
  }

  const mappedData = (data || []).map((item: any) => ({
    ...item,
    user: item.users,
    property: item.properties,
  })) as TenantWithRelations[]

  return mappedData
}
