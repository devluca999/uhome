import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'

interface MaintenanceRequestFormProps {
  propertyId?: string
  tenantId?: string
  leaseId?: string
  onSubmit: () => void
  onCancel: () => void
}

export function MaintenanceRequestForm({
  propertyId,
  tenantId,
  leaseId,
  onSubmit,
  onCancel,
}: MaintenanceRequestFormProps) {
  const { user } = useAuth()
  const [category, setCategory] = useState('')
  const [publicDescription, setPublicDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!publicDescription.trim()) {
      setError('Description is required')
      return
    }

    if (!user) {
      setError('You must be logged in')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.from('maintenance_requests').insert({
        lease_id: leaseId || null,
        property_id: propertyId || null,
        tenant_id: tenantId || null,
        category: category.trim() || null,
        public_description: publicDescription.trim(),
        description: publicDescription.trim(), // Keep for backward compatibility
        status: 'submitted', // Tenant-created work orders start as submitted
        created_by: user.id,
        created_by_role: 'tenant',
        visibility_to_tenants: true, // Tenant-created requests are always visible
      })

      if (error) throw error

      onSubmit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Submit Maintenance Request</CardTitle>
        <CardDescription>Report an issue or request maintenance</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium text-stone-700">
              Category (optional)
            </label>
            <Input
              id="category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="e.g., Plumbing, Electrical, HVAC"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="publicDescription" className="text-sm font-medium text-stone-700">
              Description *
            </label>
            <textarea
              id="publicDescription"
              value={publicDescription}
              onChange={e => setPublicDescription(e.target.value)}
              placeholder="Describe the issue or maintenance needed..."
              rows={6}
              required
              disabled={loading}
              className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Submitting...' : 'Submit Request'}
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
