import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card' // Unused
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton-loader'
import { PropertyDetailsCard } from '@/components/tenant/property-details-card'
import { LandlordContactCard } from '@/components/tenant/landlord-contact-card'
import { HousematesList } from '@/components/tenant/housemates-list'
import { JoinHouseholdForm } from '@/components/tenant/join-household-form'
import { useActiveLease } from '@/hooks/use-active-lease'
import { useAuth } from '@/contexts/auth-context'
import { Home, Users, Building } from 'lucide-react'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { usePerformanceTracker } from '@/hooks/use-performance-tracker'

export function TenantHousehold() {
  // Track performance metrics
  usePerformanceTracker({ componentName: 'TenantHousehold' })

  const { role } = useAuth()
  const navigate = useNavigate()
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [activeTab, setActiveTab] = useState('home')

  // Get the active lease for this tenant
  const { lease, loading, error } = useActiveLease()

  // Role guard: Prevent landlords from accessing tenant household
  if (role === 'landlord') {
    navigate('/landlord/dashboard', { replace: true })
    return null
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 relative min-h-screen">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-foreground">Household</h1>
            <p className="text-muted-foreground mt-1">Your home and housemates</p>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    console.error('[TenantHousehold] Error loading lease:', error)
    return (
      <div className="container mx-auto px-4 py-8 relative min-h-screen">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10">
          <EmptyState
            icon={<Home className="h-12 w-12" />}
            title="Error loading household"
            description="There was a problem loading your household information. Please try refreshing the page."
          />
        </div>
      </div>
    )
  }

  // Case 1: Tenant NOT in a household - Show Join Household Interface
  if (!lease) {
    if (showJoinForm) {
      return (
        <div className="container mx-auto px-4 py-8 relative min-h-screen">
          <GrainOverlay />
          <MatteLayer intensity="subtle" />
          <div className="relative z-10">
            <JoinHouseholdForm onCancel={() => setShowJoinForm(false)} />
          </div>
        </div>
      )
    }

    return (
      <div className="container mx-auto px-4 py-8 relative min-h-screen">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <div className="relative z-10">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground">Household</h1>
            <p className="text-muted-foreground">
              Join a household to access your property information
            </p>
          </div>

          <EmptyState
            icon={<Home className="h-12 w-12" />}
            title="Not part of a household yet"
            description="You need to join a household to view property information, housemates, and lease details. Ask your landlord to send you an invite link."
            action={{
              label: 'Join with Invite Link',
              onClick: () => setShowJoinForm(true),
            }}
          />
        </div>
      </div>
    )
  }

  // Case 2: Tenant IS in a household - Show Tabbed Household View
  return (
    <div className="container mx-auto px-4 py-8 relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground">Household</h1>
          <p className="text-muted-foreground">
            {lease.property?.name || 'Property'} • {lease.unit?.unit_name || 'Unit'} • Lease active{' '}
            {lease.lease_start_date ? new Date(lease.lease_start_date).toLocaleDateString() : 'N/A'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="home" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Home Details
            </TabsTrigger>
            <TabsTrigger value="housemates" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Housemates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="mt-6 space-y-6">
            <PropertyDetailsCard lease={lease} />
            <LandlordContactCard lease={lease} />
          </TabsContent>

          <TabsContent value="housemates" className="mt-6">
            <HousematesList leaseId={lease.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
