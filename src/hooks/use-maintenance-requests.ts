import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

type MaintenanceRequest = {
  id: string
  property_id: string
  tenant_id: string
  status: 'pending' | 'in_progress' | 'completed'
  category?: string
  description: string
  created_at: string
  updated_at: string
  property?: {
    name: string
  }
  tenant?: {
    user?: {
      email: string
    }
  }
}

export function useMaintenanceRequests(propertyId?: string) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchRequests()
  }, [propertyId])

  async function fetchRequests() {
    try {
      setLoading(true)

      // Try nested query first, fallback to separate queries if it fails
      let query = supabase
        .from('maintenance_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      const { data, error } = await query

      if (error) throw error

      // Fetch related data separately to avoid nested FK issues
      const requestsWithRelations = await Promise.all(
        (data || []).map(async (request: any) => {
          const [propertyData, tenantData] = await Promise.all([
            supabase.from('properties').select('name').eq('id', request.property_id).single(),
            supabase.from('tenants').select('user_id').eq('id', request.tenant_id).single(),
          ])

          let userEmail = null
          if (tenantData.data?.user_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('email')
              .eq('id', tenantData.data.user_id)
              .single()
            userEmail = userData?.email
          }

          return {
            ...request,
            property: propertyData.data || undefined,
            tenant: tenantData.data
              ? {
                  user: userEmail ? { email: userEmail } : undefined,
                }
              : undefined,
          }
        })
      )

      setRequests(requestsWithRelations)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching maintenance requests:', err)
    } finally {
      setLoading(false)
    }
  }

  async function updateRequestStatus(id: string, status: MaintenanceRequest['status']) {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    // Fetch related data
    const [propertyData, tenantData] = await Promise.all([
      supabase.from('properties').select('name').eq('id', data.property_id).single(),
      supabase.from('tenants').select('user_id').eq('id', data.tenant_id).single(),
    ])

    let userEmail = null
    if (tenantData.data?.user_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', tenantData.data.user_id)
        .single()
      userEmail = userData?.email
    }

    const updatedRequest: MaintenanceRequest = {
      ...data,
      property: propertyData.data || undefined,
      tenant: tenantData.data
        ? {
            user: userEmail ? { email: userEmail } : undefined,
          }
        : undefined,
    }

    setRequests(requests.map(r => (r.id === id ? updatedRequest : r)))
    return updatedRequest
  }

  return {
    requests,
    loading,
    error,
    updateRequestStatus,
    refetch: fetchRequests,
  }
}
