import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

type RentRecord = {
  id: string
  property_id: string | null
  tenant_id: string | null
  lease_id: string | null
  amount: number
  due_date: string
  status: 'pending' | 'paid' | 'overdue'
  paid_date?: string
  created_at: string
  updated_at: string
}

export function useRentRecords(leaseId?: string) {
  const [records, setRecords] = useState<RentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (leaseId) {
      fetchRecords()
    }
  }, [leaseId])

  async function fetchRecords() {
    if (!leaseId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('rent_records')
        .select('*')
        .eq('lease_id', leaseId)
        .order('due_date', { ascending: false })

      if (error) throw error
      setRecords(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return {
    records,
    loading,
    error,
    refetch: fetchRecords,
  }
}
