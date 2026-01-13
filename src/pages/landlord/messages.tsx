import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton-loader'
import { LeaseThread } from '@/components/messages/lease-thread'
import { useLeases } from '@/hooks/use-leases'
import { useProperties } from '@/hooks/use-properties'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase/client'
import { MessageSquare, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Lease = Database['public']['Tables']['leases']['Row']
type Message = Database['public']['Tables']['messages']['Row']

type LeaseWithLastMessage = Lease & {
  property?: {
    name: string
    address?: string | null
  }
  tenant?: {
    id: string
    user?: {
      email: string | null
    }
  }
  lastMessage?: Message & {
    sender?: {
      email: string | null
    }
  }
  unreadCount?: number
}

type PropertyWithLeases = {
  property: {
    id: string
    name: string
    address?: string | null
  }
  leases: LeaseWithLastMessage[]
}

export function LandlordMessages() {
  const { leaseId } = useParams<{ leaseId?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { properties } = useProperties()
  const [propertiesWithLeases, setPropertiesWithLeases] = useState<PropertyWithLeases[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch all leases for landlord's properties
  useEffect(() => {
    async function fetchLeasesWithMessages() {
      if (!properties || properties.length === 0) {
        setPropertiesWithLeases([])
        setLoading(false)
        return
      }

      setLoading(true)

      // Fetch leases for all properties (landlords see all: draft, active, ended)
      const propertyIds = properties.map(p => p.id)
      const { data: allLeases } = await supabase
        .from('leases')
        .select('*')
        .in('property_id', propertyIds)
        .order('lease_start_date', { ascending: false })

      if (!allLeases || allLeases.length === 0) {
        setPropertiesWithLeases([])
        setLoading(false)
        return
      }

      // Batch fetch all tenants
      const tenantIds = [...new Set(allLeases.map(l => l.tenant_id))]
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, user_id')
        .in('id', tenantIds)
      
      const tenantMap = new Map(tenants?.map(t => [t.id, t]) || [])
      
      // Batch fetch all users (for tenants and message senders)
      const tenantUserIds = [...new Set(tenants?.map(t => t.user_id).filter(Boolean) || [])]
      
      // Batch fetch last messages for all leases
      const leaseIds = allLeases.map(l => l.id)
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
      
      // Batch fetch all message sender users
      const senderIds = [...new Set(allMessages?.map(m => m.sender_id).filter(Boolean) || [])]
      const allUserIds = [...new Set([...tenantUserIds, ...senderIds])]
      
      const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .in('id', allUserIds)
      
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
      const leasesWithData = allLeases.map(lease => {
        const property = properties.find(p => p.id === lease.property_id)
        const tenantData = tenantMap.get(lease.tenant_id)
        const tenantUser = tenantData?.user_id ? userMap.get(tenantData.user_id) : undefined
        
        const lastMessageData = messagesByLease.get(lease.id)
        const lastMessage = lastMessageData && lastMessageData.sender_id
          ? {
              ...lastMessageData,
              sender: userMap.get(lastMessageData.sender_id),
            }
          : lastMessageData
        
        return {
          ...lease,
          property: property
            ? {
                name: property.name,
                address: property.address || null,
              }
            : undefined,
          tenant: tenantData
            ? {
                id: tenantData.id,
                user: tenantUser ? { email: tenantUser.email } : undefined,
              }
            : undefined,
          lastMessage,
          unreadCount: notificationCounts.get(lease.id) || 0,
        }
      })

      // Sort leases by last message date (most recent first)
      leasesWithData.sort((a, b) => {
        const aDate = a.lastMessage?.created_at || a.created_at
        const bDate = b.lastMessage?.created_at || b.created_at
        return new Date(bDate).getTime() - new Date(aDate).getTime()
      })

      // Group by property
      const grouped = leasesWithData.reduce((acc, lease) => {
        const propertyId = lease.property_id
        const property = properties.find(p => p.id === propertyId)
        if (!property) return acc

        const existingGroup = acc.find(g => g.property.id === propertyId)
        if (existingGroup) {
          existingGroup.leases.push(lease)
        } else {
          acc.push({
            property: {
              id: property.id,
              name: property.name,
              address: property.address || null,
            },
            leases: [lease],
          })
        }
        return acc
      }, [] as PropertyWithLeases[])

      // Sort properties by most recent lease activity
      grouped.sort((a, b) => {
        const aLatest = a.leases[0]?.lastMessage?.created_at || a.leases[0]?.created_at
        const bLatest = b.leases[0]?.lastMessage?.created_at || b.leases[0]?.created_at
        return new Date(bLatest || 0).getTime() - new Date(aLatest || 0).getTime()
      })

      setPropertiesWithLeases(grouped)
      setLoading(false)
    }

    if (properties && properties.length > 0 && user) {
      fetchLeasesWithMessages()
    }
  }, [properties, user])

  const selectedLeaseId = leaseId || searchParams.get('leaseId')
  const selectedLease = propertiesWithLeases
    .flatMap(g => g.leases)
    .find(l => l.id === selectedLeaseId)
  // Lease is active if status is active or draft (with tenant_id), and not ended
  const isLeaseActive =
    selectedLease &&
    selectedLease.status !== 'ended' &&
    (selectedLease.status === 'active' ||
      (selectedLease.status === 'draft' && selectedLease.tenant_id))
  const defaultIntent =
    (searchParams.get('intent') as 'general' | 'maintenance' | 'billing' | 'notice') || 'general'

  if (loading) {
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
  if (!propertiesWithLeases || propertiesWithLeases.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 relative">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10">
          <EmptyState
            icon={<MessageSquare className="h-12 w-12" />}
            title="No leases yet"
            description="Invite a tenant to start a household conversation. They'll be able to message you and access lease information."
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
            <Button variant="ghost" onClick={() => navigate('/landlord/messages')} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Messages
            </Button>
            <div>
              <h1 className="text-3xl font-semibold text-foreground">
                {selectedLease.property?.name || 'Lease Messages'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {selectedLease.tenant?.user?.email || 'Tenant'} •{' '}
                {selectedLease.property?.address || ''}
              </p>
            </div>
          </div>
          <LeaseThread
            leaseId={selectedLeaseId}
            isLeaseActive={!!isLeaseActive}
            defaultIntent={defaultIntent}
            showStatusSelector={true}
            emptyStateTitle="No messages yet"
            emptyStateDescription="Start the conversation with your tenant."
          />
        </div>
      </div>
    )
  }

  // Show leases grouped by property
  return (
    <div className="container mx-auto px-4 py-8 relative">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-1">Lease conversations organized by property</p>
        </div>

        <div className="space-y-6">
          {propertiesWithLeases.map(propertyGroup => (
            <div key={propertyGroup.property.id}>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                {propertyGroup.property.name}
                {propertyGroup.property.address && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    {propertyGroup.property.address}
                  </span>
                )}
              </h2>
              <div className="space-y-4">
                {propertyGroup.leases.map(lease => {
                  const isActive =
                    lease.status === 'active' || (lease.status === 'draft' && lease.tenant_id)
                  const statusLabel =
                    lease.status === 'draft'
                      ? 'Draft'
                      : lease.status === 'active'
                        ? 'Active'
                        : 'Ended'
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
                      className={cn(
                        'glass-card cursor-pointer hover:bg-muted/50 transition-colors',
                        lease.status === 'ended' && 'opacity-75'
                      )}
                      onClick={() => navigate(`/landlord/messages/${lease.id}`)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {lease.tenant?.user?.email || 'Tenant'}
                              {lease.unreadCount && lease.unreadCount > 0 && (
                                <Badge variant="default" className="ml-2">
                                  {lease.unreadCount}
                                </Badge>
                              )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {lease.lease_start_date
                                ? `Lease started ${new Date(lease.lease_start_date).toLocaleDateString()}`
                                : 'Draft lease'}
                            </p>
                          </div>
                          <Badge
                            variant={
                              lease.status === 'ended'
                                ? 'secondary'
                                : isActive
                                  ? 'default'
                                  : 'outline'
                            }
                          >
                            {statusLabel}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm text-foreground line-clamp-2">
                            {lastMessagePreview}
                          </p>
                          <p className="text-xs text-muted-foreground">{lastMessageDate}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
