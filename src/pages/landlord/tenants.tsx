import { useState, useMemo, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTenants } from '@/hooks/use-tenants'
import { useProperties } from '@/hooks/use-properties'
import { TenantCard } from '@/components/landlord/tenant-card'
import { TenantListItem } from '@/components/landlord/tenant-list-item'
import { TenantDetailModal } from '@/components/landlord/tenant-detail-modal'
import { TenantForm } from '@/components/landlord/tenant-form'
import { TenantInviteForm } from '@/components/landlord/tenant-invite-form'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { useUrlParams } from '@/lib/url-params'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { Plus, Users, Mail, X, Search, Filter, LayoutGrid, List, Group } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { motionTokens } from '@/lib/motion'
import type { Tenant } from '@/hooks/use-tenants'

type StatusFilter = 'all' | 'active' | 'ended'
type SortFilter = 'name_az' | 'name_za' | 'newest' | 'oldest' | 'rent_high' | 'rent_low'
type ViewMode = 'list' | 'card'

const VIEW_MODE_STORAGE_KEY = 'tenant-view-mode'
const GROUP_BY_PROPERTY_STORAGE_KEY = 'tenant-group-by-property'

export function LandlordTenants() {
  const { tenants, loading, createTenant, deleteTenant } = useTenants()
  const { properties } = useProperties()
  const { getFilterParam, clearFilterParam } = useUrlParams()
  const [showForm, setShowForm] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // View mode and grouping (with localStorage persistence)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode
      return saved === 'list' || saved === 'card' ? saved : 'card'
    }
    return 'card'
  })
  const [groupByProperty, setGroupByProperty] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(GROUP_BY_PROPERTY_STORAGE_KEY) === 'true'
    }
    return false
  })

  // Filter and sort states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortFilter, setSortFilter] = useState<SortFilter>('newest')

  // Check feature flag
  const viewModesEnabled = isFeatureEnabled('ENABLE_TENANT_VIEW_MODES')

  // Update localStorage when view mode changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode)
    }
  }, [viewMode])

  // Update localStorage when group by property changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GROUP_BY_PROPERTY_STORAGE_KEY, String(groupByProperty))
    }
  }, [groupByProperty])

  // Check URL params for tenantId (for modal opening)
  useEffect(() => {
    const tenantId = getFilterParam('tenantId')
    if (tenantId && tenants.length > 0) {
      const tenant = tenants.find(t => t.id === tenantId)
      if (tenant) {
        setSelectedTenant(tenant)
        setShowDetailModal(true)
        // Clear the URL param after opening
        clearFilterParam('tenantId')
      }
    }
  }, [getFilterParam, tenants, clearFilterParam])

  // Check URL params for view mode
  useEffect(() => {
    const urlView = getFilterParam('view') as ViewMode
    if (urlView === 'list' || urlView === 'card') {
      setViewMode(urlView)
    }
    const urlGroupBy = getFilterParam('groupBy')
    if (urlGroupBy === 'property') {
      setGroupByProperty(true)
    }
  }, [getFilterParam])

  const propertyIdFilter = getFilterParam('propertyId')
  const filteredProperty = useMemo(() => {
    if (!propertyIdFilter) return null
    return properties.find(p => p.id === propertyIdFilter)
  }, [properties, propertyIdFilter])

  const filteredAndSortedTenants = useMemo(() => {
    let filtered = [...tenants]

    // Apply property filter from URL params
    if (propertyIdFilter) {
      filtered = filtered.filter(t => t.property_id === propertyIdFilter)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t => {
        const email = t.user?.email?.toLowerCase() || ''
        const phone = t.phone?.toLowerCase() || ''
        const property = properties.find(p => p.id === t.property_id)
        const propertyName = property?.name?.toLowerCase() || ''
        return email.includes(query) || phone.includes(query) || propertyName.includes(query)
      })
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      const now = new Date()
      if (statusFilter === 'active') {
        filtered = filtered.filter(t => !t.lease_end_date || new Date(t.lease_end_date) > now)
      } else if (statusFilter === 'ended') {
        filtered = filtered.filter(t => t.lease_end_date && new Date(t.lease_end_date) <= now)
      }
    }

    // Apply sorting
    if (sortFilter === 'name_az') {
      filtered.sort((a, b) => (a.user?.email || '').localeCompare(b.user?.email || ''))
    } else if (sortFilter === 'name_za') {
      filtered.sort((a, b) => (b.user?.email || '').localeCompare(a.user?.email || ''))
    } else if (sortFilter === 'newest') {
      filtered.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )
    } else if (sortFilter === 'oldest') {
      filtered.sort(
        (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      )
    } else if (sortFilter === 'rent_high') {
      filtered.sort((a, b) => {
        const aProperty = properties.find(p => p.id === a.property_id)
        const bProperty = properties.find(p => p.id === b.property_id)
        return (bProperty?.rent_amount || 0) - (aProperty?.rent_amount || 0)
      })
    } else if (sortFilter === 'rent_low') {
      filtered.sort((a, b) => {
        const aProperty = properties.find(p => p.id === a.property_id)
        const bProperty = properties.find(p => p.id === b.property_id)
        return (aProperty?.rent_amount || 0) - (bProperty?.rent_amount || 0)
      })
    }

    return filtered
  }, [tenants, propertyIdFilter, searchQuery, statusFilter, sortFilter, properties])

  async function handleCreate(data: Parameters<typeof createTenant>[0]) {
    setSubmitting(true)
    try {
      await createTenant(data)
      setShowForm(false)
    } catch (error) {
      console.error('Error creating tenant:', error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTenant(id)
    } catch (error) {
      console.error('Error deleting tenant:', error)
    }
  }

  function handleViewTenant(tenant: Tenant) {
    setSelectedTenant(tenant)
    setShowDetailModal(true)
  }

  function handleCloseDetailModal() {
    setShowDetailModal(false)
    setSelectedTenant(null)
  }

  // Group tenants by property if enabled
  const groupedTenants = useMemo(() => {
    if (!groupByProperty || !viewModesEnabled) {
      return { ungrouped: filteredAndSortedTenants }
    }

    const grouped: Record<string, Tenant[]> = {}
    filteredAndSortedTenants.forEach(tenant => {
      const key = tenant.property_id || 'no-property'
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(tenant)
    })
    return grouped
  }, [filteredAndSortedTenants, groupByProperty, viewModesEnabled])

  if (showForm || showInviteForm) {
    return (
      <div className="container mx-auto px-4 pt-0.5 pb-8 max-w-2xl relative">
        <GrainOverlay />
        <div className="relative z-10">
          {showInviteForm ? (
            <motion.div
              initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
              animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
              transition={{
                duration: motionTokens.duration.normal,
                ease: motionTokens.easing.standard,
              }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-foreground mb-2">Invite Tenant</h2>
                <p className="text-muted-foreground">Generate an invite link for a tenant</p>
              </div>
              <TenantInviteForm onCancel={() => setShowInviteForm(false)} />
            </motion.div>
          ) : (
            <TenantForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              loading={submitting}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 pt-0.5 pb-8 relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
          animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
          transition={{
            duration: motionTokens.duration.normal,
            ease: motionTokens.easing.standard,
          }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-semibold text-foreground mb-2">Tenants</h1>
              <p className="text-muted-foreground">
                {filteredProperty ? `Tenants for ${filteredProperty.name}` : 'Manage your tenants'}
              </p>
              {filteredProperty && (
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => clearFilterParam('propertyId')}
                    className="h-7"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear filter
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowInviteForm(true)}>
                <Mail className="mr-2 h-4 w-4" />
                Invite Tenant
              </Button>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Tenant
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Filter Bar */}
        {tenants.length > 0 && (
          <Card className="glass-card mb-6 max-w-4xl">
            <CardContent className="pt-4 pb-4">
              <div className="space-y-3">
                {/* Search Input Row */}
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, phone, or property..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 h-9 bg-background/50"
                  />
                </div>

                {/* View Mode Toggle (if feature enabled) */}
                {viewModesEnabled && (
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <span className="text-xs text-muted-foreground">View:</span>
                    <div className="flex items-center gap-1 bg-muted/50 rounded-md p-1">
                      <Button
                        variant={viewMode === 'card' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('card')}
                        className="h-7 px-2"
                      >
                        <LayoutGrid className="w-3 h-3 mr-1" />
                        Card
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="h-7 px-2"
                      >
                        <List className="w-3 h-3 mr-1" />
                        List
                      </Button>
                    </div>
                    <Button
                      variant={groupByProperty ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setGroupByProperty(!groupByProperty)}
                      className="h-7 px-2 ml-auto"
                    >
                      <Group className="w-3 h-3 mr-1" />
                      Group by Property
                    </Button>
                  </div>
                )}

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Filters:</span>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">
                      Status:
                    </label>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                      className="flex h-8 min-w-[100px] rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="ended">Ended</option>
                    </select>
                  </div>

                  {/* Sort Filter */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">Sort:</label>
                    <select
                      value={sortFilter}
                      onChange={e => setSortFilter(e.target.value as SortFilter)}
                      className="flex h-8 min-w-[140px] rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="name_az">Name: A-Z</option>
                      <option value="name_za">Name: Z-A</option>
                      <option value="rent_high">Rent: High→Low</option>
                      <option value="rent_low">Rent: Low→High</option>
                    </select>
                  </div>

                  {/* Clear Filters */}
                  {(searchQuery.trim() !== '' ||
                    statusFilter !== 'all' ||
                    sortFilter !== 'newest') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('')
                        setStatusFilter('all')
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
            <p className="text-muted-foreground">Loading tenants...</p>
          </div>
        ) : tenants.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No tenants yet"
            description="Assign tenants to your properties to start managing leases and rent."
            action={{
              label: 'Add Your First Tenant',
              onClick: () => setShowForm(true),
            }}
          />
        ) : filteredAndSortedTenants.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No tenants match filters"
            description="Try adjusting your search or filters to see more results."
            action={{
              label: 'Clear All Filters',
              onClick: () => {
                setSearchQuery('')
                setStatusFilter('all')
                setSortFilter('newest')
              },
            }}
          />
        ) : viewModesEnabled && groupByProperty ? (
          // Grouped view
          <div className="space-y-6">
            {Object.entries(groupedTenants).map(([propertyId, propertyTenants]) => {
              const property = properties.find(p => p.id === propertyId)
              return (
                <div key={propertyId} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <h3 className="font-semibold text-foreground">
                      {property ? property.name : 'No Property'}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {propertyTenants.length} {propertyTenants.length === 1 ? 'tenant' : 'tenants'}
                    </Badge>
                  </div>
                  {viewMode === 'card' ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      <AnimatePresence initial={false}>
                        {propertyTenants.map(tenant => (
                          <TenantCard
                            key={tenant.id}
                            tenant={tenant}
                            onDelete={handleDelete}
                            onView={handleViewTenant}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {propertyTenants.map(tenant => (
                        <TenantListItem
                          key={tenant.id}
                          tenant={tenant}
                          onDelete={handleDelete}
                          onView={handleViewTenant}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : viewModesEnabled && viewMode === 'list' ? (
          // List view
          <div className="space-y-2">
            {filteredAndSortedTenants.map(tenant => (
              <TenantListItem
                key={tenant.id}
                tenant={tenant}
                onDelete={handleDelete}
                onView={handleViewTenant}
              />
            ))}
          </div>
        ) : (
          // Card view (default)
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {filteredAndSortedTenants.map(tenant => (
                <TenantCard
                  key={tenant.id}
                  tenant={tenant}
                  onDelete={handleDelete}
                  onView={viewModesEnabled ? handleViewTenant : undefined}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Tenant Detail Modal */}
        {viewModesEnabled && (
          <TenantDetailModal
            isOpen={showDetailModal}
            onClose={handleCloseDetailModal}
            tenant={selectedTenant}
            onMessage={() => {
              handleCloseDetailModal()
              // TODO: Navigate to messages (Phase 2)
            }}
          />
        )}
      </div>
    </div>
  )
}
