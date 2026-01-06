import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useProperties } from '@/hooks/use-properties'
import { useTenants } from '@/hooks/use-tenants'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { X } from 'lucide-react'

interface WorkOrderFormProps {
  onSubmit: () => void
  onCancel: () => void
  propertyId?: string
}

export function WorkOrderForm({ onSubmit, onCancel, propertyId }: WorkOrderFormProps) {
  const { user } = useAuth()
  const { properties } = useProperties()
  const { tenants } = useTenants()
  const [selectedPropertyId, setSelectedPropertyId] = useState(propertyId || '')
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [category, setCategory] = useState('')
  const [publicDescription, setPublicDescription] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [visibilityToTenants, setVisibilityToTenants] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Filter tenants by selected property
  const propertyTenants = selectedPropertyId
    ? tenants.filter(t => t.property_id === selectedPropertyId)
    : []

  useEffect(() => {
    if (propertyId) {
      setSelectedPropertyId(propertyId)
    }
  }, [propertyId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!selectedPropertyId) {
      setError('Property is required')
      return
    }

    if (!publicDescription.trim()) {
      setError('Public description is required')
      return
    }

    if (!user) {
      setError('You must be logged in')
      return
    }

    try {
      setLoading(true)

      const workOrderData: any = {
        property_id: selectedPropertyId,
        public_description: publicDescription.trim(),
        status: 'scheduled', // Landlord-created work orders start as scheduled
        created_by: user.id,
        created_by_role: 'landlord',
        visibility_to_tenants: visibilityToTenants,
      }

      // Add tenant_id only if selected
      if (selectedTenantId) {
        workOrderData.tenant_id = selectedTenantId
      }

      // Add category if provided
      if (category.trim()) {
        workOrderData.category = category.trim()
      }

      // Add internal notes if provided
      if (internalNotes.trim()) {
        workOrderData.internal_notes = internalNotes.trim()
      }

      // Add scheduled date if provided
      if (scheduledDate) {
        workOrderData.scheduled_date = scheduledDate
      }

      // Keep description for backward compatibility (migrated to public_description)
      workOrderData.description = publicDescription.trim()

      const { error: insertError } = await supabase
        .from('maintenance_requests')
        .insert(workOrderData)

      if (insertError) throw insertError

      onSubmit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create work order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Create Work Order</CardTitle>
            <CardDescription>Create a new maintenance request or work order</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="property">Property *</Label>
            {propertyId ? (
              // Show read-only property name when propertyId is provided
              <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm items-center">
                {properties.find(p => p.id === propertyId)?.name || 'Property'}
              </div>
            ) : (
              <select
                id="property"
                value={selectedPropertyId}
                onChange={e => {
                  setSelectedPropertyId(e.target.value)
                  setSelectedTenantId('') // Reset tenant when property changes
                }}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select a property</option>
                {properties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenant">Tenant (Optional)</Label>
            <select
              id="tenant"
              value={selectedTenantId}
              onChange={e => setSelectedTenantId(e.target.value)}
              disabled={!selectedPropertyId || propertyTenants.length === 0}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">No tenant assigned</option>
              {propertyTenants.map(tenant => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.user?.email || 'Tenant'}
                </option>
              ))}
            </select>
            {selectedPropertyId && propertyTenants.length === 0 && (
              <p className="text-xs text-muted-foreground">No tenants assigned to this property</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category (Optional)</Label>
            <Input
              id="category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="e.g., Plumbing, Electrical, HVAC"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="publicDescription">Public Description *</Label>
            <Textarea
              id="publicDescription"
              value={publicDescription}
              onChange={e => setPublicDescription(e.target.value)}
              placeholder="Description visible to tenants. Describe the maintenance issue or work needed..."
              required
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This description will be visible to tenants
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="internalNotes">Internal Notes (Optional)</Label>
            <Textarea
              id="internalNotes"
              value={internalNotes}
              onChange={e => setInternalNotes(e.target.value)}
              placeholder="Landlord-only notes. Not visible to tenants."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              These notes are only visible to landlords
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledDate">Scheduled Date (Optional)</Label>
            <Input
              id="scheduledDate"
              type="datetime-local"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">When maintenance is scheduled to occur</p>
          </div>

          <div className="flex items-center justify-between space-x-2 pt-2">
            <div className="space-y-0.5">
              <Label htmlFor="visibilityToTenants">Visible to Tenants</Label>
              <p className="text-xs text-muted-foreground">
                Make this work order visible to property tenants
              </p>
            </div>
            <Switch
              id="visibilityToTenants"
              checked={visibilityToTenants}
              onCheckedChange={setVisibilityToTenants}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create Work Order'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
