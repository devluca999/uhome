import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

type RentRecord = {
  id: string
  property_id: string
  tenant_id: string
  amount: number
  due_date: string
  status: 'pending' | 'paid' | 'overdue'
  paid_date?: string
  created_at: string
  updated_at: string
}

export function useRentRecords(tenantId?: string) {
  const [records, setRecords] = useState<RentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (tenantId) {
      fetchRecords()
    }
  }, [tenantId])

  async function fetchRecords() {
    if (!tenantId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('rent_records')
        .select('*')
        .eq('tenant_id', tenantId)
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
