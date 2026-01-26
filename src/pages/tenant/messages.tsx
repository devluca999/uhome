import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton-loader'
import { LeaseThread } from '@/components/messages/lease-thread'
import { useActiveLease } from '@/hooks/use-active-lease'
import { useAuth } from '@/contexts/auth-context'
import { MessageSquare, Users, Building } from 'lucide-react'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { usePerformanceTracker } from '@/hooks/use-performance-tracker'

export function TenantMessages() {
  // Track performance metrics
  usePerformanceTracker({ componentName: 'TenantMessages' })

  const { leaseId: urlLeaseId } = useParams<{ leaseId?: string }>()
  const [searchParams] = useSearchParams()
  const { role } = useAuth()

  // Get the active lease for this tenant
  const { lease, loading, error } = useActiveLease()

  // Support legacy URL with leaseId (redirect to base route if different)
  const currentLeaseId = lease?.id

  // If we have a URL leaseId but it's different from the active lease, redirect
  if (urlLeaseId && currentLeaseId && urlLeaseId !== currentLeaseId) {
    console.warn('[TenantMessages] URL leaseId does not match active lease, ignoring URL param')
  }

  // Use active lease if available
  const activeLeaseId = currentLeaseId || urlLeaseId
  const isLeaseActive =
    lease &&
    lease.status !== 'ended' &&
    (lease.status === 'active' || (lease.status === 'draft' && lease.tenant_id))
  const defaultIntent =
    (searchParams.get('intent') as 'general' | 'maintenance' | 'billing' | 'notice') || 'general'

  // Role guard: Only tenants can access this page
  if (role === 'landlord') {
    return (
      <div className="container mx-auto px-4 py-8 relative">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10">
          <EmptyState
            icon={<MessageSquare className="h-12 w-12" />}
            title="Access Denied"
            description="This page is only available to tenants."
          />
        </div>
      </div>
    )
  }

  if (loading) {
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
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-[500px] w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    console.error('[TenantMessages] Error loading lease:', error)
    return (
      <div className="container mx-auto px-4 py-8 relative">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10">
          <EmptyState
            icon={<MessageSquare className="h-12 w-12" />}
            title="Error loading messages"
            description="There was a problem loading your messages. Please try refreshing the page."
          />
        </div>
      </div>
    )
  }

  // No active lease - tenant hasn't been invited or joined a household yet
  if (!lease) {
    return (
      <div className="container mx-auto px-4 py-8 relative">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10">
          <EmptyState
            icon={<MessageSquare className="h-12 w-12" />}
            title="You are not currently part of a household"
            description="Messaging is only available once you've been invited to join a household by your landlord. You'll receive an invitation link to get started."
          />
        </div>
      </div>
    )
  }

  // Main messaging interface with Landlord/Household tabs
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl relative">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-1">
            {lease.property?.name || 'Property'} •{' '}
            {lease.property?.address || 'Lease conversations'}
          </p>
        </div>

        <Tabs defaultValue="landlord" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="landlord" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Landlord
            </TabsTrigger>
            <TabsTrigger value="household" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Household
            </TabsTrigger>
          </TabsList>

          <TabsContent value="landlord" className="mt-6">
            <LeaseThread
              leaseId={activeLeaseId!}
              isLeaseActive={!!isLeaseActive}
              defaultIntent={defaultIntent}
              showStatusSelector={false}
              emptyStateTitle="No messages with landlord yet"
              emptyStateDescription="Start the conversation with your landlord about maintenance, billing, or general inquiries."
              messageType="landlord_tenant"
            />
          </TabsContent>

          <TabsContent value="household" className="mt-6">
            <LeaseThread
              leaseId={activeLeaseId!}
              isLeaseActive={!!isLeaseActive}
              defaultIntent="general"
              showStatusSelector={false}
              emptyStateTitle="No household messages yet"
              emptyStateDescription="Chat with your roommates about household matters."
              messageType="household"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
