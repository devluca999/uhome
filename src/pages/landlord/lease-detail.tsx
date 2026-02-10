import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LeaseMessagesTab } from '@/components/landlord/lease-messages-tab'
import { ArrowLeft } from 'lucide-react'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
// import { cn } from '@/lib/utils' // Unused
import type { Database } from '@/types/database'

type Lease = Database['public']['Tables']['leases']['Row']
type LeaseWithRelations = Lease & {
  property?: {
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

export function LeaseDetail() {
  const { leaseId } = useParams<{ leaseId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [lease, setLease] = useState<LeaseWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')

  useEffect(() => {
    if (leaseId) {
      fetchLease()
    }
  }, [leaseId])

  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true })
  }, [activeTab, setSearchParams])

  async function fetchLease() {
    if (!leaseId) return

    try {
      setLoading(true)
      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .select('*')
        .eq('id', leaseId)
        .single()

      if (leaseError) throw leaseError

      // Fetch property
      const { data: propertyData } = await supabase
        .from('properties')
        .select('name, address')
        .eq('id', leaseData.property_id)
        .single()

      // Fetch tenant
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id, user_id')
        .eq('id', leaseData.tenant_id)
        .single()

      let userEmail = null
      if (tenantData?.user_id) {
        const { data: userData } = await supabase
          .from('users')
          .select('email')
          .eq('id', tenantData.user_id)
          .single()
        userEmail = userData?.email
      }

      setLease({
        ...leaseData,
        property: propertyData || undefined,
        tenant: tenantData
          ? {
              id: tenantData.id,
              user: userEmail ? { email: userEmail } : undefined,
            }
          : undefined,
      })
    } catch (error) {
      console.error('Error fetching lease:', error)
    } finally {
      setLoading(false)
    }
  }

  const isLeaseEnded = lease?.status === 'ended'
  const isLeaseActive =
    lease &&
    lease.status !== 'ended' &&
    (lease.status === 'active' || (lease.status === 'draft' && lease.tenant_id))
  const defaultIntent = (searchParams.get('intent') as any) || 'general'

  if (loading) {
    return (
      <div className="container mx-auto px-4 pt-4 pb-8 relative">
        <GrainOverlay />
        <div className="relative z-10 text-center py-12">
          <p className="text-muted-foreground">Loading lease...</p>
        </div>
      </div>
    )
  }

  if (!lease) {
    return (
      <div className="container mx-auto px-4 pt-4 pb-8 relative">
        <GrainOverlay />
        <div className="relative z-10 text-center py-12">
          <p className="text-muted-foreground mb-4">Lease not found</p>
          <Button asChild variant="outline">
            <Link to="/landlord/properties">Back to Properties</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 pt-0.5 pb-8 max-w-4xl relative">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/landlord/properties">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Properties
            </Link>
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground flex items-center gap-2">
                Lease Details
                {isLeaseEnded && (
                  <span className="text-sm font-normal text-muted-foreground">(Ended)</span>
                )}
              </h1>
              <p className="text-muted-foreground mt-1">
                {lease.property?.name || 'Property'} - {lease.tenant?.user?.email || 'Tenant'}
              </p>
            </div>
            <Badge variant={isLeaseEnded ? 'secondary' : isLeaseActive ? 'default' : 'outline'}>
              {lease.status === 'draft' ? 'Draft' : lease.status === 'active' ? 'Active' : 'Ended'}
            </Badge>
          </div>
          {isLeaseEnded && (
            <div className="mt-4 p-3 rounded-md bg-muted/50 border border-border">
              <p className="text-sm text-foreground">
                This lease has ended. This conversation is now read-only. Historical data is
                preserved and cannot be modified.
              </p>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="messages">
              Messages
              {activeTab !== 'messages' && (
                <span className="ml-2 text-xs">({lease.id.slice(0, 8)})</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2 mt-4">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Lease Information</CardTitle>
                  <CardDescription>Lease metadata and details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Property</p>
                    <p className="text-sm font-medium text-foreground">
                      {lease.property?.name || 'Unknown'}
                    </p>
                    {lease.property?.address && (
                      <p className="text-xs text-muted-foreground">{lease.property.address}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tenant</p>
                    <p className="text-sm font-medium text-foreground">
                      {lease.tenant?.user?.email || 'Unknown'}
                    </p>
                  </div>
                  {lease.lease_start_date && (
                    <div>
                      <p className="text-xs text-muted-foreground">Start Date</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(lease.lease_start_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
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
                  {lease.rent_amount && (
                    <div>
                      <p className="text-xs text-muted-foreground">Rent Amount</p>
                      <p className="text-lg font-semibold text-foreground">
                        ${Number(lease.rent_amount).toLocaleString()} / {lease.rent_frequency}
                      </p>
                    </div>
                  )}
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
              isLeaseActive={!!isLeaseActive}
              defaultIntent={defaultIntent}
              leaseStatus={lease.status}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
