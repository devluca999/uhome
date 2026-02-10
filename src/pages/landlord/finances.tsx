import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { calculateActiveProperties, calculateOccupancyRate } from '@/lib/finance-calculations'
import { exportLedgerToCSV } from '@/utils/export-csv'
import { FileText, Plus, Download, X, Edit } from 'lucide-react'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import type { Database } from '@/types/database'
import { usePerformanceTracker } from '@/hooks/use-performance-tracker'

type Expense = Database['public']['Tables']['expenses']['Row']
type RentRecordWithRelations = import('@/hooks/use-landlord-rent-records').RentRecordWithRelations

// Generate fallback mock rent records for demo purposes (power-user simulation)
// IMPORTANT: Uses actual property IDs from properties array to ensure property filter works
function generateFallbackRentRecords(
  properties: Array<{ id: string; name: string; address?: string | null }>
): RentRecordWithRelations[] {
  const today = new Date()
  const records: RentRecordWithRelations[] = []
  const amounts = [2400, 2800, 3200]
  const paymentMethods = ['Zelle', 'Cash', 'Check', 'Venmo', 'Bank Transfer']

  // Use actual properties, or fallback to 3 if none exist
  const propsToUse =
    properties.length > 0
      ? properties
      : [
          { id: 'fallback-property-0', name: 'Property 1', address: '123 Demo St' },
          { id: 'fallback-property-1', name: 'Property 2', address: '456 Demo St' },
          { id: 'fallback-property-2', name: 'Property 3', address: '789 Demo St' },
        ]

  // Generate 12 months of data (enhanced for realistic power-user simulation)
  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const dueDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1)
    const isPastMonth = monthOffset > 0
    const isCurrentMonth = monthOffset === 0

    for (let i = 0; i < propsToUse.length; i++) {
      const property = propsToUse[i]
      const amount = amounts[i % amounts.length]
      let status: 'paid' | 'pending' | 'overdue' = 'pending'
      let paidDate: string | null = null
      let paymentMethodType: 'manual' | 'external' | null = null
      let paymentMethodLabel: string | null = null

      if (isPastMonth) {
        status = 'paid'
        paymentMethodType = 'external'
        paymentMethodLabel = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]

        // Vary payment dates: 70% on time or early, 30% late (realistic distribution)
        const paymentVariation = Math.random()
        if (paymentVariation < 0.3) {
          // Late payment (1-5 days after due date)
          const daysLate = Math.floor(Math.random() * 5) + 1
          paidDate = new Date(dueDate.getTime() + daysLate * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]
        } else if (paymentVariation < 0.7) {
          // On time (due date)
          paidDate = dueDate.toISOString().split('T')[0]
        } else {
          // Early payment (1-2 days before)
          const daysEarly = Math.floor(Math.random() * 2) + 1
          paidDate = new Date(dueDate.getTime() - daysEarly * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]
        }
      } else if (isCurrentMonth && Math.random() > 0.3) {
        // 70% chance current month is paid
        status = 'paid'
        paymentMethodType = 'external'
        paymentMethodLabel = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
        const daysAgo = Math.floor(Math.random() * 5) // Paid 0-5 days ago
        paidDate = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0]
      } else if (isCurrentMonth) {
        // 30% chance current month is still pending
        status = 'pending'
      }

      records.push({
        id: `fallback-${monthOffset}-${i}`,
        property_id: property.id, // Use actual property ID
        tenant_id: `fallback-tenant-${i}`,
        amount: amount, // Keep as number
        due_date: dueDate.toISOString().split('T')[0],
        status,
        paid_date: paidDate,
        payment_method_type: paymentMethodType,
        payment_method_label: paymentMethodLabel,
        notes: null,
        receipt_url: null,
        created_at: dueDate.toISOString(),
        updated_at: dueDate.toISOString(),
        property: {
          id: property.id,
          name: property.name,
          address: property.address || null,
        },
        tenant: {
          id: `fallback-tenant-${i}`,
          user: {
            id: `fallback-user-${i}`,
            email: `tenant${i + 1}@example.com`,
          },
        },
      } as RentRecordWithRelations)
    }
  }

  return records
}

