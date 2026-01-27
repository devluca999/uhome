import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { ReflectiveGradient } from '@/components/ui/reflective-gradient'
import { Button } from '@/components/ui/button'
import { X, DollarSign, Calendar, MapPin } from 'lucide-react'
import { motionTokens, durationToSeconds, createSpring } from '@/lib/motion'
import { useReducedMotion } from '@/lib/motion'
import { useModalScrollLock } from '@/hooks/use-modal-scroll-lock'
import {
  filterRentRecords,
  filterExpenses,
  calculateProjectedExpenses,
  calculateActiveProperties,
  calculateOccupancyRate,
  type FinanceFilters,
} from '@/lib/finance-calculations'
// cn removed - not used
import type { RentRecordWithRelations } from '@/hooks/use-landlord-rent-records'
import type { Database } from '@/types/database'

type Expense = Database['public']['Tables']['expenses']['Row']
type Property = Database['public']['Tables']['properties']['Row']

interface RentSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  metricType:
    | 'collected'
    | 'outstanding'
    | 'expenses'
    | 'net'
    | 'projected'
    | 'activeProperties'
    | 'occupancy'
  dateRange?: {
    start: Date
    end: Date
  }
  propertyId?: string
  properties?: Array<{ id: string; name: string }>
  rentRecords?: RentRecordWithRelations[]
  expenses?: Expense[]
  tenants?: Array<{ id: string; property_id: string; user?: { email?: string } | null }>
}

/**
 * Rent Summary Modal
 *
 * Shows filtered details for the selected financial metric.
 * Respects current date range and property filters.
 */
