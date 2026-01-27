import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProperties } from '@/hooks/use-properties'
import { useTenants } from '@/hooks/use-tenants'
import { motion as motionTokens, durationToSeconds } from '@/lib/motion'
import type { Database } from '@/types/database'

type RentRecordInsert = Database['public']['Tables']['rent_records']['Insert']

interface RentRecordFormProps {
  onSubmit: (data: RentRecordInsert) => Promise<{ error: Error | null }>
  onCancel?: () => void
  initialData?: RentRecordInsert
  loading?: boolean
}

const PAYMENT_METHOD_LABELS = ['Zelle', 'Cash', 'Check', 'Venmo', 'Bank Transfer', 'Other'] as const

export function RentRecordForm({
  onSubmit,
  onCancel,
  initialData,
  loading = false,
}: RentRecordFormProps) {
  const { properties } = useProperties()
  const { tenants } = useTenants()
  const [propertyId, setPropertyId] = useState(initialData?.property_id || '')
  const [tenantId, setTenantId] = useState(initialData?.tenant_id || '')
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '')
  const [dueDate, setDueDate] = useState(
    initialData?.due_date || new Date().toISOString().split('T')[0]
  )
  const [status, setStatus] = useState<RentRecordInsert['status']>(initialData?.status || 'pending')
  const [paidDate, setPaidDate] = useState(initialData?.paid_date || '')
  const [paymentMethodType, setPaymentMethodType] = useState<'manual' | 'external' | ''>(
    initialData?.payment_method_type || ''
  )
  const [paymentMethodLabel, setPaymentMethodLabel] = useState(
    initialData?.payment_method_label || ''
  )
  const [customPaymentLabel, setCustomPaymentLabel] = useState('')
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [error, setError] = useState<string | null>(null)
  // buttonSpring removed - not used

  // Filter tenants by selected property
  const availableTenants = useMemo(() => {
    if (!propertyId) return []
    return tenants.filter(t => t.property_id === propertyId)
  }, [propertyId, tenants])

  // Auto-fill amount from property rent_amount when property changes
  useMemo(() => {
    if (propertyId && !amount) {
      const property = properties.find(p => p.id === propertyId)
      if (property?.rent_amount) {
        setAmount(property.rent_amount.toString())
      }
    }
  }, [propertyId, properties, amount])

  const handleSubmit = async (e: React.FormEvent) => {
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

    if (!amount || Number(amount) <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    if (!dueDate) {
      setError('Due date is required')
      return
    }

    if (status === 'paid' && !paidDate) {
      setError('Paid date is required when status is paid')
      return
    }

    if (paymentMethodType === 'external' && !paymentMethodLabel && !customPaymentLabel) {
      setError('Payment method label is required for external payments')
      return
    }

    const finalPaymentLabel =
      paymentMethodType === 'external'
        ? paymentMethodLabel === 'Other'
          ? customPaymentLabel.trim()
          : paymentMethodLabel
        : null

    const result = await onSubmit({
      property_id: propertyId,
      tenant_id: tenantId,
      amount: Number(amount),
      due_date: dueDate,
      status,
      paid_date: status === 'paid' ? paidDate || null : null,
      payment_method_type: paymentMethodType || null,
      payment_method_label: finalPaymentLabel || null,
      notes: notes.trim() || null,
    })

    if (result.error) {
      setError(result.error.message)
    } else {
      // Reset form if no error and no initial data
      if (!initialData) {
        setPropertyId('')
        setTenantId('')
        setAmount('')
        setDueDate(new Date().toISOString().split('T')[0])
        setStatus('pending')
        setPaidDate('')
        setPaymentMethodType('')
        setPaymentMethodLabel('')
        setCustomPaymentLabel('')
        setNotes('')
      }
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      transition={{
        duration: durationToSeconds(motionTokens.duration.base),
        ease: motionTokens.ease.standard,
      }}
      className="space-y-4"
    >
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/20 rounded-md border border-destructive/30">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="property_id" className="text-sm font-medium text-foreground">
            Property *
          </label>
          <select
            id="property_id"
            value={propertyId}
            onChange={e => setPropertyId(e.target.value)}
            disabled={loading}
            className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          >
            <option value="">Select property</option>
            {properties.map(property => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="tenant_id" className="text-sm font-medium text-foreground">
            Tenant *
          </label>
          <select
            id="tenant_id"
            value={tenantId}
            onChange={e => setTenantId(e.target.value)}
            disabled={loading || !propertyId}
            className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          >
            <option value="">Select tenant</option>
            {availableTenants.map(tenant => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.user?.email || 'Unknown Tenant'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="amount" className="text-sm font-medium text-foreground">
            Amount *
          </label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="due_date" className="text-sm font-medium text-foreground">
            Due Date *
          </label>
          <Input
            id="due_date"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-medium text-foreground">
            Status *
          </label>
          <select
            id="status"
            value={status}
            onChange={e => setStatus(e.target.value as RentRecordInsert['status'])}
            disabled={loading}
            className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          >
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {status === 'paid' && (
          <div className="space-y-2">
            <label htmlFor="paid_date" className="text-sm font-medium text-foreground">
              Paid Date *
            </label>
            <Input
              id="paid_date"
              type="date"
              value={paidDate}
              onChange={e => setPaidDate(e.target.value)}
              required={status === 'paid'}
              disabled={loading}
            />
          </div>
        )}
      </div>

      {status === 'paid' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="payment_method_type" className="text-sm font-medium text-foreground">
              Payment Method Type
            </label>
            <select
              id="payment_method_type"
              value={paymentMethodType}
              onChange={e => {
                const value = e.target.value as 'manual' | 'external' | ''
                setPaymentMethodType(value)
                if (value === 'manual') {
                  setPaymentMethodLabel('')
                  setCustomPaymentLabel('')
                }
              }}
              disabled={loading}
              className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select type</option>
              <option value="manual">Manual</option>
              <option value="external">External</option>
            </select>
          </div>

          {paymentMethodType === 'external' && (
            <div className="space-y-2">
              <label htmlFor="payment_method_label" className="text-sm font-medium text-foreground">
                Payment Method Label
              </label>
              <select
                id="payment_method_label"
                value={paymentMethodLabel}
                onChange={e => setPaymentMethodLabel(e.target.value)}
                disabled={loading}
                className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select payment method</option>
                {PAYMENT_METHOD_LABELS.map(label => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
              {paymentMethodLabel === 'Other' && (
                <Input
                  placeholder="Enter custom payment method"
                  value={customPaymentLabel}
                  onChange={e => setCustomPaymentLabel(e.target.value)}
                  disabled={loading}
                  className="mt-2"
                />
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium text-foreground">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Additional notes about this rent payment..."
          rows={3}
          disabled={loading}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {initialData ? 'Update' : 'Create'} Rent Record
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </div>
    </motion.form>
  )
}
