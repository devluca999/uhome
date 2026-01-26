import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton-loader'
import { LeaseThread } from '@/components/messages/lease-thread'
import { useProperties } from '@/hooks/use-properties'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase/client'
import { MessageSquare, ArrowLeft, Building, Home, Users, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Lease = Database['public']['Tables']['leases']['Row']
type Unit = Database['public']['Tables']['units']['Row']
type Message = Database['public']['Tables']['messages']['Row']

type LeaseWithLastMessage = Lease & {
  unit?: Unit
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

type UnitWithLeases = {
  unit: Unit & {
    property?: {
      name: string
      address?: string | null
    }
  }
  leases: LeaseWithLastMessage[]
}

type PropertyWithUnits = {
  property: {
    id: string
    name: string
    address?: string | null
  }
  units: UnitWithLeases[]
}

export function LandlordMessages() {
  const { leaseId } = useParams<{ leaseId?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { properties } = useProperties()
  const [propertiesWithUnits, setPropertiesWithUnits] = useState<PropertyWithUnits[]>([])
  const [loading, setLoading] = useState(true)

  // Filter and sort states
  const [searchQuery, setSearchQuery] = useState('')
  const [propertyFilter, setPropertyFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'ended'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'unread' | 'property' | 'tenant'>('recent')

  // Fetch all units and leases for landlord's properties
  useEffect(() => {
    async function fetchUnitsAndLeases() {
      if (!properties || properties.length === 0) {
        setPropertiesWithUnits([])
        setLoading(false)
        return
      }

      setLoading(true)

      // Fetch all units for landlord's properties
      const propertyIds = properties.map(p => p.id)
      const { data: allUnits } = await supabase
        .from('units')
        .select('*')
        .in('property_id', propertyIds)
        .order('unit_name')

      if (!allUnits || allUnits.length === 0) {
        setPropertiesWithUnits([])
        setLoading(false)
        return
      }

      // Fetch leases for all units
      const unitIds = allUnits.map(u => u.id)
      const { data: allLeases } = await supabase
        .from('leases')
        .select('*')
        .in('unit_id', unitIds)
        .order('lease_start_date', { ascending: false })

      // Batch fetch all tenants
      const tenantIds = [...new Set(allLeases?.map(l => l.tenant_id).filter(Boolean) || [])]
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, user_id')
        .in('id', tenantIds)

      const tenantMap = new Map(tenants?.map(t => [t.id, t]) || [])

      // Batch fetch all users (for tenants and message senders)
      const tenantUserIds = [...new Set(tenants?.map(t => t.user_id).filter(Boolean) || [])]

      // Batch fetch last landlord_tenant messages for all leases (landlords don't see household messages)
      const leaseIds = allLeases?.map(l => l.id) || []
      const { data: allMessages } = await supabase
        .from('messages')
        .select('*')
        .in('lease_id', leaseIds)
        .eq('message_type', 'landlord_tenant') // Only landlord-tenant messages
        .is('soft_deleted_at', null)
        .order('created_at', { ascending: false })

      // Group messages by lease and get the most recent
      const messagesByLease = new Map<string, (typeof allMessages)[0]>()
      allMessages?.forEach(msg => {
        if (!messagesByLease.has(msg.lease_id)) {
          messagesByLease.set(msg.lease_id, msg)
        }
      })

      // Batch fetch all message sender users
      const senderIds = [...new Set(allMessages?.map(m => m.sender_id).filter(Boolean) || [])]
      const allUserIds = [...new Set([...tenantUserIds, ...senderIds])]

      const { data: users } = await supabase.from('users').select('id, email').in('id', allUserIds)

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

      // Combine lease data
      const leasesWithData = (allLeases || []).map(lease => {
        const unit = allUnits.find(u => u.id === lease.unit_id)
        const property = properties.find(p => p.id === unit?.property_id)
        const tenantData = tenantMap.get(lease.tenant_id)
        const tenantUser = tenantData?.user_id ? userMap.get(tenantData.user_id) : undefined

        const lastMessageData = messagesByLease.get(lease.id)
        const lastMessage =
          lastMessageData && lastMessageData.sender_id
            ? {
                ...lastMessageData,
                sender: userMap.get(lastMessageData.sender_id),
              }
            : lastMessageData

        return {
          ...lease,
          unit,
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

      // Group by property, then by unit
      const grouped = leasesWithData.reduce((acc, lease) => {
        if (!lease.unit) return acc

        const propertyId = lease.unit.property_id
        const unitId = lease.unit.id
        const property = properties.find(p => p.id === propertyId)
        if (!property) return acc

        let propertyGroup = acc.find(g => g.property.id === propertyId)
        if (!propertyGroup) {
          propertyGroup = {
            property: {
              id: property.id,
              name: property.name,
              address: property.address || null,
            },
            units: [],
          }
          acc.push(propertyGroup)
        }

        let unitGroup = propertyGroup.units.find(u => u.unit.id === unitId)
        if (!unitGroup) {
          unitGroup = {
            unit: {
              ...lease.unit,
              property: {
                name: property.name,
                address: property.address || null,
              },
            },
            leases: [],
          }
          propertyGroup.units.push(unitGroup)
        }

        unitGroup.leases.push(lease)
        return acc
      }, [] as PropertyWithUnits[])

      // Sort properties by most recent lease activity
      grouped.sort((a, b) => {
        const aLatest =
          a.units[0]?.leases[0]?.lastMessage?.created_at || a.units[0]?.leases[0]?.created_at
        const bLatest =
          b.units[0]?.leases[0]?.lastMessage?.created_at || b.units[0]?.leases[0]?.created_at
        return new Date(bLatest || 0).getTime() - new Date(aLatest || 0).getTime()
      })

      setPropertiesWithUnits(grouped)
      setLoading(false)
    }

    if (properties && properties.length > 0 && user) {
      fetchUnitsAndLeases()
    }
  }, [properties, user])

  // Filter and sort properties with units
  const filteredAndSortedProperties = useMemo(() => {
    if (!propertiesWithUnits || propertiesWithUnits.length === 0) return []

    let filteredProperties = [...propertiesWithUnits]

    // Apply search filter across all leases
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filteredProperties = filteredProperties
        .map(propertyGroup => ({
          ...propertyGroup,
          units: propertyGroup.units
            .map(unitGroup => ({
              ...unitGroup,
              leases: unitGroup.leases.filter(lease => {
                const tenantEmail = lease.tenant?.user?.email?.toLowerCase() || ''
                const propertyName = propertyGroup.property.name?.toLowerCase() || ''
                const unitName = unitGroup.unit.unit_name?.toLowerCase() || ''
                const lastMessageBody = lease.lastMessage?.body?.toLowerCase() || ''
                return (
                  tenantEmail.includes(query) ||
                  propertyName.includes(query) ||
                  unitName.includes(query) ||
                  lastMessageBody.includes(query)
                )
              }),
            }))
            .filter(unitGroup => unitGroup.leases.length > 0),
        }))
        .filter(propertyGroup => propertyGroup.units.length > 0)
    }

    // Apply property filter
    if (propertyFilter !== 'all') {
      filteredProperties = filteredProperties.filter(
        propertyGroup => propertyGroup.property.id === propertyFilter
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filteredProperties = filteredProperties
        .map(propertyGroup => ({
          ...propertyGroup,
          units: propertyGroup.units
            .map(unitGroup => ({
              ...unitGroup,
              leases: unitGroup.leases.filter(lease => {
                if (statusFilter === 'active') {
                  return lease.status === 'active'
                }
                if (statusFilter === 'draft') {
                  return lease.status === 'draft'
                }
                if (statusFilter === 'ended') {
                  return lease.status === 'ended'
                }
                return true
              }),
            }))
            .filter(unitGroup => unitGroup.leases.length > 0),
        }))
        .filter(propertyGroup => propertyGroup.units.length > 0)
    }

    // Apply sorting
    if (sortBy === 'property') {
      filteredProperties.sort((a, b) => a.property.name.localeCompare(b.property.name))
    } else {
      // Default sorting by most recent activity
      filteredProperties.sort((a, b) => {
        const aLatest =
          a.units[0]?.leases[0]?.lastMessage?.created_at || a.units[0]?.leases[0]?.created_at
        const bLatest =
          b.units[0]?.leases[0]?.lastMessage?.created_at || b.units[0]?.leases[0]?.created_at
        return new Date(bLatest || 0).getTime() - new Date(aLatest || 0).getTime()
      })
    }

    return filteredProperties
  }, [propertiesWithUnits, searchQuery, propertyFilter, statusFilter, sortBy])

  const selectedLeaseId = leaseId || searchParams.get('leaseId')
  const selectedLease = propertiesWithUnits
    .flatMap(p => p.units.flatMap(u => u.leases))
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
  if (!propertiesWithUnits || propertiesWithUnits.length === 0) {
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
            emptyStateTitle="No messages with tenant yet"
            emptyStateDescription="Start the conversation with your tenant."
            messageType="landlord_tenant"
          />
        </div>
      </div>
    )
  }

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    propertyFilter !== 'all' ||
    statusFilter !== 'all' ||
    sortBy !== 'recent'

  // Show properties with units and leases
  return (
    <div className="container mx-auto px-4 py-8 relative">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-1">Property • Unit • Lease conversations</p>
        </div>

        {/* Filter Bar */}
        {propertiesWithUnits.length > 0 && (
          <Card className="glass-card mb-6 max-w-4xl">
            <CardContent className="pt-4 pb-4">
              <div className="space-y-3">
                {/* Search Input Row */}
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    type="text"
                    placeholder="Search by tenant, property, unit, or message..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 h-9 bg-background/50"
                  />
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Filters:</span>
                  </div>

                  {/* Property Filter */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">
                      Property:
                    </label>
                    <select
                      value={propertyFilter}
                      onChange={e => setPropertyFilter(e.target.value)}
                      className="flex h-8 min-w-[140px] rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="all">All Properties</option>
                      {properties.map(property => (
                        <option key={property.id} value={property.id}>
                          {property.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">
                      Status:
                    </label>
                    <select
                      value={statusFilter}
                      onChange={e =>
                        setStatusFilter(e.target.value as 'all' | 'active' | 'draft' | 'ended')
                      }
                      className="flex h-8 min-w-[110px] rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="all">All Leases</option>
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="ended">Ended</option>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">Sort:</label>
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as 'recent' | 'property')}
                      className="flex h-8 min-w-[140px] rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="recent">Recent Activity</option>
                      <option value="property">Property Name</option>
                    </select>
                  </div>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('')
                        setPropertyFilter('all')
                        setStatusFilter('all')
                        setSortBy('recent')
                      }}
                      className="ml-auto h-8 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show empty state if filtered results are empty */}
        {filteredAndSortedProperties.length === 0 && propertiesWithUnits.length > 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-12 w-12" />}
            title="No messages match filters"
            description="Try adjusting your search or filters to see more results."
            action={{
              label: 'Clear All Filters',
              onClick: () => {
                setSearchQuery('')
                setPropertyFilter('all')
                setStatusFilter('all')
                setSortBy('recent')
              },
            }}
          />
        ) : (
          <div className="space-y-8">
            {filteredAndSortedProperties.map(propertyGroup => (
              <div key={propertyGroup.property.id}>
                {/* Property Header */}
                <div className="flex items-center gap-2 mb-4">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold text-foreground">
                    {propertyGroup.property.name}
                  </h2>
                  {propertyGroup.property.address && (
                    <span className="text-sm text-muted-foreground">
                      {propertyGroup.property.address}
                    </span>
                  )}
                </div>

                {/* Units within property */}
                <div className="space-y-6 ml-6">
                  {propertyGroup.units.map(unitGroup => (
                    <div key={unitGroup.unit.id}>
                      {/* Unit Header */}
                      <div className="flex items-center gap-2 mb-3">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium text-foreground">
                          Unit {unitGroup.unit.unit_name}
                        </h3>
                      </div>

                      {/* Leases within unit */}
                      <div className="space-y-3 ml-6">
                        {unitGroup.leases.map(lease => {
                          const isActive =
                            lease.status === 'active' ||
                            (lease.status === 'draft' && lease.tenant_id)
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
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-muted-foreground" />
                                      <CardTitle className="text-lg">
                                        {lease.tenant?.user?.email || 'Tenant'}
                                        {lease.unreadCount && lease.unreadCount > 0 && (
                                          <Badge variant="default" className="ml-2">
                                            {lease.unreadCount}
                                          </Badge>
                                        )}
                                      </CardTitle>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Lease:{' '}
                                      {lease.lease_start_date
                                        ? new Date(lease.lease_start_date).toLocaleDateString()
                                        : 'Draft'}
                                      {lease.lease_end_date &&
                                        ` - ${new Date(lease.lease_end_date).toLocaleDateString()}`}
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
