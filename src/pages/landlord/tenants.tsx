import { useState, useMemo, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTenants } from '@/hooks/use-tenants'
import { useProperties } from '@/hooks/use-properties'
import { TenantCard } from '@/components/landlord/tenant-card'
import { TenantForm } from '@/components/landlord/tenant-form'
import { TenantInviteForm } from '@/components/landlord/tenant-invite-form'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { useUrlParams } from '@/lib/url-params'
import { Plus, Users, Mail, X } from 'lucide-react'
import { motionTokens, durationToSeconds } from '@/lib/motion'

export function LandlordTenants() {
  const { tenants, loading, createTenant, deleteTenant } = useTenants()
  const { properties } = useProperties()
  const { getFilterParam, clearFilterParam } = useUrlParams()
  const [showForm, setShowForm] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const propertyIdFilter = getFilterParam('propertyId')
  const filteredProperty = useMemo(() => {
    if (!propertyIdFilter) return null
    return properties.find(p => p.id === propertyIdFilter)
  }, [properties, propertyIdFilter])

  const filteredTenants = useMemo(() => {
    if (!propertyIdFilter) return tenants
    return tenants.filter(t => t.property_id === propertyIdFilter)
  }, [tenants, propertyIdFilter])

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

  if (showForm || showInviteForm) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl relative">
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
    <div className="container mx-auto px-4 py-8 relative min-h-screen">
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

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading tenants...</p>
          </div>
        ) : filteredTenants.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title={propertyIdFilter ? 'No tenants for this property' : 'No tenants yet'}
            description={
              propertyIdFilter
                ? 'This property has no tenants assigned yet.'
                : 'Assign tenants to your properties to start managing leases and rent.'
            }
            action={{
              label: propertyIdFilter ? 'Add Tenant to Property' : 'Add Your First Tenant',
              onClick: () => setShowForm(true),
            }}
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {filteredTenants.map(tenant => (
                <TenantCard key={tenant.id} tenant={tenant} onDelete={handleDelete} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
