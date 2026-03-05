import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PropertyTypeSelect } from './property-type-select'
import { PropertyGroupSelect } from './property-group-select'
import { usePropertyGroupAssignments } from '@/hooks/use-property-groups'
import type { Database } from '@/types/database'

type Property = Database['public']['Tables']['properties']['Row']

interface PropertyFormProps {
  property?: Property | null
  onSubmit: (data: {
    name: string
    address?: string
    rent_amount: number
    rent_due_date?: number
    rules?: string
    property_type?: string | null
    group_ids?: string[]
  }) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function PropertyForm({ property, onSubmit, onCancel, loading }: PropertyFormProps) {
  const [name, setName] = useState(property?.name || '')
  const [address, setAddress] = useState(property?.address || '')
  const [rentAmount, setRentAmount] = useState(property?.rent_amount?.toString() || '')
  const [rentDueDate, setRentDueDate] = useState(property?.rent_due_date?.toString() || '')
  const [rules, setRules] = useState(property?.rules || '')
  const [propertyType, setPropertyType] = useState(property?.property_type || null)
  const [groupIds, setGroupIds] = useState<string[]>([])
  const { assignments } = usePropertyGroupAssignments(property?.id)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (property?.id && assignments.length > 0) {
      setGroupIds(assignments)
    }
  }, [property?.id, assignments])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Property name is required')
      return
    }

    const rentAmountNum = parseFloat(rentAmount)
    if (!rentAmount || isNaN(rentAmountNum) || rentAmountNum <= 0) {
      setError('Valid rent amount is required')
      return
    }

    const rentDueDateNum = rentDueDate ? parseInt(rentDueDate) : undefined
    if (rentDueDateNum && (rentDueDateNum < 1 || rentDueDateNum > 31)) {
      setError('Rent due date must be between 1 and 31')
      return
    }

    try {
      await onSubmit({
        name: name.trim(),
        address: address.trim() || undefined,
        rent_amount: rentAmountNum,
        rent_due_date: rentDueDateNum,
        rules: rules.trim() || undefined,
        property_type: propertyType || undefined,
        group_ids: groupIds,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save property')
    }
  }

  return (
    <Card className="glass-card relative z-20" data-testid="property-form">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{property ? 'Edit Property' : 'Add New Property'}</CardTitle>
            <CardDescription>
              {property ? 'Update property information' : 'Create a new property listing'}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={loading}
            className="shrink-0"
          >
            Back to list
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/30">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              Property Name *
            </label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., 123 Main Street"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="address" className="text-sm font-medium text-foreground">
              Address
            </label>
            <Input
              id="address"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Full address (optional)"
              disabled={loading}
            />
          </div>
          <PropertyTypeSelect value={propertyType} onChange={setPropertyType} disabled={loading} />
          <PropertyGroupSelect
            propertyId={property?.id}
            value={groupIds}
            onChange={setGroupIds}
            disabled={loading}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="rent_amount" className="text-sm font-medium text-foreground">
                Monthly Rent *
              </label>
              <Input
                id="rent_amount"
                type="number"
                min="0"
                step="0.01"
                value={rentAmount}
                onChange={e => setRentAmount(e.target.value)}
                placeholder="0.00"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="rent_due_date" className="text-sm font-medium text-foreground">
                Rent Due Date
              </label>
              <Input
                id="rent_due_date"
                type="number"
                min="1"
                max="31"
                value={rentDueDate}
                onChange={e => setRentDueDate(e.target.value)}
                placeholder="Day of month"
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="rules" className="text-sm font-medium text-foreground">
              House Rules / Considerations
            </label>
            <textarea
              id="rules"
              value={rules}
              onChange={e => setRules(e.target.value)}
              placeholder="Rules and considerations visible to tenants..."
              rows={4}
              disabled={loading}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="flex gap-2 pt-2 relative z-20">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : property ? 'Update Property' : 'Create Property'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              data-testid="property-form-cancel"
              className="relative z-20"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
