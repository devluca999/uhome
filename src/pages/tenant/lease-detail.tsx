import { useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LeaseMessagesTab } from '@/components/tenant/lease-messages-tab'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { MessageSquare } from 'lucide-react'
import { useTenantData } from '@/hooks/use-tenant-data'
import { useLeases } from '@/hooks/use-leases'
import type { Database } from '@/types/database'

type Lease = Database['public']['Tables']['leases']['Row']

export function TenantLeaseDetail() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: tenantData, loading: tenantLoading } = useTenantData()
  const { leases, loading: leasesLoading } = useLeases(undefined, tenantData?.tenant.id)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')

  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true })
  }, [activeTab, setSearchParams])

  // Filter to active or draft leases (tenants don't see ended leases in detail view)
  const activeLeases = leases.filter(l => l.status !== 'ended')
  const lease = activeLeases[0] // Tenants typically have one active lease
  const loading = tenantLoading || leasesLoading

  const defaultIntent = (searchParams.get('intent') as any) || 'general'

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 relative">
        <GrainOverlay />
        <div className="relative z-10 text-center py-12">
          <p className="text-muted-foreground">Loading lease...</p>
        </div>
      </div>
    )
  }

  if (!tenantData || !lease) {
    return (
      <div className="container mx-auto px-4 py-8 relative">
        <GrainOverlay />
        <div className="relative z-10 text-center py-12">
          <EmptyState
            icon={<MessageSquare className="h-12 w-12" />}
            title="No active lease"
            description="Messaging starts once your landlord invites you to your lease."
          />
        </div>
      </div>
    )
  }

  const isLeaseEnded = lease.status === 'ended'
  const isLeaseActive = lease.status === 'active' || (lease.status === 'draft' && lease.tenant_id)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl relative">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground flex items-center gap-2">
                Lease Details
                {isLeaseEnded && (
                  <span className="text-sm font-normal text-muted-foreground">(Ended)</span>
                )}
              </h1>
              <p className="text-muted-foreground mt-1">{tenantData.property.name}</p>
            </div>
            <Badge variant={isLeaseEnded ? 'secondary' : isLeaseActive ? 'default' : 'outline'}>
              {lease.status === 'draft' ? 'Draft' : lease.status === 'active' ? 'Active' : 'Ended'}
            </Badge>
          </div>
          {isLeaseEnded && (
            <div className="mt-4 p-3 rounded-md bg-muted/50 border border-border">
              <p className="text-sm text-foreground">
                Your lease has ended. Your access is now closed. This conversation is read-only.
              </p>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2 mt-4">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Lease Information</CardTitle>
                  <CardDescription>Your lease details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Property</p>
                    <p className="text-sm font-medium text-foreground">
                      {tenantData.property.name}
                    </p>
                    {tenantData.property.address && (
                      <p className="text-xs text-muted-foreground">{tenantData.property.address}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Move-in Date</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(tenantData.tenant.move_in_date).toLocaleDateString()}
                    </p>
                  </div>
                  {lease.lease_end_date && (
                    <div>
                      <p className="text-xs text-muted-foreground">End Date</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(lease.lease_end_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge
                      variant={isLeaseEnded ? 'secondary' : isLeaseActive ? 'default' : 'outline'}
                    >
                      {lease.status === 'draft'
                        ? 'Draft'
                        : lease.status === 'active'
                          ? 'Active'
                          : 'Ended'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Financial Details</CardTitle>
                  <CardDescription>Rent and deposit information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Rent Amount</p>
                    <p className="text-lg font-semibold text-foreground">
                      ${Number(lease.rent_amount).toLocaleString()} / {lease.rent_frequency}
                    </p>
                  </div>
                  {lease.security_deposit && (
                    <div>
                      <p className="text-xs text-muted-foreground">Security Deposit</p>
                      <p className="text-sm font-medium text-foreground">
                        ${Number(lease.security_deposit).toLocaleString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Lease Type</p>
                    <p className="text-sm font-medium text-foreground">
                      {lease.lease_type === 'long-term' ? 'Long-term' : 'Short-term'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="messages">
            <LeaseMessagesTab
              lease={lease}
              isLeaseActive={isLeaseActive}
              defaultIntent={defaultIntent}
              leaseStatus={lease.status}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
