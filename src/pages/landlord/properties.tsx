import { useState } from 'react'
import { useProperties } from '@/hooks/use-properties'
import { PropertyCard } from '@/components/landlord/property-card'
import { PropertyForm } from '@/components/landlord/property-form'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function LandlordProperties() {
  const { properties, loading, createProperty, deleteProperty } = useProperties()
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate(data: Parameters<typeof createProperty>[0]) {
    setSubmitting(true)
    try {
      await createProperty(data)
      setShowForm(false)
    } catch (error) {
      console.error('Error creating property:', error)
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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <PropertyForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={submitting}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900">Properties</h1>
          <p className="text-stone-600 mt-1">Manage your properties</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Property
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-stone-600">Loading properties...</p>
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-600 mb-4">No properties yet</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Property
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map(property => (
            <PropertyCard key={property.id} property={property} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
