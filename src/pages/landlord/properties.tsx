import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useProperties } from '@/hooks/use-properties'
import { PropertyCard } from '@/components/landlord/property-card'
import { PropertyForm } from '@/components/landlord/property-form'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorAlert } from '@/components/error-alert'
import { Button } from '@/components/ui/button'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Plus, Home } from 'lucide-react'

export function LandlordProperties() {
  const { properties, loading, error, createProperty, deleteProperty } = useProperties()
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function handleCreate(data: Parameters<typeof createProperty>[0]) {
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
      <div className="container mx-auto px-4 py-8 max-w-2xl relative">
        <GrainOverlay />
        <div className="relative z-10">
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
            }}
            loading={submitting}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <div className="relative z-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-foreground mb-2">Properties</h1>
            <p className="text-muted-foreground">Manage your properties</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        </div>

        {error && <ErrorAlert error={error} className="mb-6" />}

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
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {properties.map(property => (
                <PropertyCard key={property.id} property={property} onDelete={handleDelete} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
