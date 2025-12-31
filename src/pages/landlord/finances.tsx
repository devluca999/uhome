import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RentLedgerRow } from '@/components/landlord/rent-ledger-row'
import { ExpenseForm } from '@/components/landlord/expense-form'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton-loader'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { KPIStrip } from '@/components/landlord/kpi-strip'
import { FinancialGraphSwitcher } from '@/components/landlord/financial-graph-switcher'
import { ExpensesStream } from '@/components/landlord/expenses-stream'
import { IncomeStream } from '@/components/landlord/income-stream'
import { SmartInsights } from '@/components/landlord/smart-insights'
import { useLandlordRentRecords, type RentRecordFilter } from '@/hooks/use-landlord-rent-records'
import { useProperties } from '@/hooks/use-properties'
import { useExpenses } from '@/hooks/use-expenses'
import { useFinancialMetrics } from '@/hooks/use-financial-metrics'
import { exportLedgerToCSV } from '@/utils/export-csv'
import { FileText, Plus, Download, X } from 'lucide-react'
import { motionTokens, durationToSeconds, createSpring } from '@/lib/motion'
import type { Database } from '@/types/database'

type Expense = Database['public']['Tables']['expenses']['Row']
type DateRangePreset = 'thisMonth' | 'lastMonth' | 'custom' | 'all'

