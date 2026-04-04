import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { resolveLandlordDataOwnerId } from '@/lib/landlord-data-owner-id'

export type RentRecordWithRelations = {
  id: string
  property_id: string
  tenant_id: string
  amount: number
  due_date: string
  status: 'pending' | 'paid' | 'overdue'
  paid_date?: string | null
  payment_method?: 'manual' | 'external' | null
  payment_method_type?: 'manual' | 'external' | null
  payment_method_label?: string | null
  notes?: string | null
  receipt_url?: string | null
  late_fee?: number
  created_at: string
  updated_at: string
  property?: {
    id: string
    name: string
    address?: string | null
  }
  tenant?: {
    id: string
    user?: {
      email: string
    }
  }
}

export type RentRecordFilter = {
  leaseId?: string
  propertyId?: string
  status?: 'pending' | 'paid' | 'overdue'
  dateRange?: {
    start: Date
    end: Date
  }
}

export function useLandlordRentRecords(filter?: RentRecordFilter) {
  const { user, role, viewMode, demoState } = useAuth()
  const [records, setRecords] = useState<RentRecordWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (user) {
      fetchRecords()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user,
    role,
    viewMode,
    demoState,
    filter?.leaseId,
    filter?.propertyId,
    filter?.status,
    filter?.dateRange?.start?.toISOString(),
    filter?.dateRange?.end?.toISOString(),
  ])

  async function fetchRecords() {
    if (!user) return

    try {
      setLoading(true)

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      const ownerId = await resolveLandlordDataOwnerId({
        role,
        viewMode,
        demoState,
        sessionUserId: authUser?.id,
      })
      if (!ownerId) {
        setRecords([])
        setLoading(false)
        return
      }

      // First, get all active properties owned by the landlord (or demo landlord in admin lens)
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, is_active')
        .eq('owner_id', ownerId)

      if (propertiesError) throw propertiesError
      if (!properties || properties.length === 0) {
        setRecords([])
        setLoading(false)
        return
      }

      // Filter to only active properties (is_active !== false)
      const activePropertyIds = properties.filter(p => p.is_active !== false).map(p => p.id)

      // Build query - use a simpler select to avoid RLS issues with nested JOINs
      // The tenant→users join can fail if RLS policies restrict user table access
      let query = supabase.from('rent_records').select(
        `
          *,
          property:properties(id, name, address),
          tenant:tenants(id)
        `
      )

      // Apply filters - prioritize lease_id, fallback to property_id
      if (filter?.leaseId) {
        query = query.eq('lease_id', filter.leaseId)
      } else if (filter?.propertyId) {
        // For backward compatibility, also check property_id
        query = query.eq('property_id', filter.propertyId)
      } else {
        // If no specific filter, get all records for landlord's active properties
        // RLS will handle access control
        query = query.in('property_id', activePropertyIds)
      }

      if (filter?.status) {
        query = query.eq('status', filter.status)
      }

      if (filter?.dateRange) {
        query = query
          .gte('due_date', filter.dateRange.start.toISOString().split('T')[0])
          .lte('due_date', filter.dateRange.end.toISOString().split('T')[0])
      }

      query = query.order('due_date', { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error('[useLandlordRentRecords] Query error:', JSON.stringify(error))
        throw error
      }

      if (import.meta.env.DEV) {
        console.debug(
          '[useLandlordRentRecords] Fetched records:',
          JSON.stringify({
            count: data?.length || 0,
            activePropertyIds,
            sampleRecords: data?.slice(0, 3).map(r => ({
              id: r.id,
              property_id: r.property_id,
              amount: r.amount,
              status: r.status,
              paid_date: r.paid_date,
              due_date: r.due_date,
            })),
          })
        )
      }

      setRecords(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  async function createRentRecord(data: {
    property_id: string
    tenant_id: string
    amount: number
    due_date: string
    status?: 'pending' | 'paid' | 'overdue'
    paid_date?: string | null
    payment_method_type?: 'manual' | 'external' | null
    payment_method_label?: string | null
    notes?: string | null
  }) {
    try {
      const { data: newRecord, error: createError } = await supabase
        .from('rent_records')
        .insert(data)
        .select(
          `
          *,
          property:properties(id, name, address),
          tenant:tenants(id)
        `
        )
        .single()

      if (createError) throw createError

      setRecords(prev => [newRecord as RentRecordWithRelations, ...prev])
      return { data: newRecord, error: null }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
    }
  }

  async function updateLateFee(recordId: string, lateFee: number) {
    try {
      const { data: updatedRecord, error: updateError } = await supabase
        .from('rent_records')
        .update({ late_fee: lateFee })
        .eq('id', recordId)
        .select(
          `
          *,
          property:properties(id, name, address),
          tenant:tenants(id)
        `
        )
        .single()

      if (updateError) throw updateError

      setRecords(prev =>
        prev.map(record =>
          record.id === recordId ? (updatedRecord as RentRecordWithRelations) : record
        )
      )
      return { data: updatedRecord, error: null }
    } catch (err) {
      const error = err as Error
      return { data: null, error }
    }
  }

  return {
    records,
    loading,
    error,
    refetch: fetchRecords,
    createRentRecord,
    updateLateFee,
  }
}
