import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { ModalIndicator } from '@/components/ui/modal-indicator'
import { PortfolioCard } from '@/components/ui/portfolio-card'
import { ActivityFeedItem } from '@/components/ui/activity-feed-item'
import { DonutChart } from '@/components/ui/donut-chart'
import { BarChart } from '@/components/ui/bar-chart'
import { ProfitMarginCard } from '@/components/landlord/profit-margin-card'
import { SmartInsightCard } from '@/components/landlord/smart-insight-card'
import { ErrorAlert } from '@/components/error-alert'
import { Button } from '@/components/ui/button'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
// import { NumberCounter } from '@/components/ui/number-counter' // Reserved for future use
import { RevenueBreakdownModal } from '@/components/landlord/revenue-breakdown-modal'
import { RecentActivityModal } from '@/components/landlord/recent-activity-modal'
import { ProfitBreakdownModal } from '@/components/landlord/profit-breakdown-modal'
import { ExpenseDistributionModal } from '@/components/landlord/expense-distribution-modal'
import { PropertiesDistributionModal } from '@/components/landlord/properties-distribution-modal'
import { TenantDistributionModal } from '@/components/landlord/tenant-distribution-modal'
import { OccupancyBreakdownModal } from '@/components/landlord/occupancy-breakdown-modal'
import { TaskDistributionModal } from '@/components/landlord/task-distribution-modal'
import { WorkOrdersPreviewModal } from '@/components/landlord/work-orders-preview-modal'
import { MetricCard } from '@/components/ui/metric-card'
import { useProperties } from '@/hooks/use-properties'
import { useTenants } from '@/hooks/use-tenants'
import { useMaintenanceRequests } from '@/hooks/use-maintenance-requests'
import { useLandlordRentRecords } from '@/hooks/use-landlord-rent-records'
import { useExpenses } from '@/hooks/use-expenses'
import { useFinancialMetrics } from '@/hooks/use-financial-metrics'
import { useTasks } from '@/hooks/use-tasks'
import { useDocuments } from '@/hooks/use-documents'
import {
  Wrench,
  Plus,
  // MessageSquare, // Reserved for future use
  DollarSign,
  Receipt,
  // CheckSquare, // Reserved for future use
  Users,
  FileText,
  Calendar,
  ChevronRight,
  UserPlus,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { calculateOccupancyRate, getExpenseDate } from '@/lib/finance-calculations'
import { usePerformanceTracker } from '@/hooks/use-performance-tracker'
import { DataHealthCard } from '@/components/data-health/data-health-card'
import { useCurrencyFormatter } from '@/hooks/use-currency-formatter'
import { useSettings } from '@/contexts/settings-context'
import type { DashboardTimeline } from '@/contexts/settings-context'
import { supabase } from '@/lib/supabase/client' // used by child components via context
import { useAuth } from '@/contexts/auth-context'
import { resolveLandlordDataOwnerId } from '@/lib/landlord-data-owner-id'
import { FirstRunPrompt } from '@/components/landlord/first-run-prompt'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { MobileScrollFadeHeading } from '@/components/layout/mobile-scroll-fade-heading'
import { LandlordDashboardLoadingSkeleton } from '@/components/dashboard/dashboard-loading-skeleton'

type LandlordDashboardRpcRow = {
  total_properties: unknown
  active_leases: unknown
  total_tenants: unknown
  open_work_orders: unknown
  monthly_rent_due: unknown
  monthly_rent_collected: unknown
  collection_rate: unknown
  overdue_amount: unknown
}

export function LandlordDashboard() {
  // Track performance metrics
  usePerformanceTracker({ componentName: 'LandlordDashboard' })
  const isMobile = useIsMobile()

  // P2: removed ad-hoc DB probe; connectivity verified via users table
  const navigate = useNavigate()
  const { settings, updateSettings } = useSettings()
  const dashboardTimeline = settings.dashboardTimeline ?? 'monthly'
  const { properties, loading: propertiesLoading, error: propertiesError } = useProperties()
  const { tenants, loading: tenantsLoading, error: tenantsError } = useTenants()
  const { requests, loading: requestsLoading, error: requestsError } = useMaintenanceRequests()
  const { records: rentRecords, loading: rentRecordsLoading } = useLandlordRentRecords()
  const { expenses, loading: expensesLoading } = useExpenses()
  const { tasks } = useTasks()
  const { documents } = useDocuments() // Get all documents for activity feed
  const { format: formatCurrency } = useCurrencyFormatter()
  const { user, role, viewMode, demoState } = useAuth()
  const [rpcStats, setRpcStats] = useState<{
    total_properties: number
    active_leases: number
    total_tenants: number
    open_work_orders: number
    monthly_rent_due: number
    monthly_rent_collected: number
    collection_rate: number
    overdue_amount: number
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      const ownerId = await resolveLandlordDataOwnerId({
        role,
        viewMode,
        demoState,
        sessionUserId: authUser?.id,
      })
      if (!ownerId || cancelled) return
      const { data, error } = await supabase.rpc('get_landlord_dashboard_stats', {
        p_owner_id: ownerId,
      })
      if (cancelled) return
      if (error) {
        console.warn('[Dashboard RPC] get_landlord_dashboard_stats failed:', error)
        return
      }
      const row = data?.[0] as LandlordDashboardRpcRow | undefined
      if (!row) return
      setRpcStats({
        total_properties: Number(row.total_properties),
        active_leases: Number(row.active_leases),
        total_tenants: Number(row.total_tenants),
        open_work_orders: Number(row.open_work_orders),
        monthly_rent_due: Number(row.monthly_rent_due),
        monthly_rent_collected: Number(row.monthly_rent_collected),
        collection_rate: Number(row.collection_rate),
        overdue_amount: Number(row.overdue_amount),
      })
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, role, viewMode, demoState])

  // Date range and chart config based on dashboard timeline setting
  const { dateRange, timeRange, chartMonths, kpiMonths, timelineLabel } = useMemo(() => {
    const now = new Date()
    switch (dashboardTimeline) {
      case 'quarterly': {
        const q = Math.floor(now.getMonth() / 3) + 1
        const quarterStart = new Date(now.getFullYear(), (q - 1) * 3, 1)
        const quarterEnd = new Date(now.getFullYear(), q * 3, 0)
        return {
          dateRange: { start: quarterStart, end: quarterEnd },
          timeRange: 'quarter' as const,
          chartMonths: 12, // 4 quarters of data
          kpiMonths: 3,
          timelineLabel: 'Quarterly',
        }
      }
      case 'yearly': {
        const yearStart = new Date(now.getFullYear(), 0, 1)
        const yearEnd = new Date(now.getFullYear(), 11, 31)
        return {
          dateRange: { start: yearStart, end: yearEnd },
          timeRange: 'year' as const,
          chartMonths: 48, // 4 years for chart
          kpiMonths: 12,
          timelineLabel: 'Yearly',
        }
      }
      default: {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        return {
          dateRange: { start: monthStart, end: monthEnd },
          timeRange: 'month' as const,
          chartMonths: 6,
          kpiMonths: 1,
          timelineLabel: 'Monthly',
        }
      }
    }
  }, [dashboardTimeline])

  // Get active property IDs for filtering calculations
  const activePropertyIds = useMemo(() => {
    const ids = new Set(properties.filter(p => p.is_active !== false).map(p => p.id))
    if (import.meta.env.DEV) {
      console.debug(
        '[Dashboard Debug] Active Properties:',
        JSON.stringify(
          {
            totalProperties: properties.length,
            activeCount: ids.size,
            activeIds: Array.from(ids),
            properties: properties.map(p => ({ id: p.id, name: p.name, is_active: p.is_active })),
          },
          null,
          2
        )
      )
    }
    return ids
  }, [properties])

  // Wait for critical data to load before calculating metrics
  const isDataReady = !propertiesLoading && !rentRecordsLoading && !expensesLoading

  const rentRecordsForMetrics = useMemo(() => {
    if (!isDataReady) return []
    return rentRecords
  }, [isDataReady, rentRecords])

  const expensesForMetrics = useMemo(() => {
    if (!isDataReady) return []
    return expenses
  }, [isDataReady, expenses])

  // Use financial metrics for dashboard
  // For chart data - all historical data in the selected granularity
  // For KPI cards - filtered to current period (month/quarter/year)
  const historicalMetrics = useFinancialMetrics(
    rentRecordsForMetrics,
    expensesForMetrics,
    chartMonths,
    undefined, // propertyId - all properties
    timeRange,
    undefined, // dateRange - no filter for chart data
    activePropertyIds
  )

  const kpiMetrics = useFinancialMetrics(
    rentRecordsForMetrics,
    expensesForMetrics,
    kpiMonths,
    undefined,
    timeRange,
    dateRange, // filter to current period for KPIs
    activePropertyIds
  )

  // Use historical metrics for charts, kpiMetrics for KPI cards
  // NOTE: rentCollected from kpiMetrics uses paid_date scoped to dateRange (same as Finances page)
  // This ensures Dashboard and Finances page show the same numbers for the same period.
  const metrics = {
    ...historicalMetrics,
    rentCollected: kpiMetrics.rentCollected,
    rentOutstanding: kpiMetrics.rentOutstanding,
    totalExpenses: kpiMetrics.totalExpenses,
    netProfit: kpiMetrics.netProfit,
    marginPercentage: kpiMetrics.marginPercentage,
  }

  // Debug logging for data flow
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug(
        '[Dashboard Debug] Data Summary:',
        JSON.stringify(
          {
            rentRecords: {
              total: rentRecords.length,
              byStatus: {
                paid: rentRecords.filter(r => r.status === 'paid').length,
                pending: rentRecords.filter(r => r.status === 'pending').length,
                overdue: rentRecords.filter(r => r.status === 'overdue').length,
              },
              withPaidDate: rentRecords.filter(r => r.status === 'paid' && r.paid_date).length,
              sample: rentRecords.slice(0, 3).map(r => ({
                id: r.id,
                property_id: r.property_id,
                status: r.status,
                amount: r.amount,
                paid_date: r.paid_date,
                due_date: r.due_date,
              })),
            },
            expenses: {
              total: expenses.length,
              sample: expenses.slice(0, 3).map(e => ({
                id: e.id,
                property_id: e.property_id,
                amount: e.amount,
                date: getExpenseDate(e),
              })),
            },
            activePropertyIds: {
              count: activePropertyIds.size,
              ids: Array.from(activePropertyIds),
            },
            metrics: {
              rentCollected: metrics.rentCollected,
              rentOutstanding: metrics.rentOutstanding,
              upcomingRent: metrics.upcomingRent,
              totalExpenses: metrics.totalExpenses,
              monthlyRentCollected: {
                length: metrics.monthlyRentCollected.length,
                data: metrics.monthlyRentCollected,
              },
              monthlyExpenses: {
                length: metrics.monthlyExpenses.length,
                data: metrics.monthlyExpenses,
              },
            },
          },
          null,
          2
        )
      )
    }
  }, [rentRecords, expenses, activePropertyIds, metrics])
  // const cardSpring = createSpring('card') // Reserved for future use
  const [revenueModalOpen, setRevenueModalOpen] = useState(false)
  const [activityModalOpen, setActivityModalOpen] = useState(false)
  const [profitModalOpen, setProfitModalOpen] = useState(false)
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [propertiesModalOpen, setPropertiesModalOpen] = useState(false)
  const [tenantsModalOpen, setTenantsModalOpen] = useState(false)
  const [occupancyModalOpen, setOccupancyModalOpen] = useState(false)
  const [tasksModalOpen, setTasksModalOpen] = useState(false)
  const [workOrdersModalOpen, setWorkOrdersModalOpen] = useState(false)

  // Count pending tasks (all types, not just tenant tasks)
  const pendingTasks = tasks.filter(t => t.status === 'pending').length
  // const pendingTenantTasks = tasks.filter(
  //   t => t.status === 'pending' && t.assigned_to_type === 'tenant'
  // ).length // Reserved for future use

  // Count open work orders (not closed or resolved)
  const openWorkOrders = requests.filter(
    r => r.status !== 'closed' && r.status !== 'resolved'
  ).length

  const hasErrors = propertiesError || tenantsError || requestsError

  const isFirstRunEmpty = !propertiesLoading && properties.length === 0
  const dashboardDataLoading = propertiesLoading || rentRecordsLoading || expensesLoading

  // Calculate occupancy rate using centralized calculation (consistent with Finances page)
  const occupancyRate = useMemo(() => {
    return calculateOccupancyRate(properties, tenants)
  }, [properties, tenants])

  // Calculate occupancy count (number of properties with tenants)
  const occupancyCount = useMemo(() => {
    const occupiedPropertyIds = new Set(tenants.map(t => t.property_id).filter(Boolean))
    return occupiedPropertyIds.size
  }, [tenants])

  // Revenue for current period (month/quarter/year based on timeline)
  const periodRevenue = useMemo(() => {
    return kpiMetrics.rentCollected
  }, [kpiMetrics.rentCollected])

  // Expenses for current period (month/quarter/year based on timeline)
  const periodExpenses = useMemo(() => {
    const formatDateString = (d: Date) => d.toISOString().split('T')[0]
    const startStr = formatDateString(dateRange.start)
    const endStr = formatDateString(dateRange.end)

    return expensesForMetrics
      .filter(e => {
        if (!e.property_id || !activePropertyIds.has(e.property_id)) return false
        const expenseDateStr = getExpenseDate(e).split('T')[0]
        return expenseDateStr >= startStr && expenseDateStr <= endStr
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0)
  }, [expensesForMetrics, dateRange, activePropertyIds])

  // Net income for current period
  const netIncome = useMemo(() => {
    const result = periodRevenue - periodExpenses

    // Defensive invariant (dev only) - catch value scaling bugs
    if (import.meta.env.DEV) {
      if (periodRevenue > 0 && Math.abs(result) > periodRevenue * 2) {
        console.error('⚠️ Net Income Anomaly Detected!', {
          netIncome: result,
          revenue: periodRevenue,
          expenses: periodExpenses,
          ratio: result / (periodRevenue || 1),
          message:
            'Net income should not exceed revenue by more than 2x. Possible value scaling bug.',
        })
      }
    }

    // Debug logging for net income investigation
    if (import.meta.env.DEV) {
      const formatDateString = (d: Date) => d.toISOString().split('T')[0]
      const startStr = formatDateString(dateRange.start)
      const endStr = formatDateString(dateRange.end)

      const revenueRecords = rentRecordsForMetrics.filter(r => {
        if (r.status !== 'paid' || !r.paid_date) return false
        const paidDateStr = r.paid_date.split('T')[0]
        return paidDateStr >= startStr && paidDateStr <= endStr
      })

      const expenseRecords = expensesForMetrics.filter(e => {
        const expenseDateStr = getExpenseDate(e).split('T')[0]
        return expenseDateStr >= startStr && expenseDateStr <= endStr
      })

      console.debug('[Net Income Debug]', {
        dateRange: `${startStr} to ${endStr}`,
        periodRevenue,
        revenueRecordCount: revenueRecords.length,
        periodExpenses,
        expenseRecordCount: expenseRecords.length,
        calculatedNetIncome: result,
      })
    }

    return result
  }, [periodRevenue, periodExpenses, rentRecordsForMetrics, expensesForMetrics, dateRange])

  const mobilePeriodTitle = useMemo(() => {
    const d = dateRange.start
    if (dashboardTimeline === 'monthly') {
      return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    }
    if (dashboardTimeline === 'quarterly') {
      const q = Math.floor(d.getMonth() / 3) + 1
      return `Q${q} ${d.getFullYear()}`
    }
    return String(d.getFullYear())
  }, [dateRange.start, dashboardTimeline])

  const periodCollectionRate = useMemo(() => {
    if (dashboardTimeline === 'monthly' && rpcStats && rpcStats.monthly_rent_due > 0) {
      return Math.min(100, Math.max(0, rpcStats.collection_rate))
    }
    const collected = periodRevenue
    const out = kpiMetrics.rentOutstanding
    const denom = collected + out
    return denom > 0 ? (collected / denom) * 100 : 0
  }, [dashboardTimeline, rpcStats, periodRevenue, kpiMetrics.rentOutstanding])

  // Generate comprehensive activity feed
  const recentActivity = useMemo(() => {
    // Tenant joins (last 7 days)
    const recentTenants = tenants
      .filter(t => {
        const joinDate = new Date(t.created_at)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return joinDate >= weekAgo
      })
      .slice(0, 5)
      .map(tenant => ({
        id: `tenant-${tenant.id}`,
        title: `Tenant joined ${tenant.property?.name || 'property'}`,
        description: tenant.user?.email || 'New tenant',
        timestamp: new Date(tenant.created_at).toLocaleDateString(),
        icon: <Users className="w-4 h-4" />,
        onClick: () => navigate('/landlord/tenants'),
      }))

    // Work order status changes (last 7 days)
    const recentWorkOrders = requests
      .filter(r => {
        const updateDate = new Date(r.updated_at)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return updateDate >= weekAgo && r.status !== 'submitted'
      })
      .slice(0, 5)
      .map(request => ({
        id: `workorder-${request.id}`,
        title: `Work order marked ${request.status.replace('_', ' ')}`,
        description: request.property?.name || 'Property',
        timestamp: new Date(request.updated_at).toLocaleDateString(),
        icon: <Wrench className="w-4 h-4" />,
        onClick: () => navigate(`/landlord/operations?workOrderId=${request.id}`),
      }))

    // Document uploads (last 7 days)
    const recentDocs = documents
      .filter(d => {
        const uploadDate = new Date(d.created_at)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return uploadDate >= weekAgo
      })
      .slice(0, 5)
      .map(doc => ({
        id: `doc-${doc.id}`,
        title: `Lease uploaded`,
        description: doc.file_name,
        timestamp: new Date(doc.created_at).toLocaleDateString(),
        icon: <FileText className="w-4 h-4" />,
        onClick: () => navigate('/landlord/documents'),
      }))

    // Lease expirations (upcoming in next 60 days)
    const upcomingExpirations = tenants
      .filter(t => {
        if (!t.lease_end_date) return false
        const endDate = new Date(t.lease_end_date)
        const today = new Date()
        const future = new Date()
        future.setDate(future.getDate() + 60)
        return endDate >= today && endDate <= future
      })
      .slice(0, 5)
      .map(tenant => ({
        id: `expiry-${tenant.id}`,
        title: `Lease expires soon`,
        description: `${tenant.property?.name || 'Property'} - ${tenant.user?.email || 'Tenant'}`,
        timestamp: tenant.lease_end_date
          ? new Date(tenant.lease_end_date).toLocaleDateString()
          : '',
        icon: <Calendar className="w-4 h-4" />,
        onClick: () => navigate('/landlord/tenants'),
      }))

    // Combine and sort by timestamp (most recent first)
    const allActivities = [
      ...recentTenants,
      ...recentWorkOrders,
      ...recentDocs,
      ...upcomingExpirations,
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return allActivities
  }, [tenants, requests, documents, navigate])

  // Dashboard shows only 5 most recent
  const dashboardActivities = useMemo(() => recentActivity.slice(0, 5), [recentActivity])

  // Recent expenses (last 5) - used in expense distribution modal
  // @ts-expect-error - Intentionally unused for future use
  const recentExpenses = expensesForMetrics.slice(0, 5)

  // Donut chart data - always show at least one entry to ensure chart renders
  const donutChartData = useMemo(() => {
    const data = [
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
    // If no data, show a placeholder to ensure chart renders
    return data.length > 0 ? data : [{ name: 'No Data', value: 1, color: '#94a3b8' }]
  }, [metrics])

  // Calculate profit per property
  const profitByProperty = useMemo(() => {
    return properties.map(property => {
      const propertyRent = rentRecordsForMetrics
        .filter(r => r.property_id === property.id && r.status === 'paid')
        .reduce((sum, r) => sum + Number(r.amount), 0)

      const propertyExpenses = expensesForMetrics
        .filter(e => e.property_id === property.id)
        .reduce((sum, e) => sum + Number(e.amount), 0)

      return {
        property,
        rentCollected: propertyRent,
        expenses: propertyExpenses,
      }
    })
  }, [properties, rentRecordsForMetrics, expensesForMetrics])

  // Smart insights
  const insights = useMemo(() => {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthRecords = rentRecordsForMetrics.filter(r => {
      const dueDate = new Date(r.due_date)
      return dueDate >= thisMonthStart && dueDate <= now
    })

    const expectedRent = thisMonthRecords.reduce((sum, r) => sum + Number(r.amount), 0)
    const collectedRent = thisMonthRecords
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + Number(r.amount), 0)

    const collectionRate = expectedRent > 0 ? (collectedRent / expectedRent) * 100 : 0

    const insights: Array<{ message: string; type: 'info' | 'warning' | 'success' }> = []

    if (expectedRent > 0) {
      insights.push({
        message: `You've collected ${collectionRate.toFixed(0)}% of expected rent this month.`,
        type: collectionRate >= 90 ? 'success' : collectionRate >= 70 ? 'info' : 'warning',
      })
    }

    // Check for properties with high upkeep
    const avgExpensePerProperty =
      expensesForMetrics.length > 0 && properties.length > 0
        ? expensesForMetrics.reduce((sum, e) => sum + Number(e.amount), 0) / properties.length
        : 0

    profitByProperty.forEach(({ property, expenses }) => {
      if (expenses > avgExpensePerProperty * 1.5 && avgExpensePerProperty > 0) {
        insights.push({
          message: `${property.name} has higher upkeep than your average.`,
          type: 'warning',
        })
      }
    })

    // Check for late payments
    const overdueCount = rentRecordsForMetrics.filter(r => r.status === 'overdue').length
    if (overdueCount > 0) {
      insights.push({
        message: `${overdueCount} payment${overdueCount > 1 ? 's' : ''} ${overdueCount > 1 ? 'are' : 'is'} currently overdue.`,
        type: 'warning',
      })
    }

    return insights.slice(0, 3) // Limit to 3 insights
  }, [rentRecordsForMetrics, expensesForMetrics, properties, profitByProperty])

  return (
    <div className="container mx-auto px-4 pt-0.5 pb-8 relative min-h-screen bg-background [isolation:isolate]">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />

      <div className="relative z-10">
        <DataHealthCard className="mb-6" />
        {!isMobile && (
          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            transition={{
              duration: durationToSeconds(motionTokens.duration.base),
              ease: motionTokens.ease.standard,
            }}
            layout={false}
            className="mb-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl font-semibold text-foreground mb-2">Dashboard</h1>
                <p className="text-muted-foreground">Welcome back, landlord</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Summary:</span>
                <select
                  value={dashboardTimeline}
                  onChange={e =>
                    updateSettings({
                      dashboardTimeline: e.target.value as DashboardTimeline,
                    })
                  }
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  data-testid="dashboard-timeline-select"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {hasErrors && (
          <div className="mb-6 space-y-3">
            {propertiesError && <ErrorAlert error={propertiesError} />}
            {tenantsError && <ErrorAlert error={tenantsError} />}
            {requestsError && <ErrorAlert error={requestsError} />}
          </div>
        )}

        {dashboardDataLoading && (
          <LandlordDashboardLoadingSkeleton isMobile={isMobile} />
        )}

        {!dashboardDataLoading && (isFirstRunEmpty ? (
          <div className="mb-8">
            <FirstRunPrompt />
          </div>
        ) : isMobile ? (
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">{mobilePeriodTitle}</p>
              <select
                value={dashboardTimeline}
                onChange={e =>
                  updateSettings({
                    dashboardTimeline: e.target.value as DashboardTimeline,
                  })
                }
                className="h-8 rounded-md border border-input bg-background px-2 py-0.5 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                data-testid="dashboard-timeline-select"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <MobileScrollFadeHeading srTitle="Dashboard">
              <div className="text-center pt-1">
                <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                  {formatCurrency(periodRevenue)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  collected{' '}
                  {dashboardTimeline === 'monthly'
                    ? 'this month'
                    : dashboardTimeline === 'quarterly'
                      ? 'this quarter'
                      : 'this year'}
                </p>
              </div>
            </MobileScrollFadeHeading>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="glass-card rounded-xl p-3 border border-border/40">
                <p className="text-base font-semibold tabular-nums">
                  {periodCollectionRate.toFixed(0)}%
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                  Rate
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/landlord/ledger')}
                className="glass-card rounded-xl p-3 border border-border/40 text-center min-h-[72px]"
              >
                <p className="text-base font-semibold tabular-nums">
                  {formatCurrency(kpiMetrics.rentOutstanding)}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                  Owed
                </p>
              </button>
              <button
                type="button"
                onClick={() => setTasksModalOpen(true)}
                className="glass-card rounded-xl p-3 border border-border/40 text-center min-h-[72px]"
              >
                <p className="text-base font-semibold tabular-nums">{pendingTasks}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                  Tasks
                </p>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setProfitModalOpen(true)}
              className="w-full glass-card rounded-xl p-4 flex items-center justify-between border border-border/40 text-left active:opacity-90"
            >
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                  Net income
                </p>
                <p className="text-xl font-semibold tabular-nums mt-0.5">
                  {formatCurrency(netIncome)}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWorkOrdersModalOpen(true)}
                className="glass-card rounded-xl p-3 text-left border border-border/40"
              >
                <p className="text-[11px] text-muted-foreground">Work orders</p>
                <p className="text-xl font-semibold tabular-nums">
                  {requestsLoading ? '…' : openWorkOrders}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setOccupancyModalOpen(true)}
                className="glass-card rounded-xl p-3 text-left border border-border/40"
              >
                <p className="text-[11px] text-muted-foreground">Occupancy</p>
                <p className="text-xl font-semibold tabular-nums">
                  {tenantsLoading || propertiesLoading
                    ? '…'
                    : `${occupancyCount}/${properties.length}`}
                </p>
              </button>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">
                Quick actions
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="ghost"
                  asChild
                  className="h-auto flex-col gap-1 py-3 border border-border/50 text-xs"
                >
                  <Link to="/landlord/ledger">
                    <DollarSign className="h-4 w-4" />
                    Log rent
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  asChild
                  className="h-auto flex-col gap-1 py-3 border border-border/50 text-xs"
                >
                  <Link to="/landlord/operations">
                    <Wrench className="h-4 w-4" />
                    Work order
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  asChild
                  className="h-auto flex-col gap-1 py-3 border border-border/50 text-xs"
                >
                  <Link to="/landlord/tenants">
                    <UserPlus className="h-4 w-4" />
                    Invite
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <div onClick={() => setPropertiesModalOpen(true)} className="cursor-pointer relative">
              <ModalIndicator onClick={() => setPropertiesModalOpen(true)} />
              <div className="[&_.card-header]:pr-12">
                <PortfolioCard
                  title="Properties"
                  value={propertiesLoading ? 0 : properties.length}
                  description="Total properties"
                  index={0}
                />
              </div>
            </div>
            <div onClick={() => setTenantsModalOpen(true)} className="cursor-pointer relative">
              <ModalIndicator onClick={() => setTenantsModalOpen(true)} />
              <div className="[&_.card-header]:pr-12">
                <PortfolioCard
                  title="Tenants"
                  value={tenantsLoading ? 0 : tenants.length}
                  description="Total tenants"
                  index={1}
                />
              </div>
            </div>
            <div onClick={() => setOccupancyModalOpen(true)} className="cursor-pointer relative">
              <ModalIndicator onClick={() => setOccupancyModalOpen(true)} />
              <div className="[&_.card-header]:pr-12">
                <PortfolioCard
                  title="Occupancy"
                  value={tenantsLoading ? 0 : occupancyCount}
                  description={`${Math.round(occupancyRate)}% occupied`}
                  format={v => `${v}`}
                  index={2}
                  data-testid="dashboard-occupancy"
                />
              </div>
            </div>
            <div onClick={() => setRevenueModalOpen(true)} className="cursor-pointer relative">
              <ModalIndicator onClick={() => setRevenueModalOpen(true)} />
              <div className="[&_.card-header]:pr-12">
                <PortfolioCard
                  title={`${timelineLabel} Revenue`}
                  value={periodRevenue}
                  description={
                    dashboardTimeline === 'monthly'
                      ? 'Paid rent this month'
                      : dashboardTimeline === 'quarterly'
                        ? 'Paid rent this quarter'
                        : 'Paid rent this year'
                  }
                  format={v => formatCurrency(v)}
                  index={3}
                  data-testid="dashboard-revenue"
                />
              </div>
            </div>
            <div onClick={() => setTasksModalOpen(true)} className="cursor-pointer relative">
              <ModalIndicator onClick={() => setTasksModalOpen(true)} />
              <div className="[&_.card-header]:pr-12">
                <PortfolioCard
                  title="Pending Tasks"
                  value={pendingTasks}
                  description="Your action items and reminders"
                  index={4}
                />
              </div>
            </div>
            <div onClick={() => setWorkOrdersModalOpen(true)} className="cursor-pointer relative">
              <ModalIndicator onClick={() => setWorkOrdersModalOpen(true)} />
              <div className="[&_.card-header]:pr-12">
                <PortfolioCard
                  title="Open Work Orders"
                  value={requestsLoading ? 0 : openWorkOrders}
                  description="Maintenance requests in progress"
                  index={5}
                  data-testid="dashboard-work-orders"
                />
              </div>
            </div>
          </div>
        ))}

        {!isFirstRunEmpty && !isMobile && rpcStats && rpcStats.monthly_rent_due > 0 && (
          <div className="text-xs text-muted-foreground text-center mb-6 -mt-2">
            This month: {formatCurrency(rpcStats.monthly_rent_collected)} collected of{' '}
            {formatCurrency(rpcStats.monthly_rent_due)} due ({rpcStats.collection_rate.toFixed(1)}%
            collection rate)
            {rpcStats.overdue_amount > 0 && (
              <span className="text-destructive ml-2">
                · {formatCurrency(rpcStats.overdue_amount)} overdue
              </span>
            )}
          </div>
        )}

        {!isFirstRunEmpty && !isMobile && (
          <>
            {/* Financial Summary Section */}
            <motion.div
              initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
              animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
              transition={{
                duration: durationToSeconds(motionTokens.duration.base),
                delay: 0.06, // Reduced from 0.3
                ease: motionTokens.ease.standard,
              }}
              layout={false}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Financial Summary</h2>
              <p className="text-sm text-muted-foreground">Rent collection overview</p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/landlord/ledger">View Ledger</Link>
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Rent Status</CardTitle>
                <CardDescription>Breakdown of rent collection</CardDescription>
              </CardHeader>
              <CardContent>
                {donutChartData.length > 0 ? (
                  <DonutChart data={donutChartData} />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No rent data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>{timelineLabel} Collection</CardTitle>
                <CardDescription>
                  {dashboardTimeline === 'monthly'
                    ? 'Last 6 months'
                    : dashboardTimeline === 'quarterly'
                      ? 'Last 4 quarters'
                      : 'Last 4 years'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.monthlyRentCollected.length > 0 ? (
                  <BarChart data={metrics.monthlyRentCollected} />
                ) : (
                  <BarChart data={[{ month: 'No Data', amount: 0 }]} />
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Financial Summary Cards */}
        <motion.div
          initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
          animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
          transition={{
            duration: motionTokens.duration.normal,
            delay: 0.12,
            ease: motionTokens.easing.standard,
          }}
          layout={false}
          className="mb-8"
        >
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-foreground">Financial Summary</h2>
            <p className="text-sm text-muted-foreground">Income, expenses, and profitability</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <ModalIndicator onClick={() => setProfitModalOpen(true)} />
              <MetricCard
                title="Net Income"
                value={formatCurrency(netIncome)}
                description={`Cash-based net cash flow (collected rent minus expenses) • ${metrics.marginPercentage.toFixed(1)}% margin`}
                onClick={() => setProfitModalOpen(true)}
                variant={netIncome >= 0 ? 'success' : 'danger'}
                data-testid="dashboard-net-income"
              />
            </div>
            <div className="relative">
              <ModalIndicator onClick={() => setExpenseModalOpen(true)} />
              <MetricCard
                title="Total Expenses"
                value={formatCurrency(periodExpenses)}
                description={
                  dashboardTimeline === 'monthly'
                    ? 'This month'
                    : dashboardTimeline === 'quarterly'
                      ? 'This quarter'
                      : 'This year'
                }
                icon={<Receipt className="w-4 h-4" />}
                onClick={() => setExpenseModalOpen(true)}
                data-testid="dashboard-expenses"
              />
            </div>
            <MetricCard
              title="Projected Net"
              value={formatCurrency(metrics.projectedNet)}
              description="Next 30 days"
            />
          </div>
        </motion.div>

        {/* Property Profitability Section */}
        {profitByProperty.length > 0 && (
          <CollapsibleSection
            id="dashboard-property-profitability"
            title="Property Profitability"
            defaultExpanded={true}
            className="mb-8"
          >
            <motion.div
              initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
              animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
              transition={{
                duration: durationToSeconds(motionTokens.duration.base),
                delay: 0.24,
                ease: motionTokens.ease.standard,
              }}
              layout={false}
            >
              <p className="text-sm text-muted-foreground mb-4">
                Net profit and margins by property
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {profitByProperty.map((item, index) => (
                  <ProfitMarginCard
                    key={item.property.id}
                    propertyName={item.property.name}
                    rentCollected={item.rentCollected}
                    expenses={item.expenses}
                    index={index}
                  />
                ))}
              </div>
            </motion.div>
          </CollapsibleSection>
        )}

        {/* Smart Insights Section */}
        {insights.length > 0 && (
          <CollapsibleSection
            id="dashboard-smart-insights"
            title="Smart Insights"
            defaultExpanded={true}
            className="mb-8"
          >
            <motion.div
              initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
              animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
              transition={{
                duration: durationToSeconds(motionTokens.duration.base),
                delay: 0.3,
                ease: motionTokens.ease.standard,
              }}
              layout={false}
            >
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {insights.map((insight, index) => (
                  <SmartInsightCard
                    key={index}
                    message={insight.message}
                    type={insight.type}
                    index={index}
                  />
                ))}
              </div>
            </motion.div>
          </CollapsibleSection>
        )}

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <CollapsibleSection
            id="dashboard-recent-activity"
            title="Recent Activity"
            defaultExpanded={true}
          >
            <motion.div
              initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
              animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
              transition={{
                duration: durationToSeconds(motionTokens.duration.base),
                delay: 0.36,
                ease: motionTokens.ease.standard,
              }}
              layout={true}
            >
              <Card
                className="glass-card relative overflow-hidden cursor-pointer"
                onClick={() => dashboardActivities.length > 0 && setActivityModalOpen(true)}
              >
                <ModalIndicator
                  onClick={() => dashboardActivities.length > 0 && setActivityModalOpen(true)}
                />
                <GrainOverlay />
                <MatteLayer intensity="subtle" />
                <CardHeader className="pr-12">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardDescription>Latest updates and notifications</CardDescription>
                    </div>
                    {dashboardActivities.length > 0 && recentActivity.length > 5 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation()
                          setActivityModalOpen(true)
                        }}
                      >
                        View All
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {requestsLoading || tenantsLoading ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : dashboardActivities.length === 0 ? (
                    <p className="text-muted-foreground">No recent activity</p>
                  ) : (
                    dashboardActivities.map((activity, index) => (
                      <div
                        key={activity.id}
                        onClick={e => {
                          e.stopPropagation()
                          activity.onClick()
                        }}
                      >
                        <ActivityFeedItem
                          title={activity.title}
                          description={activity.description}
                          timestamp={activity.timestamp}
                          icon={activity.icon}
                          index={index}
                          onClick={activity.onClick}
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </CollapsibleSection>

          <CollapsibleSection
            id="dashboard-quick-actions"
            title="Quick Actions"
            defaultExpanded={true}
          >
            <motion.div
              initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
              animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
              transition={{
                duration: durationToSeconds(motionTokens.duration.base),
                delay: 0.42,
                ease: motionTokens.ease.standard,
              }}
              layout={true}
            >
              <Card className="glass-card relative overflow-hidden">
                <GrainOverlay />
                <MatteLayer intensity="subtle" />
                <CardHeader>
                  <CardDescription>Common tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full">
                    <Link to="/landlord/properties">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Property
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/landlord/ledger">
                      <DollarSign className="mr-2 h-4 w-4" />
                      View Ledger
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/landlord/operations">
                      <Wrench className="mr-2 h-4 w-4" />
                      View Operations
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/landlord/tenants">
                      <Plus className="mr-2 h-4 w-4" />
                      Invite Tenant
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </CollapsibleSection>
        </div>
          </>
        )}
      </div>

      {/* Revenue Breakdown Modal */}
      <RevenueBreakdownModal isOpen={revenueModalOpen} onClose={() => setRevenueModalOpen(false)} />

      {/* Recent Activity Modal */}
      <RecentActivityModal
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        activities={recentActivity}
      />

      {/* Profit Breakdown Modal */}
      <ProfitBreakdownModal isOpen={profitModalOpen} onClose={() => setProfitModalOpen(false)} />

      {/* Expense Distribution Modal */}
      <ExpenseDistributionModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
      />

      {/* Properties Distribution Modal */}
      <PropertiesDistributionModal
        isOpen={propertiesModalOpen}
        onClose={() => setPropertiesModalOpen(false)}
      />

      {/* Tenant Distribution Modal */}
      <TenantDistributionModal
        isOpen={tenantsModalOpen}
        onClose={() => setTenantsModalOpen(false)}
      />

      {/* Occupancy Breakdown Modal */}
      <OccupancyBreakdownModal
        isOpen={occupancyModalOpen}
        onClose={() => setOccupancyModalOpen(false)}
      />

      {/* Task Distribution Modal */}
      <TaskDistributionModal isOpen={tasksModalOpen} onClose={() => setTasksModalOpen(false)} />

      {/* Work Orders Preview Modal */}
      <WorkOrdersPreviewModal
        isOpen={workOrdersModalOpen}
        onClose={() => setWorkOrdersModalOpen(false)}
      />
    </div>
  )
}
