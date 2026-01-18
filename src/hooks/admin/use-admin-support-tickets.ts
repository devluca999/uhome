import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'

export interface SupportTicket {
  id: string
  user_id: string
  email: string
  subject: string
  message: string
  status: 'open' | 'resolved'
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
}

export function useAdminSupportTickets(statusFilter?: 'open' | 'resolved' | 'all') {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    fetchTickets()
  }, [statusFilter])

  async function fetchTickets() {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error: ticketsError } = await query

      if (ticketsError) throw ticketsError

      setTickets((data || []) as SupportTicket[])
    } catch (err) {
      console.error('Error fetching support tickets:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  async function markResolved(ticketId: string) {
    if (!user) {
      throw new Error('User not authenticated')
    }

    try {
      const { error: updateError } = await supabase
        .from('support_tickets')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', ticketId)

      if (updateError) throw updateError

      // Update local state
      setTickets(
        tickets.map(ticket =>
          ticket.id === ticketId
            ? {
                ...ticket,
                status: 'resolved' as const,
                resolved_at: new Date().toISOString(),
                resolved_by: user.id,
              }
            : ticket
        )
      )
    } catch (err) {
      console.error('Error marking ticket as resolved:', err)
      throw err
    }
  }

  return { tickets, loading, error, refetch: fetchTickets, markResolved }
}
