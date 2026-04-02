import { useState, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useProperties } from '@/hooks/use-properties'
import { useLeases } from '@/hooks/use-leases'
import { useTenants } from '@/hooks/use-tenants'
import { PropertyCard } from '@/components/landlord/property-card'
import { PropertyForm } from '@/components/landlord/property-form'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorAlert } from '@/components/error-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Plus, Home, Filter, X, Search } from 'lucide-react'
import { usePerformanceTracker } from '@/hooks/use-performance-tracker'
import { useAuth } from '@/contexts/auth-context'
import { useSubscription } from '@/hooks/use-subscription'

type PropertyTypeFilter = string | 'all'
type OccupancyFilter = 'occupied' | 'vacant' | 'all'
type StatusFilter = 'all' | 'active' | 'inactive'
type RentRangeFilter = 'all' | 'low' | 'medium' | 'high'
type SortFilter = 'newest' | 'oldest' | 'rent_high' | 'rent_low' | 'name_az' | 'name_za'

export function LandlordProperties() {
  // Track performance metrics
  usePerformanceTracker({ componentName: 'LandlordProperties' })
  const navigate = useNavigate()
  const { viewMode } = useAuth()
  const { canAddProperty, loading: subscriptionLoading } = useSubscription()
  const applyPlanGates = viewMode !== 'landlord-demo'
  const { properties, loading, error, createProperty, deleteProperty } = useProperties()
  const { leases } = useLeases()
  const { tenants } = useTenants()
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [planGateNotice, setPlanGateNotice] = useState<string | null>(null)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<PropertyTypeFilter>('all')
  const [occupancyFilter, setOccupancyFilter] = useState<OccupancyFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [rentRangeFilter, setRentRangeFilter] = useState<RentRangeFilter>('all')
  const [sortFilter, setSortFilter] = useState<SortFilter>('newest')

  // Get unique property types
  const propertyTypes = useMemo(() => {
    const types = new Set<string>()
    properties.forEach(p => {
      if (p.property_type) types.add(p.property_type)
    })
    return Array.from(types).sort()
  }, [properties])

  // Prefer lease rent amounts when property rent is missing/zero
  const rentByProperty = useMemo(() => {
    const rentMap = new Map<string, number>()
    leases.forEach(lease => {
      if (!lease.property_id) return
      const rentAmount = lease.rent_amount || 0
      if (rentAmount <= 0) return
      const current = rentMap.get(lease.property_id) || 0
      if (rentAmount > current) {
        rentMap.set(lease.property_id, rentAmount)
      }
    })
    return rentMap
  }, [leases])

  const propertiesWithRent = useMemo(() => {
    return properties.map(property => {
      if (property.rent_amount && property.rent_amount > 0) {
        return property
      }
      const fallbackRent = rentByProperty.get(property.id) || 0
      return {
        ...property,
        rent_amount: fallbackRent,
      }
    })
  }, [properties, rentByProperty])

  // Calculate rent ranges
  const rentRanges = useMemo(() => {
    if (propertiesWithRent.length === 0) return { low: 0, medium: 0, high: 0 }
    const rents = propertiesWithRent.map(p => p.rent_amount).filter(r => r > 0)
    if (rents.length === 0) return { low: 0, medium: 0, high: 0 }
    rents.sort((a, b) => a - b)
    const low = rents[Math.floor(rents.length / 3)]
    const medium = rents[Math.floor((rents.length * 2) / 3)]
    return { low, medium, high: rents[rents.length - 1] }
  }, [propertiesWithRent])

  // Check if property is occupied
  const isPropertyOccupied = (propertyId: string): boolean => {
    return tenants.some(
      t =>
        t.property_id === propertyId &&
        (!t.lease_end_date || new Date(t.lease_end_date) > new Date())
    )
  }

  // Apply all filters
  const filteredProperties = useMemo(() => {
    let filtered = [...propertiesWithRent]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => {
        const name = p.name?.toLowerCase() || ''
        const address = p.address?.toLowerCase() || ''
        return name.includes(query) || address.includes(query)
      })
    }

    // Property type filter
    if (propertyTypeFilter !== 'all') {
      filtered = filtered.filter(p => p.property_type === propertyTypeFilter)
    }

    // Occupancy filter
    if (occupancyFilter === 'occupied') {
      filtered = filtered.filter(p => isPropertyOccupied(p.id))
    } else if (occupancyFilter === 'vacant') {
      filtered = filtered.filter(p => !isPropertyOccupied(p.id))
    }

    // Status filter (active/inactive)
    if (statusFilter === 'active') {
      filtered = filtered.filter(p => p.is_active !== false)
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(p => p.is_active === false)
    }

    // Rent range filter
    if (rentRangeFilter === 'low') {
      filtered = filtered.filter(p => p.rent_amount > 0 && p.rent_amount <= rentRanges.low)
    } else if (rentRangeFilter === 'medium') {
      filtered = filtered.filter(
        p => p.rent_amount > rentRanges.low && p.rent_amount <= rentRanges.high
      )
    } else if (rentRangeFilter === 'high') {
      filtered = filtered.filter(p => p.rent_amount > rentRanges.medium)
    }

    // Sort filter
    if (sortFilter === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortFilter === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    } else if (sortFilter === 'rent_high') {
      filtered.sort((a, b) => b.rent_amount - a.rent_amount)
    } else if (sortFilter === 'rent_low') {
      filtered.sort((a, b) => a.rent_amount - b.rent_amount)
    } else if (sortFilter === 'name_az') {
      filtered.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortFilter === 'name_za') {
      filtered.sort((a, b) => b.name.localeCompare(a.name))
    }

    return filtered
  }, [
    propertiesWithRent,
    searchQuery,
    propertyTypeFilter,
    occupancyFilter,
    rentRangeFilter,
    sortFilter,
    tenants,
    rentRanges,
  ])

  async function handleCreate(data: Parameters<typeof createProperty>[0]) {
    if (applyPlanGates && !subscriptionLoading && !canAddProperty(properties.length)) {
      setCreateError('Your plan does not allow more properties. Upgrade to add another.')
      return
    }
    setSubmitting(true)
    setCreateError(null)
    try {
      await createProperty(data)
      setShowForm(false)
    } catch (error) {
      console.error('Error creating property:', error)
      setCreateError(error instanceof Error ? error.message : 'Failed to create property')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProperty(id)
    } catch (error) {
      console.error('Error deleting property:', error)
    }
  }

  if (showForm) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 max-w-2xl relative">
        <GrainOverlay />
        <div className="relative z-20 isolate">
          {createError && (
            <ErrorAlert
              error={createError}
              onDismiss={() => setCreateError(null)}
              className="mb-6"
            />
          )}
          <PropertyForm
            onSubmit={handleCreate}
            onCancel={() => {
              setShowForm(false)
              setCreateError(null)
              setPlanGateNotice(null)
            }}
            loading={submitting}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 pt-0.5 pb-8 relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-foreground mb-2">Properties</h1>
            <p className="text-muted-foreground">Manage your properties</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button
              onClick={() => {
                setPlanGateNotice(null)
                if (subscriptionLoading) return
                if (applyPlanGates && !canAddProperty(properties.length)) {
                  setPlanGateNotice(
                    'You have reached the property limit on your current plan. Upgrade to add more properties.'
                  )
                  return
                }
                setShowForm(true)
              }}
              disabled={subscriptionLoading}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Button>
            {applyPlanGates && planGateNotice && (
              <div className="flex flex-col items-end gap-2 max-w-sm text-right">
                <p className="text-sm text-muted-foreground">{planGateNotice}</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/landlord/subscription-plans')}>
                  View plans
                </Button>
              </div>
            )}
          </div>
        </div>

        {error && <ErrorAlert error={error} className="mb-6" />}

        {/* Filter Bar */}
        {properties.length > 0 && (
          <Card className="glass-card mb-6 max-w-4xl">
            <CardContent className="pt-4 pb-4">
              <div className="space-y-3">
                {/* Search Input Row */}
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    type="text"
                    placeholder="Search by name, address, or city..."
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

                  {/* Property Type Filter */}
                  {propertyTypes.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-muted-foreground whitespace-nowrap">
                        Type:
                      </label>
                      <select
                        value={propertyTypeFilter}
                        onChange={e => setPropertyTypeFilter(e.target.value)}
                        className="flex h-8 min-w-[100px] rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="all">All Types</option>
                        {propertyTypes.map(type => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Status Filter */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">
                      Status:
                    </label>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                      className="flex h-8 min-w-[90px] rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  {/* Occupancy Filter */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">
                      Occupancy:
                    </label>
                    <select
                      value={occupancyFilter}
                      onChange={e => setOccupancyFilter(e.target.value as OccupancyFilter)}
                      className="flex h-8 min-w-[90px] rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="all">All</option>
                      <option value="occupied">Occupied</option>
                      <option value="vacant">Vacant</option>
                    </select>
                  </div>

                  {/* Rent Range Filter */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">Rent:</label>
                    <select
                      value={rentRangeFilter}
                      onChange={e => setRentRangeFilter(e.target.value as RentRangeFilter)}
                      className="flex h-8 min-w-[110px] rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="all">All Ranges</option>
                      <option value="low">Low (≤ ${rentRanges.low.toLocaleString()})</option>
                      <option value="medium">
                        Med (${rentRanges.low.toLocaleString()}-${rentRanges.high.toLocaleString()})
                      </option>
                      <option value="high">High (≥ ${rentRanges.medium.toLocaleString()})</option>
                    </select>
                  </div>

                  {/* Sort Filter */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">Sort:</label>
                    <select
                      value={sortFilter}
                      onChange={e => setSortFilter(e.target.value as SortFilter)}
                      className="flex h-8 min-w-[130px] rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="rent_high">Rent: High→Low</option>
                      <option value="rent_low">Rent: Low→High</option>
                      <option value="name_az">Name: A-Z</option>
                      <option value="name_za">Name: Z-A</option>
                    </select>
                  </div>

                  {/* Clear All Filters */}
                  {(searchQuery.trim() !== '' ||
                    propertyTypeFilter !== 'all' ||
                    statusFilter !== 'all' ||
                    occupancyFilter !== 'all' ||
                    rentRangeFilter !== 'all' ||
                    sortFilter !== 'newest') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('')
                        setPropertyTypeFilter('all')
                        setStatusFilter('all')
                        setOccupancyFilter('all')
                        setRentRangeFilter('all')
                        setSortFilter('newest')
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

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading properties...</p>
          </div>
        ) : properties.length === 0 ? (
          <EmptyState
            icon={<Home className="h-8 w-8" />}
            title="No properties yet"
            description="Get started by adding your first property to begin managing tenants and rent."
            action={{
              label: 'Create Your First Property',
              onClick: () => setShowForm(true),
            }}
          />
        ) : filteredProperties.length === 0 ? (
          <EmptyState
            icon={<Home className="h-8 w-8" />}
            title="No properties match filters"
            description="Try adjusting your search or filters to see more results."
            action={{
              label: 'Clear All Filters',
              onClick: () => {
                setSearchQuery('')
                setPropertyTypeFilter('all')
                setStatusFilter('all')
                setOccupancyFilter('all')
                setRentRangeFilter('all')
                setSortFilter('newest')
              },
            }}
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {filteredProperties.map(property => (
                <PropertyCard key={property.id} property={property} onDelete={handleDelete} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