export function RentSummaryModal({
  isOpen,
  onClose,
  metricType,
  dateRange,
  propertyId,
  properties = [],
  rentRecords = [],
  expenses = [],
  tenants = [],
}: RentSummaryModalProps) {
  const navigate = useNavigate()
  const cardSpring = createSpring('card')
  const prefersReducedMotion = useReducedMotion()

  // Lock body scroll when modal is open
  useModalScrollLock(isOpen)

  // Filter data based on modal filters
  const filters: FinanceFilters = useMemo(
    () => ({
      propertyId,
      dateRange,
    }),
    [propertyId, dateRange]
  )

  const filteredRentRecords = useMemo(() => {
    return filterRentRecords(rentRecords, filters)
  }, [rentRecords, filters])

  const filteredExpenses = useMemo(() => {
    return filterExpenses(expenses, filters)
  }, [expenses, filters])

  // Calculate breakdown data based on metric type
  const breakdownData = useMemo(() => {
    switch (metricType) {
      case 'collected': {
        const paidRecords = filteredRentRecords.filter(r => r.status === 'paid')
        const byProperty = new Map<
          string,
          { amount: number; count: number; records: RentRecordWithRelations[] }
        >()

        paidRecords.forEach(record => {
          const propId = record.property_id
          const existing = byProperty.get(propId) || { amount: 0, count: 0, records: [] }
          const amount = Number(record.amount) + (Number(record.late_fee) || 0)
          byProperty.set(propId, {
            amount: existing.amount + amount,
            count: existing.count + 1,
            records: [...existing.records, record],
          })
        })

        return {
          total: paidRecords.reduce(
            (sum, r) => sum + Number(r.amount) + (Number(r.late_fee) || 0),
            0
          ),
          byProperty: Array.from(byProperty.entries()).map(([propId, data]) => ({
            property: properties.find(p => p.id === propId)?.name || 'Unknown',
            amount: data.amount,
            count: data.count,
            records: data.records,
          })),
          transactions: paidRecords.sort((a, b) => {
            const dateA = a.paid_date ? new Date(a.paid_date).getTime() : 0
            const dateB = b.paid_date ? new Date(b.paid_date).getTime() : 0
            return dateB - dateA
          }),
        }
      }
      case 'outstanding': {
        const overdueRecords = filteredRentRecords.filter(r => r.status === 'overdue')
        const byProperty = new Map<
          string,
          { amount: number; count: number; records: RentRecordWithRelations[] }
        >()

        overdueRecords.forEach(record => {
          const propId = record.property_id
          const existing = byProperty.get(propId) || { amount: 0, count: 0, records: [] }
          const amount = Number(record.amount) + (Number(record.late_fee) || 0)
          byProperty.set(propId, {
            amount: existing.amount + amount,
            count: existing.count + 1,
            records: [...existing.records, record],
          })
        })

        return {
          total: overdueRecords.reduce(
            (sum, r) => sum + Number(r.amount) + (Number(r.late_fee) || 0),
            0
          ),
          byProperty: Array.from(byProperty.entries()).map(([propId, data]) => ({
            property: properties.find(p => p.id === propId)?.name || 'Unknown',
            amount: data.amount,
            count: data.count,
            records: data.records,
          })),
          transactions: overdueRecords.sort((a, b) => {
            const dateA = new Date(a.due_date).getTime()
            const dateB = new Date(b.due_date).getTime()
            return dateB - dateA
          }),
        }
      }
      case 'expenses': {
        const byProperty = new Map<string, { amount: number; count: number; expenses: Expense[] }>()
        const byCategory = new Map<string, { amount: number; count: number }>()

        filteredExpenses.forEach(expense => {
          const propId = expense.property_id
          const category = expense.category || 'uncategorized'

          // By property
          const propExisting = byProperty.get(propId) || { amount: 0, count: 0, expenses: [] }
          byProperty.set(propId, {
            amount: propExisting.amount + Number(expense.amount),
            count: propExisting.count + 1,
            expenses: [...propExisting.expenses, expense],
          })

          // By category
          const catExisting = byCategory.get(category) || { amount: 0, count: 0 }
          byCategory.set(category, {
            amount: catExisting.amount + Number(expense.amount),
            count: catExisting.count + 1,
          })
        })

        return {
          total: filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
          byProperty: Array.from(byProperty.entries()).map(([propId, data]) => ({
            property: properties.find(p => p.id === propId)?.name || 'Unknown',
            amount: data.amount,
            count: data.count,
            expenses: data.expenses,
          })),
          byCategory: Array.from(byCategory.entries()).map(([category, data]) => ({
            category: category.charAt(0).toUpperCase() + category.slice(1),
            amount: data.amount,
            count: data.count,
          })),
          transactions: filteredExpenses.sort((a, b) => {
            const dateA = new Date(a.date).getTime()
            const dateB = new Date(b.date).getTime()
            return dateB - dateA
          }),
        }
      }
      case 'net': {
        const collected = filteredRentRecords
          .filter(r => r.status === 'paid')
          .reduce((sum, r) => sum + Number(r.amount) + (Number(r.late_fee) || 0), 0)
        const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
        return {
          total: collected - totalExpenses,
          income: collected,
          expenses: totalExpenses,
        }
      }
      case 'projected': {
        // Projected Income: Upcoming rent (pending rent records)
        const upcomingRecords = filteredRentRecords.filter(r => r.status === 'pending')
        const projectedIncome = upcomingRecords.reduce((sum, r) => sum + Number(r.amount), 0)

        // Projected Expenses: Recurring expenses for next 30 days
        const projectedExpenses = calculateProjectedExpenses(expenses, 30, filters)
        const projectedNet = projectedIncome - projectedExpenses

        // Group projected income by property
        const incomeByProperty = new Map<
          string,
          { amount: number; count: number; records: RentRecordWithRelations[] }
        >()
        upcomingRecords.forEach(record => {
          const propId = record.property_id
          const existing = incomeByProperty.get(propId) || { amount: 0, count: 0, records: [] }
          incomeByProperty.set(propId, {
            amount: existing.amount + Number(record.amount),
            count: existing.count + 1,
            records: [...existing.records, record],
          })
        })

        // Group projected expenses by property
        const expensesByProperty = new Map<string, { amount: number; expenses: Expense[] }>()
        const recurringExpenses = expenses.filter(e => e.is_recurring)
        const filteredRecurring = filterExpenses(recurringExpenses, filters)

        // Calculate projected expenses per property for next 30 days
        filteredRecurring.forEach(expense => {
          const propId = expense.property_id
          const existing = expensesByProperty.get(propId) || { amount: 0, expenses: [] }
          // For each recurring expense, calculate occurrences in next 30 days
          const now = new Date()
          const endDate = new Date(now)
          endDate.setDate(endDate.getDate() + 30)

          if (
            expense.recurring_start_date &&
            expense.recurring_frequency &&
            (!expense.recurring_end_date || new Date(expense.recurring_end_date) >= now)
          ) {
            const startDate = new Date(expense.recurring_start_date)
            const endRecurringDate = expense.recurring_end_date
              ? new Date(expense.recurring_end_date)
              : null

            if (startDate <= endDate && (!endRecurringDate || endRecurringDate >= now)) {
              const periodStart = startDate > now ? startDate : now
              const periodEnd =
                endRecurringDate && endRecurringDate < endDate ? endRecurringDate : endDate

              let occurrences = 0
              const current = new Date(periodStart)

              while (current <= periodEnd) {
                occurrences++

                switch (expense.recurring_frequency) {
                  case 'monthly':
                    current.setMonth(current.getMonth() + 1)
                    break
                  case 'quarterly':
                    current.setMonth(current.getMonth() + 3)
                    break
                  case 'yearly':
                    current.setFullYear(current.getFullYear() + 1)
                    break
                }
              }

              const projectedAmount = Number(expense.amount) * occurrences
              expensesByProperty.set(propId, {
                amount: existing.amount + projectedAmount,
                expenses: [...existing.expenses, expense],
              })
            }
          }
        })

        // Group projected expenses by category
        const expensesByCategory = new Map<string, { amount: number; count: number }>()
        filteredRecurring.forEach(expense => {
          const category = expense.category || 'uncategorized'
          const now = new Date()
          const endDate = new Date(now)
          endDate.setDate(endDate.getDate() + 30)

          if (
            expense.recurring_start_date &&
            expense.recurring_frequency &&
            (!expense.recurring_end_date || new Date(expense.recurring_end_date) >= now)
          ) {
            const startDate = new Date(expense.recurring_start_date)
            const endRecurringDate = expense.recurring_end_date
              ? new Date(expense.recurring_end_date)
              : null

            if (startDate <= endDate && (!endRecurringDate || endRecurringDate >= now)) {
              const periodStart = startDate > now ? startDate : now
              const periodEnd =
                endRecurringDate && endRecurringDate < endDate ? endRecurringDate : endDate

              let occurrences = 0
              const current = new Date(periodStart)

              while (current <= periodEnd) {
                occurrences++

                switch (expense.recurring_frequency) {
                  case 'monthly':
                    current.setMonth(current.getMonth() + 1)
                    break
                  case 'quarterly':
                    current.setMonth(current.getMonth() + 3)
                    break
                  case 'yearly':
                    current.setFullYear(current.getFullYear() + 1)
                    break
                }
              }

              const projectedAmount = Number(expense.amount) * occurrences
              const existing = expensesByCategory.get(category) || { amount: 0, count: 0 }
              expensesByCategory.set(category, {
                amount: existing.amount + projectedAmount,
                count: existing.count + 1,
              })
            }
          }
        })

        return {
          total: projectedNet,
          projectedIncome,
          projectedExpenses,
          byProperty: Array.from(incomeByProperty.entries()).map(([propId, data]) => {
            const propertyExpenses = expensesByProperty.get(propId) || { amount: 0, expenses: [] }
            return {
              property: properties.find(p => p.id === propId)?.name || 'Unknown',
              income: data.amount,
              expenses: propertyExpenses.amount,
              net: data.amount - propertyExpenses.amount,
              incomeCount: data.count,
              expenseCount: propertyExpenses.expenses.length,
            }
          }),
          byCategory: Array.from(expensesByCategory.entries()).map(([category, data]) => ({
            category: category.charAt(0).toUpperCase() + category.slice(1),
            amount: data.amount,
            count: data.count,
          })),
          transactions: upcomingRecords.sort((a, b) => {
            const dateA = new Date(a.due_date).getTime()
            const dateB = new Date(b.due_date).getTime()
            return dateA - dateB // Sort by due date ascending (earliest first)
          }),
        }
      }
      case 'activeProperties': {
        const activeCount = calculateActiveProperties(properties, tenants, filters)
        const byProperty = properties.map(property => {
          const hasTenants = tenants.some(t => t.property_id === property.id)
          const tenantCount = tenants.filter(t => t.property_id === property.id).length
          return {
            property: property.name,
            isActive: hasTenants,
            tenantCount,
            tenants: tenants.filter(t => t.property_id === property.id),
          }
        })

        return {
          total: activeCount,
          byProperty: byProperty.map(p => ({
            property: p.property,
            isActive: p.isActive,
            tenantCount: p.tenantCount,
            amount: p.isActive ? 1 : 0, // For display consistency
            count: p.tenantCount,
          })),
        }
      }
      case 'occupancy': {
        const occupancyRate = calculateOccupancyRate(properties as Property[], tenants, filters)
        const activeCount = calculateActiveProperties(properties as unknown as Property[], tenants, filters)
        const totalProperties = properties.length

        const byProperty = properties.map(property => {
          const propertyTenants = tenants.filter(t => t.property_id === property.id)
          const isOccupied = propertyTenants.length > 0
          const occupancyPercentage = 1 // For MVP, occupied = 100%, vacant = 0%
          return {
            property: property.name,
            isOccupied,
            tenantCount: propertyTenants.length,
            occupancyPercentage: isOccupied ? 100 : 0,
            tenants: propertyTenants,
          }
        })

        return {
          total: occupancyRate,
          activeCount,
          totalProperties,
          byProperty: byProperty.map(p => ({
            property: p.property,
            occupancyPercentage: p.occupancyPercentage,
            tenantCount: p.tenantCount,
            amount: p.occupancyPercentage, // For display consistency
            count: p.tenantCount,
          })),
        }
      }
      default:
        return null
    }
  }, [metricType, filteredRentRecords, filteredExpenses, properties])

  if (!isOpen) return null

  const titles = {
    collected: 'Total Rent Collected',
    outstanding: 'Outstanding Rent',
    expenses: 'Total Expenses',
    net: 'Net Cash Flow',
    projected: 'Projected Net',
    activeProperties: 'Active Properties',
    occupancy: 'Occupancy Rate',
  }

  const descriptions = {
    collected:
      "Rent payments you've received in the selected period. Includes late fees when applicable.",
    outstanding:
      "Rent payments that are overdue and haven't been paid yet. Includes any late fees.",
    expenses:
      "All expenses you've recorded in the selected period, including maintenance, repairs, and other costs.",
    net: 'Your profit or loss for the period. Calculated as rent collected minus total expenses.',
    projected:
      'Estimated cash flow for the next 30 days based on upcoming rent and recurring expenses.',
    activeProperties: 'Number of properties that currently have tenants living in them.',
    occupancy: 'Percentage of your properties that are currently occupied by tenants.',
  }

  const dateRangeText = dateRange
    ? `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`
    : 'All time'

  const propertyText = propertyId
    ? properties.find(p => p.id === propertyId)?.name || 'Selected property'
    : 'All properties'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : durationToSeconds(motionTokens.duration.fast),
            ease: motionTokens.easing.standard,
          }}
          className="absolute inset-0 bg-background/90 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  type: 'spring',
                  ...cardSpring,
                }
          }
          className="relative z-10 w-full max-w-2xl"
          style={{ height: '90vh', maxHeight: '90vh' }}
        >
          <div
            className="h-full flex flex-col overflow-hidden rounded-xl border-2 bg-card/95 backdrop-blur-md text-card-foreground shadow-card relative"
            style={{ backgroundColor: 'hsl(var(--card) / 0.95)' }}
          >
            {/* Card styling elements */}
            <div className="absolute inset-0 pointer-events-none">
              <GrainOverlay />
              <MatteLayer intensity="subtle" />
              <ReflectiveGradient />
            </div>
            <div className="relative z-10 h-full flex flex-col overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 flex-shrink-0 border-b border-border">
                <div className="flex-1 pr-2">
                  <CardTitle className="text-2xl">{titles[metricType]}</CardTitle>
                  <CardDescription className="mt-2">{descriptions[metricType]}</CardDescription>
                  {propertyId && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <p>Property: {propertyText}</p>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0 flex-shrink-0"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 overflow-y-auto flex-1 min-h-0 pb-12 pr-4">
                {breakdownData && (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                      <div>
                        <p className="text-sm text-muted-foreground">Total {titles[metricType]}</p>
                        <p className="text-2xl font-semibold text-foreground mt-1">
                          {metricType === 'net' && breakdownData.total !== null
                            ? `$${Math.abs(breakdownData.total).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                            : metricType === 'projected' && breakdownData.total !== null
                              ? `$${Math.abs(breakdownData.total).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                              : metricType === 'activeProperties'
                                ? `${breakdownData.total}`
                                : metricType === 'occupancy'
                                  ? `${breakdownData.total}%`
                                  : `$${Math.abs(breakdownData.total).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                        </p>
                        {metricType === 'net' && breakdownData.total !== null && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p>Income: ${breakdownData.income?.toLocaleString()}</p>
                            <p>Expenses: ${breakdownData.expenses?.toLocaleString()}</p>
                          </div>
                        )}
                        {metricType === 'projected' && breakdownData.total !== null && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p>
                              Projected Income: ${breakdownData.projectedIncome?.toLocaleString()}
                            </p>
                            <p>
                              Projected Expenses: $
                              {breakdownData.projectedExpenses?.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {metricType === 'activeProperties' && 'activeCount' in breakdownData && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p>Properties with tenants: {breakdownData.total}</p>
                            <p>Total properties: {properties.length}</p>
                          </div>
                        )}
                        {metricType === 'occupancy' && 'activeCount' in breakdownData && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p>Active properties: {breakdownData.activeCount}</p>
                            <p>Total properties: {breakdownData.totalProperties}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Breakdown by Property */}
                    {breakdownData.byProperty && breakdownData.byProperty.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-foreground mb-3">By Property</h3>
                        <div className="space-y-2">
                          {breakdownData.byProperty.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50"
                            >
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium text-foreground">{item.property}</span>
                                <span className="text-xs text-muted-foreground">
                                  {metricType === 'projected' && 'income' in item
                                    ? `(${item.incomeCount || 0} rent, ${item.expenseCount || 0} expenses)`
                                    : metricType === 'activeProperties' && 'isActive' in item
                                      ? `(${item.isActive ? 'Active' : 'Inactive'} - ${item.tenantCount} tenant${item.tenantCount !== 1 ? 's' : ''})`
                                      : metricType === 'occupancy' && 'occupancyPercentage' in item
                                        ? `(${item.occupancyPercentage}% - ${item.tenantCount} tenant${item.tenantCount !== 1 ? 's' : ''})`
                                        : 'count' in item
                                          ? `(${item.count} ${item.count === 1 ? 'transaction' : 'transactions'})`
                                          : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                {metricType === 'projected' && 'income' in item && (
                                  <div className="text-right text-xs text-muted-foreground">
                                    <div>Income: ${item.income.toLocaleString()}</div>
                                    <div>Expenses: ${item.expenses.toLocaleString()}</div>
                                  </div>
                                )}
                                <span className="font-semibold text-foreground">
                                  {metricType === 'activeProperties' || metricType === 'occupancy'
                                    ? metricType === 'occupancy' && 'occupancyPercentage' in item
                                      ? `${item.occupancyPercentage}%`
                                      : 'amount' in item && item.amount > 0
                                        ? 'Active'
                                        : 'Inactive'
                                    : `$${(metricType === 'projected' && 'net' in item
                                        ? item.net
                                        : 'amount' in item
                                          ? item.amount
                                          : 0
                                      ).toLocaleString(undefined, {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0,
                                      })}`}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Breakdown by Category (for expenses) */}
                    {breakdownData.byCategory && breakdownData.byCategory.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-foreground mb-3">By Category</h3>
                        <div className="space-y-2">
                          {breakdownData.byCategory.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">{item.category}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({item.count} {item.count === 1 ? 'expense' : 'expenses'})
                                </span>
                              </div>
                              <span className="font-semibold text-foreground">
                                $
                                {item.amount.toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Transaction List */}
                    {breakdownData.transactions && breakdownData.transactions.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-foreground mb-3">
                          Recent Transactions ({breakdownData.transactions.length})
                        </h3>
                        <div className="space-y-2">
                          {breakdownData.transactions.slice(0, 10).map((transaction, index) => {
                            if (metricType === 'expenses' && 'name' in transaction) {
                              const expense = transaction as Expense
                              return (
                                <div
                                  key={expense.id || index}
                                  className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/50"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                                      <span className="font-medium text-foreground">
                                        {expense.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(expense.date).toLocaleDateString()}
                                      </span>
                                      {expense.category && (
                                        <span className="px-2 py-0.5 bg-muted rounded text-xs">
                                          {expense.category}
                                        </span>
                                      )}
                                      {properties.find(p => p.id === expense.property_id) && (
                                        <span className="flex items-center gap-1">
                                          <MapPin className="w-3 h-3" />
                                          {properties.find(p => p.id === expense.property_id)?.name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="font-semibold text-foreground ml-4">
                                    $
                                    {Number(expense.amount).toLocaleString(undefined, {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 0,
                                    })}
                                  </span>
                                </div>
                              )
                            } else if ('property' in transaction) {
                              const record = transaction as RentRecordWithRelations
                              const amount = Number(record.amount) + (Number(record.late_fee) || 0)
                              return (
                                <div
                                  key={record.id || index}
                                  className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/50"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                                      <span className="font-medium text-foreground">
                                        Rent - {record.property?.name || 'Unknown'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {record.paid_date
                                          ? new Date(record.paid_date).toLocaleDateString()
                                          : new Date(record.due_date).toLocaleDateString()}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded text-xs ${
                                          record.status === 'paid'
                                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                            : record.status === 'overdue'
                                              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                              : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                        }`}
                                      >
                                        {record.status}
                                      </span>
                                      {Number(record.late_fee) > 0 && (
                                        <span className="text-xs">
                                          + ${Number(record.late_fee).toLocaleString()} late fee
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="font-semibold text-foreground ml-4">
                                    $
                                    {amount.toLocaleString(undefined, {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 0,
                                    })}
                                  </span>
                                </div>
                              )
                            }
                            return null
                          })}
                        </div>
                        {breakdownData.transactions.length > 10 && (
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            Showing 10 of {breakdownData.transactions.length} transactions
                          </p>
                        )}
                      </div>
                    )}

                    {/* Empty State */}
                    {(!breakdownData.transactions || breakdownData.transactions.length === 0) &&
                      (!breakdownData.byProperty || breakdownData.byProperty.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No transactions found for the selected filters</p>
                        </div>
                      )}
                  </div>
                )}

                {/* Summary for activeProperties and occupancy */}
                {breakdownData &&
                  (metricType === 'activeProperties' || metricType === 'occupancy') && (
                    <div className="space-y-4">
                      {metricType === 'occupancy' && 'activeCount' in breakdownData && (
                        <div className="p-4 bg-muted/50 rounded-lg border border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Active Properties</span>
                            <span className="text-lg font-semibold text-foreground">
                              {breakdownData.activeCount} of {breakdownData.totalProperties}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
              </CardContent>
              {/* CTA Footer - Sticky outside scrollable content */}
              <div className="border-t border-border p-4 flex-shrink-0 bg-card">
                <Button
                  onClick={() => {
                    onClose()
                    navigate('/landlord/finances')
                  }}
                  className="w-full"
                >
                  View Full Finances
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
