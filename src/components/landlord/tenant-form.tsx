import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useProperties } from '@/hooks/use-properties'
import { supabase } from '@/lib/supabase/client'

interface TenantFormProps {
  tenant?: {
    id: string
    user_id: string
    property_id: string
    move_in_date: string
    lease_end_date?: string | null
    phone?: string | null
    notes?: string | null
  } | null
  onSubmit: (data: {
    user_id: string
    property_id: string
    move_in_date: string
    lease_end_date?: string
    phone?: string
    notes?: string
  }) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function TenantForm({ tenant, onSubmit, onCancel, loading }: TenantFormProps) {
  const { properties } = useProperties()
  const [email, setEmail] = useState('')
  const [propertyId, setPropertyId] = useState(tenant?.property_id || '')
  const [moveInDate, setMoveInDate] = useState(tenant?.move_in_date || '')
  const [leaseEndDate, setLeaseEndDate] = useState(tenant?.lease_end_date || '')
  const [phone, setPhone] = useState(tenant?.phone || '')
  const [notes, setNotes] = useState(tenant?.notes || '')
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)

  useEffect(() => {
    if (tenant?.user_id) {
      // Load user email if editing existing tenant
      supabase
        .from('users')
        .select('id, email')
        .eq('id', tenant.user_id)
        .single()
        .then(({ data }) => {
          if (data) {
            setUser(data)
            setEmail(data.email || '')
          }
        })
    }
  }, [tenant])

  useEffect(() => {
    if (properties.length > 0 && !propertyId) {
      setPropertyId(properties[0].id)
    }
  }, [properties, propertyId])

  async function handleEmailSearch() {
    if (!email.trim()) {
      setError('Please enter an email address')
      return
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email.trim())
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          setError('User not found. Please make sure the tenant has an account.')
        } else {
          throw error
        }
        return
      }

      setUser(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error finding user')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!user) {
      setError('Please search for and select a tenant first')
      return
    }

    if (!propertyId) {
      setError('Please select a property')
      return
    }

    if (!moveInDate) {
      setError('Move-in date is required')
      return
    }

    try {
      await onSubmit({
        user_id: user.id,
        property_id: propertyId,
        move_in_date: moveInDate,
        lease_end_date: leaseEndDate || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tenant')
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>{tenant ? 'Edit Tenant' : 'Add Tenant'}</CardTitle>
        <CardDescription>
          {tenant ? 'Update tenant information' : 'Assign a tenant to a property'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/30">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Tenant Email *
            </label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value)
                  setUser(null)
                }}
                placeholder="tenant@example.com"
                disabled={loading || !!user}
              />
              {!user && (
                <Button type="button" onClick={handleEmailSearch} disabled={loading}>
                  Search
                </Button>
              )}
            </div>
            {user && (
              <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm text-green-700 dark:text-green-400">Found: {user.email}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUser(null)
                    setEmail('')
                  }}
                  className="mt-1 text-xs"
                >
                  Change
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="property" className="text-sm font-medium text-foreground">
              Property *
            </label>
            <select
              id="property"
              value={propertyId}
              onChange={e => setPropertyId(e.target.value)}
              disabled={loading || properties.length === 0}
              className="flex h-9 w-full rounded-md border border-input bg-transparent text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {properties.length === 0 ? (
                <option value="" className="text-foreground">
                  No properties available
                </option>
              ) : (
                properties.map(property => (
                  <option key={property.id} value={property.id} className="text-foreground">
                    {property.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="move_in_date" className="text-sm font-medium text-foreground">
                Move-in Date *
              </label>
              <Input
                id="move_in_date"
                type="date"
                value={moveInDate}
                onChange={e => setMoveInDate(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="lease_end_date" className="text-sm font-medium text-foreground">
                Lease End Date
              </label>
              <Input
                id="lease_end_date"
                type="date"
                value={leaseEndDate}
                onChange={e => setLeaseEndDate(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium text-foreground">
              Phone
            </label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium text-foreground">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional notes about the tenant (markdown supported)..."
              rows={4}
              disabled={loading}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading || !user || !propertyId} className="flex-1">
              {loading
                ? tenant
                  ? 'Saving...'
                  : 'Adding...'
                : tenant
                  ? 'Save Changes'
                  : 'Add Tenant'}
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
