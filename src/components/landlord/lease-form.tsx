import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useProperties } from '@/hooks/use-properties'
import { useTenants } from '@/hooks/use-tenants'
import { useLeases } from '@/hooks/use-leases'
import type { Database } from '@/types/database'

type Lease = Database['public']['Tables']['leases']['Row']
type LeaseInsert = Database['public']['Tables']['leases']['Insert']

interface LeaseFormProps {
  lease?: Lease | null
  propertyId?: string
  tenantId?: string
  onSubmit: (data: LeaseInsert) => Promise<{ error: Error | null }>
  onCancel: () => void
  loading?: boolean
}

export function LeaseForm({
  lease,
  propertyId: initialPropertyId,
  tenantId: initialTenantId,
  onSubmit,
  onCancel,
  loading,
}: LeaseFormProps) {
  const { properties } = useProperties()
  const { tenants } = useTenants()
  const [propertyId, setPropertyId] = useState(lease?.property_id || initialPropertyId || '')
  const [tenantId, setTenantId] = useState(lease?.tenant_id || initialTenantId || '')
  const [leaseStartDate, setLeaseStartDate] = useState(lease?.lease_start_date || '')
  const [leaseEndDate, setLeaseEndDate] = useState(lease?.lease_end_date || '')
  const [leaseType, setLeaseType] = useState<Lease['lease_type']>(lease?.lease_type || 'long-term')
  const [rentAmount, setRentAmount] = useState(lease?.rent_amount?.toString() || '')
  const [rentFrequency, setRentFrequency] = useState<Lease['rent_frequency']>(
    lease?.rent_frequency || 'monthly'
  )
  const [securityDeposit, setSecurityDeposit] = useState(lease?.security_deposit?.toString() || '')
  const [error, setError] = useState<string | null>(null)

  // Filter tenants by selected property
  const availableTenants = propertyId ? tenants.filter(t => t.property_id === propertyId) : []

  useEffect(() => {
    if (initialPropertyId && !propertyId) {
      setPropertyId(initialPropertyId)
    }
    if (initialTenantId && !tenantId) {
      setTenantId(initialTenantId)
    }
  }, [initialPropertyId, initialTenantId, propertyId, tenantId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!propertyId) {
      setError('Property is required')
      return
    }

    if (!tenantId) {
      setError('Tenant is required')
      return
    }

    if (!leaseStartDate) {
      setError('Lease start date is required')
      return
    }

    const rentAmountNum = parseFloat(rentAmount)
    if (!rentAmount || isNaN(rentAmountNum) || rentAmountNum <= 0) {
      setError('Valid rent amount is required')
      return
    }

    const securityDepositNum = securityDeposit ? parseFloat(securityDeposit) : null
    if (securityDeposit && (isNaN(securityDepositNum!) || securityDepositNum! < 0)) {
      setError('Security deposit must be a positive number')
      return
    }

    const result = await onSubmit({
      property_id: propertyId,
      tenant_id: tenantId,
      lease_start_date: leaseStartDate,
      lease_end_date: leaseEndDate || null,
      lease_type: leaseType,
      rent_amount: rentAmountNum,
      rent_frequency: rentFrequency,
      security_deposit: securityDepositNum,
    })

    if (result.error) {
      setError(result.error.message)
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>{lease ? 'Edit Lease' : 'Add Lease Metadata'}</CardTitle>
        <CardDescription>
          {lease
            ? 'Update lease information'
            : 'Record lease details (descriptive only, not a legal document)'}
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
            <label htmlFor="property" className="text-sm font-medium text-foreground">
              Property *
            </label>
            <select
              id="property"
              value={propertyId}
              onChange={e => {
                setPropertyId(e.target.value)
                setTenantId('') // Reset tenant when property changes
              }}
              disabled={loading || !!initialPropertyId}
              className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="" className="text-foreground">
                Select property...
              </option>
              {properties.map(prop => (
                <option key={prop.id} value={prop.id} className="text-foreground">
                  {prop.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="tenant" className="text-sm font-medium text-foreground">
              Tenant *
            </label>
            <select
              id="tenant"
              value={tenantId}
              onChange={e => setTenantId(e.target.value)}
              disabled={loading || !propertyId || !!initialTenantId}
              className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="" className="text-foreground">
                Select tenant...
              </option>
              {availableTenants.map(tenant => (
                <option key={tenant.id} value={tenant.id} className="text-foreground">
                  {tenant.user?.email || 'Tenant'}
                </option>
              ))}
            </select>
            {propertyId && availableTenants.length === 0 && (
              <p className="text-xs text-muted-foreground">No tenants assigned to this property</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="lease_start_date" className="text-sm font-medium text-foreground">
                Lease Start Date *
              </label>
              <Input
                id="lease_start_date"
                type="date"
                value={leaseStartDate}
                onChange={e => setLeaseStartDate(e.target.value)}
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
            <label htmlFor="lease_type" className="text-sm font-medium text-foreground">
              Lease Type *
            </label>
            <select
              id="lease_type"
              value={leaseType}
              onChange={e => setLeaseType(e.target.value as Lease['lease_type'])}
              disabled={loading}
              className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="long-term" className="text-foreground">
                Long-term
              </option>
              <option value="short-term" className="text-foreground">
                Short-term
              </option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="rent_amount" className="text-sm font-medium text-foreground">
                Rent Amount *
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
              <label htmlFor="rent_frequency" className="text-sm font-medium text-foreground">
                Rent Frequency *
              </label>
              <select
                id="rent_frequency"
                value={rentFrequency}
                onChange={e => setRentFrequency(e.target.value as Lease['rent_frequency'])}
                disabled={loading}
                className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="monthly" className="text-foreground">
                  Monthly
                </option>
                <option value="weekly" className="text-foreground">
                  Weekly
                </option>
                <option value="biweekly" className="text-foreground">
                  Biweekly
                </option>
                <option value="yearly" className="text-foreground">
                  Yearly
                </option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="security_deposit" className="text-sm font-medium text-foreground">
              Security Deposit
            </label>
            <Input
              id="security_deposit"
              type="number"
              min="0"
              step="0.01"
              value={securityDeposit}
              onChange={e => setSecurityDeposit(e.target.value)}
              placeholder="0.00"
              disabled={loading}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (lease ? 'Saving...' : 'Adding...') : lease ? 'Save Changes' : 'Add Lease'}
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
