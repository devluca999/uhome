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
import { motionTokens, durationToSeconds, createSpring } from '@/lib/motion'
import type { Database } from '@/types/database'

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
        amount: amount.toString(),
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
        user_id: 'fallback-user',
        category,
        description,
        amount: amount.toString(),
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
  const { properties } = useProperties()
  const { tenants } = useTenants()
  const { expenses, createExpense, updateExpense, deleteExpense, getProjectedExpenses } =
    useExpenses()
  const [searchParams, setSearchParams] = useSearchParams()
  // Page-level filter state
  // These two filters control ALL financial data on the page: KPIs, Ledger, Graph (default state)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthToDate')
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  // Legacy filter state (for ledger section)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expandedLedgerRows, setExpandedLedgerRows] = useState<Set<string>>(new Set())
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
  const cardSpring = createSpring('card')

  // Fetch work orders for timeline view
  const { requests: workOrders } = useMaintenanceRequests(
    selectedPropertyId || undefined,
    !!selectedPropertyId
  ) // true if property ID provided

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

  // Map timePeriod to dateGranularity, timeRange, and dateRange for backward compatibility
  // These derived values are used by FinancialInsightsModule and other components
  const { dateGranularity, timeRange, dateRange } = useMemo(() => {
    const now = new Date()
    switch (timePeriod) {
      case 'monthly':
        return {
          dateGranularity: 'monthly' as const,
          timeRange: undefined,
          dateRange: undefined, // Show all data with monthly aggregation
        }
      case 'quarterly':
        return {
          dateGranularity: 'quarterly' as const,
          timeRange: undefined,
          dateRange: undefined, // Show all data with quarterly aggregation
        }
      case 'yearly':
        return {
          dateGranularity: 'yearly' as const,
          timeRange: undefined,
          dateRange: undefined, // Show all data with yearly aggregation
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

  const filter: RentRecordFilter = useMemo(() => {
    const filter: RentRecordFilter = {}
    // Only filter by property if a specific property is selected (not empty or 'all')
    if (selectedPropertyId && selectedPropertyId !== 'all') {
      filter.propertyId = selectedPropertyId
    }
    if (dateRange) {
      filter.dateRange = dateRange
    }
    return filter
  }, [selectedPropertyId, dateRange])

  const { records: realRecords, loading, refetch } = useLandlordRentRecords(filter)

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

  // Use fallback data if no real data exists (for mock mode / power-user simulation)
  // IMPORTANT: Pass properties so fallback data uses real property IDs
  const records = useMemo(() => {
    if (realRecords.length === 0 && !loading) {
      return generateFallbackRentRecords(properties)
    }
    return realRecords
  }, [realRecords, loading, properties])

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

  // Use 12 months for better data visualization
  const metrics = useFinancialMetrics(
    records,
    expensesWithFallback,
    12,
    propertyFilter,
    graphTimeRange,
    dateRange
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
    const categories = [
      'maintenance',
      'utilities',
      'repairs',
      'insurance',
      'taxes',
      'landscaping',
      'cleaning',
    ] as const
    const categoryData = categories
      .map(category => {
        const categoryExpenses = filteredExpenses.filter(e => e.category === category)
        const total = categoryExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
        return {
          name: category.charAt(0).toUpperCase() + category.slice(1),
          value: total,
          color:
            category === 'maintenance'
              ? '#84A98C'
              : category === 'utilities'
                ? '#3b82f6'
                : category === 'repairs'
                  ? '#ef4444'
                  : category === 'insurance'
                    ? '#8b5cf6'
                    : category === 'taxes'
                      ? '#f59e0b'
                      : category === 'landscaping'
                        ? '#10b981'
                        : '#6b7280',
        }
      })
      .filter(item => item.value > 0)

    // If no data, return empty array (chart will show empty state)
    return categoryData
  }, [filteredExpenses])

  // Prepare work orders for timeline (map to expected format)
  const workOrdersForTimeline = useMemo(() => {
    return workOrders.map(wo => ({
      id: wo.id,
      property_id: wo.property_id,
      created_at: wo.created_at,
      status: wo.status,
      description: wo.description || wo.category || 'Work order',
      property: wo.property,
    }))
  }, [workOrders])

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
        rentRecords={records}
        expenses={expensesWithFallback}
      />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Onboarding Tooltips */}
        <FinancesOnboarding />

        {/* Section C: Graph (Collapsible) */}
        <CollapsibleSection id="graph" title="Graph" defaultExpanded={true} className="mb-8">
          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            transition={{
              duration: durationToSeconds(motionTokens.duration.base),
              ease: motionTokens.ease.standard,
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
                rentRecords={records}
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
                    {records.length} rent record{records.length !== 1 ? 's' : ''}
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
                    {selectedCategory && ` • Filtered by ${selectedCategory}`}
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
                    duration: motionTokens.duration.normal,
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
                        const result = await createExpense(data)
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
                        ? { ...editingExpense, id: editingExpense.id }
                        : selectedPropertyId
                          ? { property_id: selectedPropertyId }
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
