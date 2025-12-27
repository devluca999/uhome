import { useState } from 'react'
import { useTenants } from '@/hooks/use-tenants'
import { TenantCard } from '@/components/landlord/tenant-card'
import { TenantForm } from '@/components/landlord/tenant-form'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function LandlordTenants() {
  const { tenants, loading, createTenant, deleteTenant } = useTenants()
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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

  if (showForm) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <TenantForm
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
          <h1 className="text-3xl font-semibold text-stone-900">Tenants</h1>
          <p className="text-stone-600 mt-1">Manage your tenants</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Tenant
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-stone-600">Loading tenants...</p>
        </div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-600 mb-4">No tenants yet</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Tenant
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tenants.map(tenant => (
            <TenantCard key={tenant.id} tenant={tenant} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
