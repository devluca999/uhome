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

type SupabaseQueryResult = {
  data: MaintenanceRequest[] | null
  error: Error | null
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
      let query = supabase
        .from('maintenance_requests')
        .select(
          `
          *,
          property:properties(name),
          tenant:tenants(user:users(email))
        `
        )
        .order('created_at', { ascending: false })

      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      const { data, error } = (await query) as SupabaseQueryResult

      if (error) throw error
      setRequests(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  async function updateRequestStatus(id: string, status: MaintenanceRequest['status']) {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .update({ status })
      .eq('id', id)
      .select(
        `
        *,
        property:properties(name),
        tenant:tenants(user:users(email))
      `
      )
      .single()

    if (error) throw error
    setRequests(requests.map(r => (r.id === id ? (data as MaintenanceRequest) : r)))
    return data
  }

  return {
    requests,
    loading,
    error,
    updateRequestStatus,
    refetch: fetchRequests,
  }
}
