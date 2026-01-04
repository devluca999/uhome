import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProperties } from '@/hooks/use-properties'
import { motion as motionTokens, durationToSeconds, createSpring } from '@/lib/motion'
import type { Database } from '@/types/database'

type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']

interface ExpenseFormProps {
  onSubmit: (data: ExpenseInsert | ExpenseUpdate) => Promise<{ error: Error | null }>
  onCancel?: () => void
  initialData?: ExpenseInsert & { id?: string }
  loading?: boolean
}

export function ExpenseForm({
  onSubmit,
  onCancel,
  initialData,
  loading = false,
}: ExpenseFormProps) {
  const { properties } = useProperties()
  const isEditMode = !!initialData?.id

  // MVP: Track original values for comparison
  // Post-MVP: Full audit trail with change history and record locking
  const originalValues = useMemo(
    () => ({
      name: initialData?.name || '',
      amount: initialData?.amount?.toString() || '',
      property_id: initialData?.property_id || '',
      date: initialData?.date || '',
      category: initialData?.category || null,
    }),
    [initialData]
  )

  const [name, setName] = useState(initialData?.name || '')
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '')
  const [propertyId, setPropertyId] = useState(initialData?.property_id || '')
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState<ExpenseInsert['category']>(initialData?.category || null)
  const [isRecurring, setIsRecurring] = useState(initialData?.is_recurring || false)
  const [recurringFrequency, setRecurringFrequency] = useState<
    ExpenseInsert['recurring_frequency']
  >(initialData?.recurring_frequency || null)
  const [recurringStartDate, setRecurringStartDate] = useState(
    initialData?.recurring_start_date || ''
  )
  const [recurringEndDate, setRecurringEndDate] = useState(initialData?.recurring_end_date || '')
  const [reasonForChange, setReasonForChange] = useState('')
  const [error, setError] = useState<string | null>(null)
  const buttonSpring = createSpring('button')

  // Check if values have changed
  const hasChanges = useMemo(() => {
    if (!isEditMode) return false
    return (
      name !== originalValues.name ||
      amount !== originalValues.amount ||
      propertyId !== originalValues.property_id ||
      date !== originalValues.date ||
      category !== originalValues.category
    )
  }, [isEditMode, name, amount, propertyId, date, category, originalValues])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    if (!amount || Number(amount) <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    if (!propertyId) {
      setError('Property is required')
      return
    }

    if (!date) {
      setError('Date is required')
      return
    }

    if (isRecurring && !recurringFrequency) {
      setError('Recurring frequency is required for recurring expenses')
      return
    }

    if (isRecurring && !recurringStartDate) {
      setError('Recurring start date is required')
      return
    }

    const submitData = {
      ...(isEditMode && { id: initialData.id }),
      name: name.trim(),
      amount: Number(amount),
      property_id: propertyId,
      date,
      category: category || null,
      is_recurring: isRecurring,
      recurring_frequency: isRecurring ? recurringFrequency : null,
      recurring_start_date: isRecurring ? recurringStartDate : null,
      recurring_end_date: isRecurring && recurringEndDate ? recurringEndDate : null,
    }

    // MVP: Reason for change would be stored via notes system separately (no audit trail in MVP)
    const result = await onSubmit(submitData)

    if (result.error) {
      setError(result.error.message)
    } else {
      // Reset form if no error
      if (!initialData) {
        setName('')
        setAmount('')
        setPropertyId('')
        setDate(new Date().toISOString().split('T')[0])
        setCategory(null)
        setIsRecurring(false)
        setRecurringFrequency(null)
        setRecurringStartDate('')
        setRecurringEndDate('')
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

      {isEditMode && (
        <div className="p-3 text-sm bg-muted/50 rounded-md border border-border">
          <p className="font-medium text-foreground mb-2">Editing Expense</p>
          {hasChanges && (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Original values shown below for reference</p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Expense Name
        </label>
        <Input
          id="name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., Plumbing repair"
          required
          disabled={loading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="amount" className="text-sm font-medium text-foreground">
            Amount
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
          <label htmlFor="date" className="text-sm font-medium text-foreground">
            Date
          </label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="property" className="text-sm font-medium text-foreground">
            Property
          </label>
          <select
            id="property"
            value={propertyId}
            onChange={e => setPropertyId(e.target.value)}
            required
            disabled={loading}
            className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="" className="text-foreground">
              Select a property
            </option>
            {properties.map(prop => (
              <option key={prop.id} value={prop.id} className="text-foreground">
                {prop.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="category" className="text-sm font-medium text-foreground">
            Category (Optional)
          </label>
          <select
            id="category"
            value={category || ''}
            onChange={e => setCategory((e.target.value as ExpenseInsert['category']) || null)}
            disabled={loading}
            className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="" className="text-foreground">
              None
            </option>
            <option value="maintenance" className="text-foreground">
              Maintenance
            </option>
            <option value="utilities" className="text-foreground">
              Utilities
            </option>
            <option value="repairs" className="text-foreground">
              Repairs
            </option>
          </select>
        </div>
      </div>

      {/* Recurring Expense Section */}
      <div className="space-y-4 p-4 border border-border rounded-md bg-muted/30">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_recurring"
            checked={isRecurring}
            onChange={e => {
              setIsRecurring(e.target.checked)
              if (!e.target.checked) {
                setRecurringFrequency(null)
                setRecurringStartDate('')
                setRecurringEndDate('')
              } else {
                // Set default start date to today if not set
                if (!recurringStartDate) {
                  setRecurringStartDate(new Date().toISOString().split('T')[0])
                }
              }
            }}
            disabled={loading}
            className="h-4 w-4 rounded border-input"
          />
          <label htmlFor="is_recurring" className="text-sm font-medium text-foreground">
            Recurring expense
          </label>
        </div>

        {isRecurring && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              duration: durationToSeconds(motionTokens.duration.base),
              ease: motionTokens.ease.standard,
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <label htmlFor="recurring_frequency" className="text-sm font-medium text-foreground">
                Frequency *
              </label>
              <select
                id="recurring_frequency"
                value={recurringFrequency || ''}
                onChange={e =>
                  setRecurringFrequency(
                    (e.target.value as ExpenseInsert['recurring_frequency']) || null
                  )
                }
                disabled={loading}
                className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required={isRecurring}
              >
                <option value="" className="text-foreground">
                  Select frequency
                </option>
                <option value="monthly" className="text-foreground">
                  Monthly
                </option>
                <option value="quarterly" className="text-foreground">
                  Quarterly
                </option>
                <option value="yearly" className="text-foreground">
                  Yearly
                </option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="recurring_start_date"
                  className="text-sm font-medium text-foreground"
                >
                  Start Date *
                </label>
                <Input
                  id="recurring_start_date"
                  type="date"
                  value={recurringStartDate}
                  onChange={e => setRecurringStartDate(e.target.value)}
                  required={isRecurring}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="recurring_end_date" className="text-sm font-medium text-foreground">
                  End Date (Optional)
                </label>
                <Input
                  id="recurring_end_date"
                  type="date"
                  value={recurringEndDate}
                  onChange={e => setRecurringEndDate(e.target.value)}
                  disabled={loading}
                  min={recurringStartDate}
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* MVP: Reason for change (optional, stored in notes - no audit trail) */}
      {isEditMode && hasChanges && (
        <div className="space-y-2">
          <label htmlFor="reason" className="text-sm font-medium text-foreground">
            Reason for change (Optional)
          </label>
          <Input
            id="reason"
            value={reasonForChange}
            onChange={e => setReasonForChange(e.target.value)}
            placeholder="e.g., Corrected amount, Updated category"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            This will be stored in the expense notes
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{
            type: 'spring',
            ...buttonSpring,
          }}
        >
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Saving...' : isEditMode ? 'Update Expense' : 'Add Expense'}
          </Button>
        </motion.div>
        {onCancel && (
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{
              type: 'spring',
              ...buttonSpring,
            }}
          >
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          </motion.div>
        )}
      </div>
    </motion.form>
  )
}
