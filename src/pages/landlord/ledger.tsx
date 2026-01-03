import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RentLedgerRow } from '@/components/landlord/rent-ledger-row'
import { ExpenseForm } from '@/components/landlord/expense-form'
import { ExpenseList } from '@/components/landlord/expense-list'
import { RentRecordForm } from '@/components/landlord/rent-record-form'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton-loader'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { NumberCounter } from '@/components/ui/number-counter'
import { useLandlordRentRecords, type RentRecordFilter } from '@/hooks/use-landlord-rent-records'
import { useProperties } from '@/hooks/use-properties'
import { useExpenses } from '@/hooks/use-expenses'
import { FileText, Plus, DollarSign } from 'lucide-react'
import { motionTokens, durationToSeconds, createSpring } from '@/lib/motion'

type DateRangePreset = 'thisMonth' | 'lastMonth' | 'custom' | 'all'

export function LandlordLedger() {
  const { properties } = useProperties()
  const { expenses, createExpense, updateExpense, deleteExpense } = useExpenses()
  const [datePreset, setDatePreset] = useState<DateRangePreset>('thisMonth')
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showRentForm, setShowRentForm] = useState(false)
  const cardSpring = createSpring('card')

  const dateRange = useMemo(() => {
    const now = new Date()
    switch (datePreset) {
      case 'thisMonth':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        }
      case 'lastMonth':
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 0),
        }
      case 'yearly':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear(), 11, 31),
        }
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            start: new Date(customStartDate),
            end: new Date(customEndDate),
          }
        }
        return undefined
      default:
        return undefined
    }
  }, [datePreset, customStartDate, customEndDate])

  const filter: RentRecordFilter = useMemo(() => {
    const filter: RentRecordFilter = {}
    if (selectedPropertyId) {
      filter.propertyId = selectedPropertyId
    }
    if (dateRange) {
      filter.dateRange = dateRange
    }
    return filter
  }, [selectedPropertyId, dateRange])

  const { records, loading, createRentRecord, refetch } = useLandlordRentRecords(filter)

  const summary = useMemo(() => {
    const collected = records
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + Number(r.amount), 0)

    const outstanding = records
      .filter(r => r.status === 'overdue')
      .reduce((sum, r) => sum + Number(r.amount), 0)

    const upcoming = records
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + Number(r.amount), 0)

    return { collected, outstanding, upcoming }
  }, [records])

  return (
    <div className="container mx-auto px-4 py-8 relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />

      <div className="relative z-10">
        <motion.div
          initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
          animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
          transition={{
            duration: durationToSeconds(motionTokens.duration.base),
            ease: motionTokens.ease.standard,
          }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-semibold text-foreground mb-2">Finances</h1>
              <p className="text-muted-foreground">Financial truth center</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowRentForm(!showRentForm)}>
                {showRentForm ? (
                  'Cancel'
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Log Rent
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowExpenseForm(!showExpenseForm)}>
                {showExpenseForm ? (
                  'Cancel'
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Rent Record Form */}
        {showRentForm && (
          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            exit={{ opacity: motionTokens.opacity.hidden, y: -8 }}
            transition={{
              duration: motionTokens.duration.normal,
              ease: motionTokens.easing.standard,
            }}
            className="mb-6"
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Log Rent Payment</CardTitle>
                <CardDescription>Record a rent payment or upcoming rent</CardDescription>
              </CardHeader>
              <CardContent>
                <RentRecordForm
                  onSubmit={async data => {
                    const result = await createRentRecord(data)
                    if (!result.error) {
                      setShowRentForm(false)
                      await refetch()
                    }
                    return { error: result.error }
                  }}
                  onCancel={() => setShowRentForm(false)}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Expense Form */}
        {showExpenseForm && (
          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            exit={{ opacity: motionTokens.opacity.hidden, y: -8 }}
            transition={{
              duration: motionTokens.duration.normal,
              ease: motionTokens.easing.standard,
            }}
            className="mb-6"
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Add Expense</CardTitle>
                <CardDescription>Record an upkeep cost</CardDescription>
              </CardHeader>
              <CardContent>
                <ExpenseForm
                  onSubmit={async data => {
                    const result = await createExpense(data)
                    if (!result.error) {
                      setShowExpenseForm(false)
                    }
                    return { error: result.error }
                  }}
                  onCancel={() => setShowExpenseForm(false)}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            whileHover={{ y: -2 }}
            transition={{
              type: 'spring',
              ...cardSpring,
              delay: 0.1,
            }}
          >
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Collected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-foreground">
                  <NumberCounter
                    value={summary.collected}
                    format={v => `$${Math.round(v).toLocaleString()}`}
                  />
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            whileHover={{ y: -2 }}
            transition={{
              type: 'spring',
              ...cardSpring,
              delay: 0.15,
            }}
          >
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Outstanding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                  <NumberCounter
                    value={summary.outstanding}
                    format={v => `$${Math.round(v).toLocaleString()}`}
                  />
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            whileHover={{ y: -2 }}
            transition={{
              type: 'spring',
              ...cardSpring,
              delay: 0.2,
            }}
          >
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Upcoming
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
                  <NumberCounter
                    value={summary.upcoming}
                    format={v => `$${Math.round(v).toLocaleString()}`}
                  />
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter rent records by date and property</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Date Range</label>
                <select
                  value={datePreset}
                  onChange={e => setDatePreset(e.target.value as DateRangePreset)}
                  className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="thisMonth" className="text-foreground">
                    This Month
                  </option>
                  <option value="lastMonth" className="text-foreground">
                    Last Month
                  </option>
                  <option value="yearly" className="text-foreground">
                    This Year
                  </option>
                  <option value="custom" className="text-foreground">
                    Custom Range
                  </option>
                  <option value="all" className="text-foreground">
                    All Time
                  </option>
                </select>
              </div>

              {datePreset === 'custom' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Start Date</label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">End Date</label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Property</label>
                <select
                  value={selectedPropertyId}
                  onChange={e => setSelectedPropertyId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="" className="text-foreground">
                    All Properties
                  </option>
                  {properties.map(prop => (
                    <option key={prop.id} value={prop.id} className="text-foreground">
                      {prop.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Section */}
        {expenses.length > 0 && (
          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            transition={{
              duration: motionTokens.duration.normal,
              ease: motionTokens.easing.standard,
            }}
            className="mb-6"
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Recent Expenses</CardTitle>
                <CardDescription>Latest expense records</CardDescription>
              </CardHeader>
              <CardContent>
                <ExpenseList
                  expenses={expenses.slice(0, 5)}
                  onUpdate={updateExpense}
                  onDelete={deleteExpense}
                  properties={properties}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Ledger Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Rent Ledger</CardTitle>
            <CardDescription>
              {records.length} record{records.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<FileText className="h-8 w-8" />}
                  title="No rent records found"
                  description="No rent records match your current filters."
                />
              </div>
            ) : (
              <AnimatePresence initial={false}>
                <div className="divide-y divide-border">
                  {records.map(record => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
                      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
                      exit={{ opacity: motionTokens.opacity.hidden, y: -8 }}
                      transition={{
                        duration: durationToSeconds(motionTokens.duration.base),
                        ease: motionTokens.ease.standard,
                      }}
                      layout={false}
                    >
                      <RentLedgerRow record={record} onReceiptGenerated={refetch} />
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
