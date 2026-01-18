import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton-loader'
import { LeaseThread } from '@/components/messages/lease-thread'
import { useLeases } from '@/hooks/use-leases'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase/client'
import { MessageSquare, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Badge } from '@/components/ui/badge'
import type { Database } from '@/types/database'

type Lease = Database['public']['Tables']['leases']['Row']
type Message = Database['public']['Tables']['messages']['Row']

type LeaseWithLastMessage = Lease & {
  property?: {
    name: string
    address?: string | null
  }
  lastMessage?: Message & {
    sender?: {
      email: string | null
    }
  }
  unreadCount?: number
}

export function TenantMessages() {
  const { leaseId } = useParams<{ leaseId?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [leasesWithMessages, setLeasesWithMessages] = useState<LeaseWithLastMessage[]>([])
  const [loading, setLoading] = useState(true)

  // Get tenant ID from user
  useEffect(() => {
    async function fetchTenantId() {
      if (!user) return
      const { data } = await supabase.from('tenants').select('id').eq('user_id', user.id).single()
      if (data) {
        setTenantId(data.id)
      }
    }
    fetchTenantId()
  }, [user])

  const { leases: allLeases, loading: leasesLoading } = useLeases(undefined, tenantId || undefined)

  // Filter leases: tenants only see draft (if tenant_id set) and active leases
  const leases = useMemo(() => 
    allLeases?.filter(lease => {
      if (lease.status === 'ended') return false
      if (lease.status === 'draft' && !lease.tenant_id) return false // Draft without tenant_id means not accepted yet
      return true
    }) || []
  , [allLeases])
  
  // Check if tenant has no tenant record (not invited yet)
  const hasNoTenantRecord = !tenantId && !loading && !leasesLoading

  // Fetch last message and unread count for each lease
  useEffect(() => {
    async function fetchLeasesWithMessages() {
      if (!leases || leases.length === 0) {
        setLeasesWithMessages([])
        setLoading(false)
        return
      }

      setLoading(true)
      
      // Batch fetch all properties at once
      const propertyIds = [...new Set(leases.map(l => l.property_id))]
      const { data: properties } = await supabase
        .from('properties')
        .select('id, name, address')
        .in('id', propertyIds)
      
      const propertyMap = new Map(properties?.map(p => [p.id, p]) || [])
      
      // Batch fetch last messages for all leases
      const leaseIds = leases.map(l => l.id)
      const { data: allMessages } = await supabase
        .from('messages')
        .select('*')
        .in('lease_id', leaseIds)
        .is('soft_deleted_at', null)
        .order('created_at', { ascending: false })
      
      // Group messages by lease and get the most recent
      const messagesByLease = new Map<string, typeof allMessages[0]>()
      allMessages?.forEach(msg => {
        if (!messagesByLease.has(msg.lease_id)) {
          messagesByLease.set(msg.lease_id, msg)
        }
      })
      
      // Batch fetch user data for all message senders
      const senderIds = [...new Set(allMessages?.map(m => m.sender_id).filter(Boolean) || [])]
      const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .in('id', senderIds)
      
      const userMap = new Map(users?.map(u => [u.id, u]) || [])
      
      // Batch fetch unread notifications for all leases
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id, lease_id')
        .in('lease_id', leaseIds)
        .eq('user_id', user?.id)
        .eq('read', false)
      
      // Count notifications by lease
      const notificationCounts = new Map<string, number>()
      notifications?.forEach(n => {
        notificationCounts.set(n.lease_id, (notificationCounts.get(n.lease_id) || 0) + 1)
      })
      
      // Combine all data
      const leasesWithData = leases.map(lease => {
        const lastMessageData = messagesByLease.get(lease.id)
        const lastMessage = lastMessageData && lastMessageData.sender_id
          ? {
              ...lastMessageData,
              sender: userMap.get(lastMessageData.sender_id),
            }
          : lastMessageData
        
        return {
          ...lease,
          property: propertyMap.get(lease.property_id),
          lastMessage,
          unreadCount: notificationCounts.get(lease.id) || 0,
        }
      })

      // Sort by last message date (most recent first)
      leasesWithData.sort((a, b) => {
        const aDate = a.lastMessage?.created_at || a.created_at
        const bDate = b.lastMessage?.created_at || b.created_at
        return new Date(bDate).getTime() - new Date(aDate).getTime()
      })

      setLeasesWithMessages(leasesWithData)
      setLoading(false)
    }

    if (leases && !leasesLoading && tenantId) {
      fetchLeasesWithMessages()
    }
  }, [leases, leasesLoading, tenantId, user])

  const selectedLeaseId = leaseId || searchParams.get('leaseId')
  const selectedLease = leasesWithMessages.find(l => l.id === selectedLeaseId)
  // Lease is active if status is active or draft (with tenant_id), and not ended
  const isLeaseActive =
    selectedLease &&
    selectedLease.status !== 'ended' &&
    (selectedLease.status === 'active' ||
      (selectedLease.status === 'draft' && selectedLease.tenant_id))
  const defaultIntent =
    (searchParams.get('intent') as 'general' | 'maintenance' | 'billing' | 'notice') || 'general'

  if (loading || leasesLoading) {
    return (
      <div className="container mx-auto px-4 py-8 relative">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10">
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    )
  }

  // If no leases, show empty state
  if (!leases || leases.length === 0) {
    // Different empty states based on tenant status
    const emptyStateTitle = hasNoTenantRecord 
      ? "Not yet invited"
      : allLeases && allLeases.length > 0
      ? "No active leases"
      : "No leases yet"
    
    const emptyStateDescription = hasNoTenantRecord
      ? "You haven't been invited to any property yet. Your landlord will send you an invitation to join your lease, and you'll be able to message them here."
      : allLeases && allLeases.length > 0
      ? "Your lease has ended or is not yet active. Messaging is only available for active leases."
      : "Messaging starts once your landlord invites you to your lease. You'll be able to send and receive messages here."
    
    return (
      <div className="container mx-auto px-4 py-8 relative">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10">
          <EmptyState
            icon={<MessageSquare className="h-12 w-12" />}
            title={emptyStateTitle}
            description={emptyStateDescription}
          />
        </div>
      </div>
    )
  }

  // If lease selected, show thread view
  if (selectedLeaseId && selectedLease) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl relative">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate('/tenant/messages')} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Messages
            </Button>
            <div>
              <h1 className="text-3xl font-semibold text-foreground">
                {selectedLease.property?.name || 'Lease Messages'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {selectedLease.property?.address || 'Lease conversation'}
              </p>
            </div>
          </div>
          <LeaseThread
            leaseId={selectedLeaseId}
            isLeaseActive={!!isLeaseActive}
            defaultIntent={defaultIntent}
            showStatusSelector={false}
            emptyStateTitle="No messages yet"
            emptyStateDescription="Start the conversation with your landlord."
          />
        </div>
      </div>
    )
  }

  // Show lease list
  return (
    <div className="container mx-auto px-4 py-8 relative">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-1">Your lease conversations</p>
        </div>

        <div className="space-y-4">
          {leasesWithMessages.map(lease => {
            const isActive =
              lease.status === 'active' || (lease.status === 'draft' && lease.tenant_id)
            const statusLabel =
              lease.status === 'draft' ? 'Draft' : lease.status === 'active' ? 'Active' : 'Ended'
            const lastMessageDate = lease.lastMessage
              ? new Date(lease.lastMessage.created_at).toLocaleDateString()
              : new Date(lease.created_at).toLocaleDateString()
            const lastMessagePreview = lease.lastMessage
              ? lease.lastMessage.body.substring(0, 60) +
                (lease.lastMessage.body.length > 60 ? '...' : '')
              : 'No messages yet'

            return (
              <Card
                key={lease.id}
                className="glass-card cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/tenant/messages/${lease.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {lease.property?.name || 'Lease'}
                        {lease.unreadCount && lease.unreadCount > 0 && (
                          <Badge variant="default" className="ml-2">
                            {lease.unreadCount}
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {lease.property?.address || 'No address'}
                      </p>
                    </div>
                    <Badge variant={isActive ? 'default' : 'secondary'}>{statusLabel}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-foreground line-clamp-2">{lastMessagePreview}</p>
                    <p className="text-xs text-muted-foreground">{lastMessageDate}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
