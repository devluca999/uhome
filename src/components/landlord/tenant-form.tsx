import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useProperties } from '@/hooks/use-properties'
import { supabase } from '@/lib/supabase/client'

interface TenantFormProps {
  onSubmit: (data: {
    user_id: string
    property_id: string
    move_in_date: string
    lease_end_date?: string
  }) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function TenantForm({ onSubmit, onCancel, loading }: TenantFormProps) {
  const { properties } = useProperties()
  const [email, setEmail] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [moveInDate, setMoveInDate] = useState('')
  const [leaseEndDate, setLeaseEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)

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
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tenant')
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Add Tenant</CardTitle>
        <CardDescription>Assign a tenant to a property</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-stone-700">
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
              <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">Found: {user.email}</p>
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
            <label htmlFor="property" className="text-sm font-medium text-stone-700">
              Property *
            </label>
            <select
              id="property"
              value={propertyId}
              onChange={e => setPropertyId(e.target.value)}
              disabled={loading || properties.length === 0}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {properties.length === 0 ? (
                <option value="">No properties available</option>
              ) : (
                properties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="move_in_date" className="text-sm font-medium text-stone-700">
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
              <label htmlFor="lease_end_date" className="text-sm font-medium text-stone-700">
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

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading || !user || !propertyId} className="flex-1">
              {loading ? 'Adding...' : 'Add Tenant'}
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
