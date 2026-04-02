import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RentLedgerRow } from '@/components/landlord/rent-ledger-row'
import { ExpenseForm } from '@/components/landlord/expense-form'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton-loader'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { KPIStrip } from '@/components/landlord/kpi-strip'
import { FinancialInsightsModule } from '@/components/landlord/financial-insights-module'
import { FinancesFilterBar, type TimePeriod } from '@/components/landlord/finances-filter-bar'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { FinancesOnboarding } from '@/components/landlord/finances-onboarding'
import { SmartInsights } from '@/components/landlord/smart-insights'
import { RentSummaryModal } from '@/components/landlord/rent-summary-modal'
import { useMaintenanceRequests } from '@/hooks/use-maintenance-requests'
import { useLandlordRentRecords, type RentRecordFilter } from '@/hooks/use-landlord-rent-records'
import { useProperties } from '@/hooks/use-properties'
import { useTenants } from '@/hooks/use-tenants'
import { useExpenses } from '@/hooks/use-expenses'
import { useFinancialMetrics } from '@/hooks/use-financial-metrics'
import {
  calculateActiveProperties,
  calculateOccupancyRate,
  getExpenseDate,
} from '@/lib/finance-calculations'
import { exportLedgerToCSV } from '@/utils/export-csv'
import { FileText, Plus, Download, X, Edit, Trash2 } from 'lucide-react'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import type { Database } from '@/types/database'
import { usePerformanceTracker } from '@/hooks/use-performance-tracker'
import { useAuth } from '@/contexts/auth-context'
import { useSubscription } from '@/hooks/use-subscription'

type Expense = Database['public']['Tables']['expenses']['Row']