export function LandlordFinances() {
  const { properties } = useProperties()
  const { expenses, createExpense, updateExpense, deleteExpense, getProjectedExpenses } =
    useExpenses()
  const [searchParams, setSearchParams] = useSearchParams()
  const [datePreset, setDatePreset] = useState<DateRangePreset>('thisMonth')
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expandedLedgerRows, setExpandedLedgerRows] = useState<Set<string>>(new Set())
  const cardSpring = createSpring('card')

  // Check for expense creation from URL params (from work order prompt)
  useEffect(() => {
    const createExpense = searchParams.get('createExpense')
    const workOrderId = searchParams.get('workOrderId')
    const propertyId = searchParams.get('propertyId')

    if (createExpense && propertyId) {
      setShowExpenseForm(true)
      setSelectedPropertyId(propertyId)
      // Clear URL params
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

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

  const { records, loading } = useLandlordRentRecords(filter)
  const metrics = useFinancialMetrics(records, expenses, 6, selectedPropertyId || undefined)

  // Filter expenses by category if selected
  const filteredExpenses = useMemo(() => {
    let filtered = expenses
    if (selectedCategory) {
      filtered = filtered.filter(e => e.category === selectedCategory)
    }
    if (selectedPropertyId) {
      filtered = filtered.filter(e => e.property_id === selectedPropertyId)
    }
    if (dateRange) {
      filtered = filtered.filter(e => {
        const expenseDate = new Date(e.date)
        return expenseDate >= dateRange.start && expenseDate <= dateRange.end
      })
    }
    return filtered
  }, [expenses, selectedCategory, selectedPropertyId, dateRange])

  // Calculate KPI change subtexts
  const kpiChanges = useMemo(() => {
    // Simple change calculation (can be enhanced with historical data)
    const collectedChange = records.length > 0 ? '↑ new tenant added' : undefined
    const expensesChange = filteredExpenses.length > 0 ? '↑ expense recorded' : undefined
    const netChange =
      metrics.netProfit > 0
        ? '↑ positive margin'
        : metrics.netProfit < 0
          ? '↓ negative margin'
          : undefined
    const projectedChange =
      metrics.projectedNet > metrics.netProfit ? '↑ projected growth' : undefined

    return {
      collectedChange,
      expensesChange,
      netChange,
      projectedChange,
    }
  }, [records, filteredExpenses, metrics])

  // Prepare graph data
  const lineChartData = useMemo(() => {
    return metrics.monthlyNet.map(item => ({
      month: item.month,
      income: item.income,
      expenses: item.expenses,
      net: item.net,
    }))
  }, [metrics.monthlyNet])

  const barChartData = useMemo(() => {
    return metrics.monthlyRentCollected
  }, [metrics.monthlyRentCollected])

  const donutChartData = useMemo(() => {
    return [
      {
        name: 'Collected',
        value: metrics.rentCollected,
        color: '#84A98C',
      },
      {
        name: 'Outstanding',
        value: metrics.rentOutstanding,
        color: '#ef4444',
      },
      {
        name: 'Upcoming',
        value: metrics.upcomingRent,
        color: '#f59e0b',
      },
    ].filter(item => item.value > 0)
  }, [metrics])

  const pieChartData = useMemo(() => {
    const categories = ['maintenance', 'utilities', 'repairs'] as const
    return categories
      .map(category => {
        const categoryExpenses = filteredExpenses.filter(e => e.category === category)
        const total = categoryExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
        return {
          name: category,
          value: total,
          color:
            category === 'maintenance'
              ? '#84A98C'
              : category === 'utilities'
                ? '#3b82f6'
                : '#ef4444',
        }
      })
      .filter(item => item.value > 0)
  }, [filteredExpenses])

  // Prepare stream data
  const expensesStreamData = useMemo(() => {
    return metrics.expenseAveragesByCategory.map(cat => ({
      category: cat.category,
      monthlyAverage: cat.monthlyAverage,
      trend: cat.trend,
      trendPercentage: cat.trendPercentage,
    }))
  }, [metrics.expenseAveragesByCategory])

  const incomeStreamData = useMemo(() => {
    return [
      {
        type: 'rent' as const,
        label: 'Rent (Tracked)',
        value: metrics.rentCollected,
        subtext: `${records.filter(r => r.status === 'paid').length} payments`,
      },
      {
        type: 'vacancy' as const,
        label: 'Vacancy Impact',
        value: metrics.rentOutstanding,
        subtext: 'Read-only insight',
      },
    ]
  }, [metrics, records])

  // Generate smart insights
  const insights = useMemo(() => {
    const insights: Array<{
      id: string
      text: string
      type: 'info' | 'warning' | 'success'
      filterContext?: {
        propertyId?: string
        category?: string
        dateRange?: { start: string; end: string }
      }
    }> = []

    // Check for high maintenance costs
    const maintenanceExpenses = filteredExpenses.filter(e => e.category === 'maintenance')
    if (maintenanceExpenses.length >= 5) {
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      const lastMonthExpenses = maintenanceExpenses.filter(e => {
        const expenseDate = new Date(e.date)
        return expenseDate >= lastMonth
      })

      if (lastMonthExpenses.length >= 5) {
        insights.push({
          id: 'high-maintenance',
          text: `High maintenance activity: ${lastMonthExpenses.length} maintenance expenses last month`,
          type: 'warning',
          filterContext: {
            category: 'maintenance',
            dateRange: {
              start: lastMonth.toISOString().split('T')[0],
              end: new Date().toISOString().split('T')[0],
            },
          },
        })
      }
    }

    // Check for expense trends
    const maintenanceTrend = metrics.expenseAveragesByCategory.find(
      c => c.category === 'maintenance'
    )
    if (
      maintenanceTrend &&
      maintenanceTrend.trend === 'up' &&
      maintenanceTrend.trendPercentage &&
      maintenanceTrend.trendPercentage > 15
    ) {
      insights.push({
        id: 'maintenance-trend',
        text: `Maintenance costs increased ${Math.round(maintenanceTrend.trendPercentage)}% MoM`,
        type: 'warning',
        filterContext: {
          category: 'maintenance',
        },
      })
    }

    return insights
  }, [filteredExpenses, metrics])

  // Prepare ledger data for CSV export
  const ledgerDataForExport = useMemo(() => {
    const ledgerRows: Array<{
      date: string
      type: 'rent' | 'expense'
      description: string
      amount: number
      property?: string
      category?: string
      status?: string
    }> = []

    // Add rent records
    records.forEach(record => {
      ledgerRows.push({
        date: record.due_date,
        type: 'rent',
        description: `Rent - ${record.property?.name || 'Unknown'}`,
        amount: Number(record.amount),
        property: record.property?.name,
        status: record.status,
      })
    })

    // Add expenses
    filteredExpenses.forEach(expense => {
      ledgerRows.push({
        date: expense.date,
        type: 'expense',
        description: expense.name,
        amount: Number(expense.amount),
        property: properties.find(p => p.id === expense.property_id)?.name,
        category: expense.category || undefined,
      })
    })

    // Sort by date
    return ledgerRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [records, filteredExpenses, properties])

  const handleExportCSV = () => {
    exportLedgerToCSV(
      ledgerDataForExport,
      `ledger-export-${new Date().toISOString().split('T')[0]}.csv`
    )
  }

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category === selectedCategory ? '' : category)
  }

  const handleRentClick = () => {
    // Filter to show only rent records
    setSelectedCategory('')
  }

  const toggleLedgerRow = (id: string) => {
    setExpandedLedgerRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />

      {/* Section A: Sticky KPI Strip */}
      <KPIStrip
        totalCollected={metrics.rentCollected}
        totalExpenses={metrics.totalExpenses}
        netProfit={metrics.netProfit}
        projectedNet={metrics.projectedNet}
        collectedChange={kpiChanges.collectedChange}
        expensesChange={kpiChanges.expensesChange}
        netChange={kpiChanges.netChange}
        projectedChange={kpiChanges.projectedChange}
      />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Section B: Primary Financial Visualization */}
        <motion.div
          initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
          animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
          transition={{
            duration: durationToSeconds(motionTokens.duration.base),
            ease: motionTokens.ease.standard,
          }}
          className="mb-8"
        >
          <FinancialGraphSwitcher
            lineData={lineChartData}
            barData={barChartData}
            donutData={donutChartData}
            pieData={pieChartData}
            properties={properties}
            selectedPropertyId={selectedPropertyId || 'all'}
            onPropertyChange={propertyId =>
              setSelectedPropertyId(propertyId === 'all' ? '' : propertyId)
            }
          />
        </motion.div>

        {/* Section C: Streams */}
        <div className="space-y-6 mb-8">
          {/* Expenses Stream */}
          {expensesStreamData.length > 0 && (
            <motion.div
              initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
              animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
              transition={{
                duration: motionTokens.duration.normal,
                ease: motionTokens.easing.standard,
              }}
            >
              <div className="mb-2">
                <h2 className="text-lg font-semibold text-foreground">Expenses Stream</h2>
                <p className="text-sm text-muted-foreground">Click a category to filter ledger</p>
              </div>
              <ExpensesStream
                categories={expensesStreamData}
                onCategoryClick={handleCategoryClick}
              />
            </motion.div>
          )}

          {/* Income Stream */}
          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            transition={{
              duration: motionTokens.duration.normal,
              ease: motionTokens.easing.standard,
              delay: 0.1,
            }}
          >
            <div className="mb-2">
              <h2 className="text-lg font-semibold text-foreground">Income Stream</h2>
            </div>
            <IncomeStream cards={incomeStreamData} onCardClick={handleRentClick} />
          </motion.div>
        </div>

        {/* Smart Insights */}
        {insights.length > 0 && (
          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            transition={{
              duration: motionTokens.duration.normal,
              ease: motionTokens.easing.standard,
            }}
            className="mb-8"
          >
            <SmartInsights insights={insights} />
          </motion.div>
        )}

        {/* Section D: Ledger */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Ledger</CardTitle>
                <CardDescription>
                  {records.length + filteredExpenses.length} total entries
                  {selectedCategory && ` • Filtered by ${selectedCategory}`}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={ledgerDataForExport.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExpenseForm(!showExpenseForm)}
                >
                  {showExpenseForm ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Expense
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Expense Form Modal */}
          {showExpenseForm && (
            <CardContent className="border-b border-border pb-6">
              <motion.div
                initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
                animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
                exit={{ opacity: motionTokens.opacity.hidden, y: -8 }}
                transition={{
                  duration: motionTokens.duration.normal,
                  ease: motionTokens.easing.standard,
                }}
              >
                <ExpenseForm
                  onSubmit={async data => {
                    const result = await createExpense(data)
                    if (!result.error) {
                      setShowExpenseForm(false)
                    }
                    return { error: result.error }
                  }}
                  onCancel={() => setShowExpenseForm(false)}
                  initialData={selectedPropertyId ? { property_id: selectedPropertyId } : undefined}
                />
              </motion.div>
            </CardContent>
          )}

          {/* Ledger Filters */}
          <CardContent className={showExpenseForm ? 'border-b border-border pb-6' : 'pb-6'}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Category</label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="" className="text-foreground">
                    All Categories
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
                  <option value="custom" className="text-foreground">
                    Custom Range
                  </option>
                  <option value="all" className="text-foreground">
                    All Time
                  </option>
                </select>
              </div>

              {datePreset === 'custom' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Custom Dates</label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          {/* Ledger Entries */}
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : records.length === 0 && filteredExpenses.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<FileText className="h-8 w-8" />}
                  title="No ledger entries found"
                  description="No entries match your current filters."
                />
              </div>
            ) : (
              <AnimatePresence initial={false}>
                <div className="divide-y divide-border">
                  {/* Rent Records */}
                  {records.map(record => (
                    <motion.div
                      key={`rent-${record.id}`}
                      initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
                      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
                      exit={{ opacity: motionTokens.opacity.hidden, y: -8 }}
                      transition={{
                        duration: durationToSeconds(motionTokens.duration.base),
                        ease: motionTokens.ease.standard,
                      }}
                      layout={false}
                    >
                      <RentLedgerRow record={record} />
                    </motion.div>
                  ))}

                  {/* Expenses */}
                  {filteredExpenses.map(expense => (
                    <motion.div
                      key={`expense-${expense.id}`}
                      initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
                      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
                      exit={{ opacity: motionTokens.opacity.hidden, y: -8 }}
                      transition={{
                        duration: durationToSeconds(motionTokens.duration.base),
                        ease: motionTokens.ease.standard,
                      }}
                      layout={false}
                      className="border-b border-border last:border-b-0"
                    >
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-foreground">{expense.name}</span>
                              {expense.category && (
                                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                                  {expense.category}
                                </span>
                              )}
                              {expense.is_recurring && (
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                                  Recurring
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {properties.find(p => p.id === expense.property_id)?.name ||
                                'Unknown Property'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(expense.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 ml-4">
                            <span className="text-lg font-semibold text-foreground">
                              ${Number(expense.amount).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
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