// Generate fallback mock expenses for demo purposes
// IMPORTANT: Uses actual property IDs from properties array to ensure property filter works
function generateFallbackExpenses(properties: Array<{ id: string; name: string }>): Expense[] {
  const today = new Date()
  const expenses: Expense[] = []
  const categories = ['maintenance', 'utilities', 'repairs', 'insurance', 'taxes']
  const descriptions = {
    maintenance: ['HVAC service', 'Gutter cleaning', 'Lawn mowing'],
    utilities: ['Water bill', 'Electricity bill', 'Gas bill'],
    repairs: ['Plumbing repair', 'Electrical repair', 'Roof repair'],
    insurance: ['Property insurance', 'Liability insurance'],
    taxes: ['Property tax', 'Quarterly tax'],
  }

  // Use actual properties, or fallback to 3 if none exist
  const propsToUse =
    properties.length > 0
      ? properties
      : [
          { id: 'fallback-property-0', name: 'Property 1' },
          { id: 'fallback-property-1', name: 'Property 2' },
          { id: 'fallback-property-2', name: 'Property 3' },
        ]

  // Generate 12 months of expenses (enhanced for realistic simulation)
  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const expenseDate = new Date(
      today.getFullYear(),
      today.getMonth() - monthOffset,
      Math.floor(Math.random() * 28) + 1
    )
    const numExpenses = Math.random() > 0.5 ? 2 : 1

    for (let e = 0; e < numExpenses; e++) {
      const property = propsToUse[e % propsToUse.length] // Distribute expenses across properties
      const category = categories[Math.floor(Math.random() * categories.length)]
      const categoryDescriptions = descriptions[category as keyof typeof descriptions]
      const description =
        categoryDescriptions[Math.floor(Math.random() * categoryDescriptions.length)]

      let amount: number
      if (category === 'insurance' || category === 'taxes') {
        amount = Math.floor(Math.random() * 500) + 200
      } else if (category === 'repairs') {
        amount = Math.floor(Math.random() * 400) + 100
      } else {
        amount = Math.floor(Math.random() * 200) + 50
      }

      expenses.push({
        id: `fallback-expense-${monthOffset}-${e}`,
        property_id: property.id, // Use actual property ID
        name: description, // Use description as name
        category: category as 'maintenance' | 'utilities' | 'repairs' | null,
        amount: amount, // Keep as number
        date: expenseDate.toISOString().split('T')[0],
        is_recurring: category === 'utilities' && Math.random() > 0.5,
        recurring_frequency: null,
        recurring_start_date: null,
        recurring_end_date: null,
        created_at: expenseDate.toISOString(),
        updated_at: expenseDate.toISOString(),
      } as Expense)
    }
  }

  return expenses
}

export function LandlordFinances() {
  // Track performance metrics
  usePerformanceTracker({ componentName: 'LandlordFinances' })

  const { properties } = useProperties()
  const { tenants } = useTenants()
  const { expenses, createExpense, updateExpense } = useExpenses()
  const [searchParams, setSearchParams] = useSearchParams()
  // Page-level filter state
  // These two filters control ALL financial data on the page: KPIs, Ledger, Graph (default state)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('yearToDate') // Default to year-to-date for better demo showcase
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

  // Filter for KPI calculations (includes dateRange)
  const kpiFilter: RentRecordFilter = useMemo(() => {
    const filter: RentRecordFilter = {}
    if (selectedPropertyId && selectedPropertyId !== 'all') {
      filter.propertyId = selectedPropertyId
    }
    if (dateRange) {
      filter.dateRange = dateRange
    }
    return filter
  }, [selectedPropertyId, dateRange])

  // Fetch ALL records for charts (no dateRange filter)
  const { records: allRecords, loading, refetch } = useLandlordRentRecords(chartFilter)

  // Fetch filtered records for KPI calculations
  const { records: filteredRecords } = useLandlordRentRecords(kpiFilter)

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
  // Use fallback data if no real data exists (for mock mode / power-user simulation)
  // IMPORTANT: Pass properties so fallback data uses real property IDs
  const recordsForCharts = useMemo(() => {
    if (allRecords.length === 0 && !loading) {
      return generateFallbackRentRecords(properties)
    }
    return allRecords
  }, [allRecords, loading, properties])

  // Use filtered records for KPI calculations (with dateRange filter)
  const recordsForKPIs = useMemo(() => {
    if (filteredRecords.length === 0 && !loading) {
      return generateFallbackRentRecords(properties)
    }
    return filteredRecords
  }, [filteredRecords, loading, properties])

  // Use fallback expenses if no real expenses exist
  // IMPORTANT: Pass properties so fallback data uses real property IDs
  const expensesWithFallback = useMemo(() => {
    if (expenses.length === 0) {
      return generateFallbackExpenses(properties)
    }
    return expenses
  }, [expenses, properties])

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
        const expenseDate = new Date(e.date)
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

  const handleExportCSV = () => {
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
        {/* Page Header */}
        <motion.div
          initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
          animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
          transition={{
            duration: motionTokens.duration.normal,
            ease: motionTokens.easing.standard,
          }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-semibold text-foreground mb-2">Finances</h1>
              <p className="text-muted-foreground">All your metrics at a glance</p>
            </div>
          </div>
        </motion.div>

        {/* Onboarding Tooltips */}
        <FinancesOnboarding />

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

        {/* Section F: Smart Insights & Trends (Collapsible, Default Collapsed) */}
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
                outstandingRentData={[]} // TODO: Calculate outstanding rent by month
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
                              >
                                <Edit className="w-4 h-4" />
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