export function LandlordFinances() {
  // Track performance metrics
  usePerformanceTracker({ componentName: 'LandlordFinances' })

  const navigate = useNavigate()
  const { viewMode } = useAuth()
  const { hasFeature, loading: subscriptionLoading } = useSubscription()
  const applyPlanGates = viewMode !== 'landlord-demo'

  const { properties } = useProperties()
  const { tenants } = useTenants()
  const { expenses, createExpense, updateExpense, deleteExpense } = useExpenses()
  const [searchParams, setSearchParams] = useSearchParams()
  // Page-level filter state
  // These two filters control ALL financial data on the page: KPIs, Ledger, Graph (default state)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly') // Default to monthly to align with dashboard
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  // Legacy filter state (for ledger section)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  // const [, setExpandedLedgerRows] = useState<Set<string>>(new Set()) // Unused
  const [kpiModalOpen, setKpiModalOpen] = useState(false)
  const [kpiModalType, setKpiModalType] = useState<
    | 'collected'
    | 'outstanding'
    | 'expenses'
    | 'net'
    | 'projected'
    | 'activeProperties'
    | 'occupancy'
  >('collected')
  // const cardSpring = createSpring('card') // Unused

  // Fetch work orders for timeline view
  const { requests: workOrders } = useMaintenanceRequests(
    selectedPropertyId || undefined,
    !!selectedPropertyId
  ) // true if property ID provided

  // Check for expense creation from URL params (from work order prompt)
  useEffect(() => {
    const createExpense = searchParams.get('createExpense')
    // const workOrderId = searchParams.get('workOrderId') // Unused
    const propertyId = searchParams.get('propertyId')

    if (createExpense && propertyId) {
      setShowExpenseForm(true)
      setSelectedPropertyId(propertyId)
      // Clear URL params
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Map timePeriod to dateGranularity, timeRange, and dateRange for backward compatibility
  // These derived values are used by FinancialInsightsModule and other components
  const { dateGranularity, timeRange, dateRange } = useMemo(() => {
    const now = new Date()
    switch (timePeriod) {
      case 'monthly':
        return {
          dateGranularity: 'monthly' as const,
          timeRange: undefined,
          dateRange: {
            // Use current calendar month range (like dashboard) to match test expectations
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            end: new Date(now.getFullYear(), now.getMonth() + 1, 0), // Last day of month
          },
        }
      case 'quarterly':
        return {
          dateGranularity: 'quarterly' as const,
          timeRange: undefined,
          dateRange: {
            // Quarterly view is scoped to the current calendar quarter.
            start: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
            end: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0),
          },
        }
      case 'yearly':
        return {
          dateGranularity: 'yearly' as const,
          timeRange: undefined,
          dateRange: {
            // Use current year range to match test expectations
            start: new Date(now.getFullYear(), 0, 1), // Jan 1
            end: new Date(now.getFullYear(), 11, 31), // Dec 31
          },
        }
      case 'monthToDate':
        return {
          dateGranularity: 'monthly' as const,
          timeRange: 'monthToDate' as const,
          dateRange: {
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            end: now,
          },
        }
      case 'yearToDate':
        return {
          dateGranularity: 'yearly' as const,
          timeRange: 'yearToDate' as const,
          dateRange: {
            start: new Date(now.getFullYear(), 0, 1), // Jan 1
            end: now,
          },
        }
      default:
        return {
          dateGranularity: 'monthly' as const,
          timeRange: 'monthToDate' as const,
          dateRange: {
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            end: now,
          },
        }
    }
  }, [timePeriod])

  // CRITICAL: For chart data, we need ALL historical records (no dateRange filter)
  // DateRange filter is only applied to KPI calculations, not chart data
  // This ensures charts show at least 6-12 months of data regardless of timePeriod selection
  const chartFilter: RentRecordFilter = useMemo(() => {
    const filter: RentRecordFilter = {}
    // Only filter by property if a specific property is selected (not empty or 'all')
    if (selectedPropertyId && selectedPropertyId !== 'all') {
      filter.propertyId = selectedPropertyId
    }
    // NO dateRange filter for charts - we need all historical data
    return filter
  }, [selectedPropertyId])

  // Fetch ALL records - use same data for both charts and KPIs
  // CRITICAL: Do NOT filter by dateRange in the DB - useLandlordRentRecords filters by due_date,
  // but rent collected uses paid_date (cash accounting). Date filtering happens in useFinancialMetrics.
  const { records: allRecords, loading, refetch } = useLandlordRentRecords(chartFilter)

  // Map dateGranularity to graphTimeRange (derived from timePeriod)
  const graphTimeRange = useMemo(() => {
    switch (dateGranularity) {
      case 'monthly':
        return 'month' as const
      case 'quarterly':
        return 'quarter' as const
      case 'yearly':
        return 'year' as const
      default:
        return 'month' as const
    }
  }, [dateGranularity])

  // Use ALL records for charts (no dateRange filter) - ensures charts show full historical data
  // Use real records only — no fallback data (causes flicker and inconsistency with dashboard)
  const recordsForCharts = useMemo(() => allRecords, [allRecords])
  const recordsForKPIs = useMemo(() => allRecords, [allRecords])

  // Use real expenses only — no fallback
  const expensesWithFallback = useMemo(() => expenses, [expenses])

  // Property filter: empty string or 'all' means all properties
  const propertyFilter =
    selectedPropertyId && selectedPropertyId !== 'all' ? selectedPropertyId : undefined

  // Get active property IDs for filtering calculations
  const activePropertyIds = useMemo(() => {
    return new Set(properties.filter(p => p.is_active !== false).map(p => p.id))
  }, [properties])

  // Use 12 months for better data visualization
  // CRITICAL: Use recordsForCharts (all historical data) for chart metrics
  // This ensures charts show at least 6-12 months regardless of timePeriod selection
  const chartMetrics = useFinancialMetrics(
    recordsForCharts,
    expensesWithFallback,
    12,
    propertyFilter,
    graphTimeRange,
    undefined, // No dateRange filter - charts need all historical data
    activePropertyIds
  )

  // Use filtered records for KPI calculations (respects dateRange filter)
  const kpiMetrics = useFinancialMetrics(
    recordsForKPIs,
    expensesWithFallback,
    12,
    propertyFilter,
    graphTimeRange,
    dateRange, // Apply dateRange filter for KPI calculations
    activePropertyIds
  )

  // Combine: use chartMetrics for charts, kpiMetrics for KPIs
  const metrics = useMemo(
    () => ({
      ...kpiMetrics, // KPIs use filtered data
      monthlyRentCollected: chartMetrics.monthlyRentCollected, // Charts use all historical data
      monthlyExpenses: chartMetrics.monthlyExpenses, // Charts use all historical data
      monthlyNet: chartMetrics.monthlyNet, // Charts use all historical data
    }),
    [kpiMetrics, chartMetrics]
  )

  // Calculate v1 canon KPIs using centralized calculations
  const activeProperties = useMemo(() => {
    return calculateActiveProperties(properties, tenants, {
      propertyId: propertyFilter,
    })
  }, [properties, tenants, propertyFilter])

  const occupancyRate = useMemo(() => {
    return calculateOccupancyRate(properties, tenants, {
      propertyId: propertyFilter,
    })
  }, [properties, tenants, propertyFilter])

  // Filter expenses by category if selected
  const filteredExpenses = useMemo(() => {
    let filtered = expensesWithFallback
    if (selectedCategory) {
      filtered = filtered.filter(e => e.category === selectedCategory)
    }
    if (selectedPropertyId) {
      filtered = filtered.filter(e => e.property_id === selectedPropertyId)
    }
    if (dateRange) {
      filtered = filtered.filter(e => {
        const expenseDate = new Date(getExpenseDate(e))
        return expenseDate >= dateRange.start && expenseDate <= dateRange.end
      })
    }
    return filtered
  }, [expensesWithFallback, selectedCategory, selectedPropertyId, dateRange])

  // Calculate KPI change subtexts
  const kpiChanges = useMemo(() => {
    // Simple change calculation (can be enhanced with historical data)
    const collectedChange = recordsForKPIs.length > 0 ? 'â†‘ new tenant added' : undefined
    const expensesChange = filteredExpenses.length > 0 ? 'â†‘ expense recorded' : undefined
    const netChange =
      metrics.netProfit > 0
        ? 'â†‘ positive margin'
        : metrics.netProfit < 0
          ? 'â†“ negative margin'
          : undefined
    const projectedChange =
      metrics.projectedNet > metrics.netProfit ? 'â†‘ projected growth' : undefined

    return {
      collectedChange,
      expensesChange,
      netChange,
      projectedChange,
    }
  }, [recordsForKPIs, filteredExpenses, metrics])

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

  // const donutChartData = useMemo(() => { ... }, [metrics]) // Unused
  // const pieChartData = useMemo(() => { ... }, [filteredExpenses]) // Unused

  // Prepare work orders for timeline (map to expected format)
  const workOrdersForTimeline = useMemo(() => {
    return workOrders
      .filter(wo => wo.property_id !== null) // Filter out null property_id
      .map(wo => ({
        id: wo.id,
        property_id: wo.property_id as string, // Type assertion after filter
        created_at: wo.created_at,
        status: wo.status as 'pending' | 'in_progress' | 'completed', // Map to expected status type
        description: wo.description || wo.public_description || 'Work order',
        property: wo.property,
      }))
  }, [workOrders]) as Array<{
    id: string
    property_id: string
    created_at: string
    status: 'pending' | 'in_progress' | 'completed'
    description: string
    property?: { name: string }
  }>

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
        text: `Maintenance costs increased ${Math.round(maintenanceTrend.trendPercentage)}% month-over-month`,
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

    // Add rent records (use filtered records for ledger - respects dateRange filter)
    recordsForKPIs.forEach(record => {
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
  }, [recordsForKPIs, filteredExpenses, properties])

  const canExportCsv = !applyPlanGates || hasFeature('csvExport')

  const handleExportCSV = () => {
    if (applyPlanGates && !hasFeature('csvExport')) return
    exportLedgerToCSV(
      ledgerDataForExport,
      `ledger-export-${new Date().toISOString().split('T')[0]}.csv`
    )
  }

  // Unused handlers removed
  // const handleCategoryClick = (category: string) => { ... }
  // const handleRentClick = () => { ... }
  // const toggleLedgerRow = (id: string) => { ... }

  return (
    <div className="relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />

      {/* Page Header */}
      <div className="container mx-auto px-4 pt-6 pb-2 relative z-10">
        <motion.div
          initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
          animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
          transition={{
            duration: motionTokens.duration.normal,
            ease: motionTokens.easing.standard,
          }}
        >
          <h1 className="text-4xl font-semibold text-foreground mb-2">Finances</h1>
          <p className="text-muted-foreground">All your metrics at a glance</p>
        </motion.div>
      </div>

      {/* Section A: Page-Level Filter Bar (Authoritative Scope) - ABOVE KPI Strip */}
      {/* Page-wide filters define the base scope for all financial data on the page */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <FinancesFilterBar
            timePeriod={timePeriod}
            onTimePeriodChange={setTimePeriod}
            selectedPropertyId={selectedPropertyId}
            onPropertyChange={setSelectedPropertyId}
            properties={properties}
            data-onboarding="filter-bar"
          />
        </div>
      </div>

      {/* Section B: KPI Strip */}
      <KPIStrip
        totalCollected={metrics.rentCollected}
        outstandingRent={metrics.rentOutstanding}
        totalExpenses={metrics.totalExpenses}
        netProfit={metrics.netProfit}
        projectedNet={metrics.projectedNet}
        activeProperties={activeProperties}
        occupancyRate={occupancyRate}
        collectedChange={kpiChanges.collectedChange}
        expensesChange={kpiChanges.expensesChange}
        netChange={kpiChanges.netChange}
        projectedChange={kpiChanges.projectedChange}
        timePeriod={timePeriod}
        selectedPropertyId={selectedPropertyId}
        properties={properties}
        onCardClick={metric => {
          setKpiModalType(metric)
          setKpiModalOpen(true)
        }}
      />

      {/* KPI Modal */}
      <RentSummaryModal
        isOpen={kpiModalOpen}
        onClose={() => setKpiModalOpen(false)}
        metricType={
          kpiModalType as
            | 'collected'
            | 'outstanding'
            | 'expenses'
            | 'net'
            | 'projected'
            | 'activeProperties'
            | 'occupancy'
        }
        dateRange={dateRange}
        propertyId={selectedPropertyId || undefined}
        properties={properties}
        rentRecords={recordsForCharts}
        expenses={expensesWithFallback}
        tenants={tenants}
      />

      <div className="container mx-auto px-4 pt-0.5 pb-8 relative z-10">
        {/* Onboarding Tooltips */}
        <FinancesOnboarding />

        {!applyPlanGates || (!subscriptionLoading && hasFeature('advancedFinancials')) ? (
          <>
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

            <CollapsibleSection
              id="insights-trends"
              title="Smart Insights & Trends"
              defaultExpanded={false}
              className="mb-8"
            >
              <motion.div
                initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
                animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
                transition={{
                  duration: durationToSeconds(motionTokens.duration.base),
                  ease: motionTokens.easing.standard,
                }}
                data-onboarding="view-modes"
              >
                <div data-onboarding="expand-icon">
                  <FinancialInsightsModule
                    lineData={lineChartData}
                    barData={barChartData}
                    rentCollectedData={metrics.monthlyRentCollected.map(item => ({
                      month: item.month,
                      amount: item.amount,
                    }))}
                    outstandingRentData={[]} // Deferred: use calculateUnpaidRent by month
                    expensesData={metrics.monthlyExpenses.map(item => ({
                      month: item.month,
                      amount: item.amount,
                    }))}
                    netCashFlowData={metrics.monthlyNet.map(item => ({
                      month: item.month,
                      amount: item.net,
                    }))}
                    rentRecords={recordsForCharts}
                    expenses={expensesWithFallback}
                    workOrders={workOrdersForTimeline}
                    dateGranularity={dateGranularity}
                    timeRange={timeRange}
                    selectedPropertyId={selectedPropertyId || 'all'}
                    properties={properties}
                    onPropertyChange={propertyId =>
                      setSelectedPropertyId(propertyId === 'all' ? '' : propertyId)
                    }
                  />
                </div>
              </motion.div>
            </CollapsibleSection>
          </>
        ) : applyPlanGates && subscriptionLoading ? (
          <div className="mb-8 text-sm text-muted-foreground">Loading plan…</div>
        ) : (
          <div className="mb-8 p-4 rounded-lg border border-border bg-muted/30">
            <p className="text-sm text-foreground mb-3">
              Smart insights and trend charts are included on paid plans.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/landlord/subscription-plans')}
            >
              View plans
            </Button>
          </div>
        )}

        {/* Section D: Rent Ledger (Collapsible) */}
        <CollapsibleSection
          id="rent-ledger"
          title="Rent Ledger"
          defaultExpanded={true}
          className="mb-8"
        >
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardDescription>
                    {recordsForKPIs.length} rent record{recordsForKPIs.length !== 1 ? 's' : ''}
                    {selectedCategory && ` â€¢ Filtered by ${selectedCategory}`}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    disabled={ledgerDataForExport.length === 0 || !canExportCsv}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  {applyPlanGates && !subscriptionLoading && !hasFeature('csvExport') && (
                    <p className="text-xs text-muted-foreground text-right max-w-xs">
                      Portfolio plan includes CSV export.{' '}
                      <button
                        type="button"
                        className="underline text-primary font-medium"
                        onClick={() => navigate('/landlord/subscription-plans')}
                      >
                        Upgrade
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>

            {/* Ledger Entries */}
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recordsForKPIs.length === 0 ? (
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
                    {recordsForKPIs.map(record => (
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
                        <RentLedgerRow
                          record={record}
                          onReceiptGenerated={refetch}
                          onLateFeeUpdated={refetch}
                        />
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </CardContent>
          </Card>
        </CollapsibleSection>

        {/* Section E: Expense Table (Collapsible) */}
        <CollapsibleSection
          id="expense-table"
          title="Expenses"
          defaultExpanded={true}
          className="mb-8"
        >
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardDescription>
                    {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
                    {selectedCategory && ` â€¢ Filtered by ${selectedCategory}`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
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

            {/* Expense Form */}
            {(showExpenseForm || editingExpense) && (
              <CardContent className="border-b border-border pb-6">
                <motion.div
                  initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
                  animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
                  exit={{ opacity: motionTokens.opacity.hidden, y: -8 }}
                  transition={{
                    duration: motionTokens.duration.slow,
                    ease: motionTokens.easing.standard,
                  }}
                >
                  <ExpenseForm
                    onSubmit={async data => {
                      if (editingExpense) {
                        const result = await updateExpense(editingExpense.id, data)
                        if (!result.error) {
                          setEditingExpense(null)
                          setShowExpenseForm(false)
                        }
                        return { error: result.error }
                      } else {
                        const result = await createExpense(
                          data as {
                            property_id: string
                            name: string
                            amount: number
                            date: string
                          }
                        )
                        if (!result.error) {
                          setShowExpenseForm(false)
                        }
                        return { error: result.error }
                      }
                    }}
                    onCancel={() => {
                      setShowExpenseForm(false)
                      setEditingExpense(null)
                    }}
                    initialData={
                      editingExpense
                        ? {
                            id: editingExpense.id,
                            property_id: editingExpense.property_id,
                            name: editingExpense.name,
                            amount: editingExpense.amount,
                            date: editingExpense.date,
                            category: editingExpense.category,
                            is_recurring: editingExpense.is_recurring,
                            recurring_frequency: editingExpense.recurring_frequency,
                            recurring_start_date: editingExpense.recurring_start_date,
                            recurring_end_date: editingExpense.recurring_end_date,
                          }
                        : selectedPropertyId
                          ? {
                              property_id: selectedPropertyId,
                              name: '',
                              amount: 0,
                              date: new Date().toISOString().split('T')[0],
                            }
                          : undefined
                    }
                  />
                </motion.div>
              </CardContent>
            )}

            {/* Category Filter (for expenses only) */}
            <CardContent
              className={showExpenseForm || editingExpense ? 'border-b border-border pb-6' : 'pb-6'}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Category Filter</label>
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
            </CardContent>

            {/* Expense Entries */}
            <CardContent className="p-0">
              {filteredExpenses.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<FileText className="h-8 w-8" />}
                    title="No expenses found"
                    description="No expenses match your current filters."
                  />
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  <div className="divide-y divide-border">
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
                        data-testid={`finances-expense-row-${expense.id}`}
                        data-expense-name={expense.name}
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingExpense(expense)
                                  setShowExpenseForm(true)
                                }}
                                className="h-8 w-8 p-0"
                                title="Edit expense"
                                aria-label="Edit expense"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (!confirm('Are you sure you want to delete this expense?'))
                                    return
                                  const result = await deleteExpense(expense.id)
                                  if (!result.error) {
                                    // If we were editing this expense, close the editor.
                                    if (editingExpense?.id === expense.id) {
                                      setEditingExpense(null)
                                      setShowExpenseForm(false)
                                    }
                                  }
                                }}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                                title="Delete expense"
                                aria-label="Delete expense"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
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
        </CollapsibleSection>
      </div>
    </div>
  )
}
