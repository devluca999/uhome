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
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { calculateOccupancyRate } from '@/lib/finance-calculations'
import { usePerformanceTracker } from '@/hooks/use-performance-tracker'
import { DataHealthCard } from '@/components/data-health/data-health-card'
import { useCurrencyFormatter } from '@/hooks/use-currency-formatter'

export function LandlordDashboard() {
  // Track performance metrics
  usePerformanceTracker({ componentName: 'LandlordDashboard' })
  const navigate = useNavigate()
  const { properties, loading: propertiesLoading, error: propertiesError } = useProperties()
  const { tenants, loading: tenantsLoading, error: tenantsError } = useTenants()
  const { requests, loading: requestsLoading, error: requestsError } = useMaintenanceRequests()
  const { records: rentRecords, loading: rentRecordsLoading } = useLandlordRentRecords()
  const { expenses, loading: expensesLoading } = useExpenses()
  const { tasks } = useTasks()
  const { documents } = useDocuments() // Get all documents for activity feed
  const { format: formatCurrency } = useCurrencyFormatter()

  // Calculate current calendar month range (full month, not month-to-date)
  // Dashboard always shows current calendar month only - no filters, no month-to-date
  const currentMonthRange = useMemo(() => {
    const now = new Date()
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0), // Last day of month
    }
  }, [])

  // Get active property IDs for filtering calculations
  const activePropertyIds = useMemo(() => {
    const ids = new Set(properties.filter(p => p.is_active !== false).map(p => p.id))
    if (import.meta.env.DEV) {
      console.debug('[Dashboard Debug] Active Properties:', JSON.stringify({
        totalProperties: properties.length,
        activeCount: ids.size,
        activeIds: Array.from(ids),
        properties: properties.map(p => ({ id: p.id, name: p.name, is_active: p.is_active })),
      }, null, 2))
    }
    return ids
  }, [properties])

  // Wait for critical data to load before calculating metrics
  const isDataReady = !propertiesLoading && !rentRecordsLoading && !expensesLoading

  // Use financial metrics for dashboard
  // For chart data (monthlyRentCollected), we need all historical data (no dateRange filter)
  // For KPI cards (revenue, expenses, net income), we use currentMonthRange calculations directly
  // We call useFinancialMetrics twice: once for historical charts, once for current month KPIs
  // Only calculate if data is ready to avoid showing 0s while loading
  const historicalMetrics = useFinancialMetrics(
    isDataReady ? rentRecords : [],
    isDataReady ? expenses : [],
    6,
    undefined, // propertyId - all properties
    'month', // timeRange
    undefined, // dateRange - no filter for chart data (charts need all historical data)
    activePropertyIds
  )
  
  // Get current month metrics for KPI cards to match finances page
  const currentMonthMetrics = useFinancialMetrics(
    isDataReady ? rentRecords : [],
    isDataReady ? expenses : [],
    1, // Only need current month
    undefined, // propertyId - all properties
    'month', // timeRange
    currentMonthRange, // dateRange - filter to current month for KPI consistency
    activePropertyIds
  )
  
  // Use historical metrics for charts, current month metrics for KPIs
  const metrics = {
    ...historicalMetrics,
    // Override KPI values with current month filtered values
    rentCollected: currentMonthMetrics.rentCollected,
    totalExpenses: currentMonthMetrics.totalExpenses,
    netProfit: currentMonthMetrics.netProfit,
    marginPercentage: currentMonthMetrics.marginPercentage,
  }
  

  // Debug logging for data flow
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug('[Dashboard Debug] Data Summary:', JSON.stringify({
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
            date: e.date,
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
      }, null, 2))
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

  // Calculate occupancy rate using centralized calculation (consistent with Finances page)
  const occupancyRate = useMemo(() => {
    return calculateOccupancyRate(properties, tenants)
  }, [properties, tenants])

  // Calculate occupancy count (number of properties with tenants)
  const occupancyCount = useMemo(() => {
    const occupiedPropertyIds = new Set(tenants.map(t => t.property_id).filter(Boolean))
    return occupiedPropertyIds.size
  }, [tenants])

  // Calculate monthly revenue (collected rent in current month)
  // Use currentMonthMetrics.rentCollected to ensure consistency with metrics.rentCollected
  const monthlyRevenue = useMemo(() => {
    return currentMonthMetrics.rentCollected
  }, [currentMonthMetrics.rentCollected])

  // Calculate monthly expenses (expenses with date in current month)
  // This matches test helper calculateMonthlyExpenses logic exactly
  // Use date string comparison (YYYY-MM-DD) to match test helper formatDate logic
  // Filter to only active properties
  const monthlyExpenses = useMemo(() => {
    const monthStart = currentMonthRange.start
    const monthEnd = currentMonthRange.end

    // Format dates as YYYY-MM-DD for comparison (matches test helper formatDate)
    const formatDateString = (date: Date) => date.toISOString().split('T')[0]
    const monthStartStr = formatDateString(monthStart)
    const monthEndStr = formatDateString(monthEnd)

    // Calculate expenses in the month (using date field)
    // Filter to only active properties
    // This matches the test helper calculateMonthlyExpenses logic exactly
    return expenses
      .filter(e => {
        // Filter by active properties
        if (!e.property_id || !activePropertyIds.has(e.property_id)) return false
        const expenseDateStr = e.date.split('T')[0] // Get YYYY-MM-DD part
        return expenseDateStr >= monthStartStr && expenseDateStr <= monthEndStr
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0)
  }, [expenses, currentMonthRange, activePropertyIds])

  // Calculate net income (collected revenue - expenses)
  // This matches test helper calculateMonthlyNetIncome logic exactly:
  // - Revenue: monthlyRevenue (collected rent using paid_date in current month, cash accounting)
  // - Expenses: monthlyExpenses (expenses with date in current month)
  const netIncome = useMemo(() => {
    const result = monthlyRevenue - monthlyExpenses

    // Defensive invariant (dev only) - catch value scaling bugs
    if (import.meta.env.DEV) {
      if (monthlyRevenue > 0 && Math.abs(result) > monthlyRevenue * 2) {
        console.error('⚠️ Net Income Anomaly Detected!', {
          netIncome: result,
          revenue: monthlyRevenue,
          expenses: monthlyExpenses,
          ratio: result / (monthlyRevenue || 1),
          message:
            'Net income should not exceed revenue by more than 2x. Possible value scaling bug.',
        })
      }
    }

    // Debug logging for net income investigation
    if (import.meta.env.DEV) {
      const monthStart = currentMonthRange.start
      const monthEnd = currentMonthRange.end
      const formatDateString = (date: Date) => date.toISOString().split('T')[0]
      const monthStartStr = formatDateString(monthStart)
      const monthEndStr = formatDateString(monthEnd)

      // Count records used in calculation
      const revenueRecords = rentRecords.filter(r => {
        if (r.status !== 'paid') return false
        if (!r.paid_date) return false
        const paidDateStr = r.paid_date.split('T')[0]
        return paidDateStr >= monthStartStr && paidDateStr <= monthEndStr
      })

      const expenseRecords = expenses.filter(e => {
        const expenseDateStr = e.date.split('T')[0]
        return expenseDateStr >= monthStartStr && expenseDateStr <= monthEndStr
      })

      // Calculate per-property revenue breakdown
      const revenueByProperty = properties.map(p => ({
        propertyId: p.id,
        propertyName: p.name,
        revenue: rentRecords
          .filter(r => r.property_id === p.id && r.status === 'paid' && r.paid_date)
          .filter(r => {
            const paidDateStr = r.paid_date!.split('T')[0]
            return paidDateStr >= monthStartStr && paidDateStr <= monthEndStr
          })
          .reduce((sum, r) => sum + Number(r.amount || 0) + Number(r.late_fee || 0), 0),
      }))

      // Calculate per-property expense breakdown
      const expensesByProperty = properties.map(p => ({
        propertyId: p.id,
        propertyName: p.name,
        expenses: expenses
          .filter(e => e.property_id === p.id)
          .filter(e => {
            const expenseDateStr = e.date.split('T')[0]
            return expenseDateStr >= monthStartStr && expenseDateStr <= monthEndStr
          })
          .reduce((sum, e) => sum + Number(e.amount || 0), 0),
      }))

      console.debug('[Net Income Debug]', {
        monthRange: `${monthStartStr} to ${monthEndStr}`,
        propertiesCount: properties.length,
        propertyIds: properties.map(p => p.id),
        monthlyRevenue,
        revenueRecordCount: revenueRecords.length,
        revenueByProperty,
        revenueRecords: revenueRecords.map(r => ({
          id: r.id,
          property_id: r.property_id,
          amount: r.amount,
          late_fee: r.late_fee,
          paid_date: r.paid_date?.split('T')[0],
        })),
        monthlyExpenses,
        expenseRecordCount: expenseRecords.length,
        expensesByProperty,
        expenseRecords: expenseRecords.map(e => ({
          id: e.id,
          amount: e.amount,
          date: e.date.split('T')[0],
          property_id: e.property_id,
        })),
        calculatedNetIncome: result,
      })
    }

    return result
  }, [monthlyRevenue, monthlyExpenses, rentRecords, expenses, currentMonthRange])

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
        onClick: () => navigate('/landlord/operations'),
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
  const recentExpenses = expenses.slice(0, 5)

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
      const propertyRent = rentRecords
        .filter(r => r.property_id === property.id && r.status === 'paid')
        .reduce((sum, r) => sum + Number(r.amount), 0)

      const propertyExpenses = expenses
        .filter(e => e.property_id === property.id)
        .reduce((sum, e) => sum + Number(e.amount), 0)

      return {
        property,
        rentCollected: propertyRent,
        expenses: propertyExpenses,
      }
    })
  }, [properties, rentRecords, expenses])

  // Smart insights
  const insights = useMemo(() => {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthRecords = rentRecords.filter(r => {
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
      expenses.length > 0 && properties.length > 0
        ? expenses.reduce((sum, e) => sum + Number(e.amount), 0) / properties.length
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
    const overdueCount = rentRecords.filter(r => r.status === 'overdue').length
    if (overdueCount > 0) {
      insights.push({
        message: `${overdueCount} payment${overdueCount > 1 ? 's' : ''} ${overdueCount > 1 ? 'are' : 'is'} currently overdue.`,
        type: 'warning',
      })
    }

    return insights.slice(0, 3) // Limit to 3 insights
  }, [rentRecords, expenses, properties, profitByProperty])

  return (
    <div className="container mx-auto px-4 pt-0.5 pb-8 relative min-h-screen">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />

      <div className="relative z-10">
        <DataHealthCard className="mb-6" />
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
          <h1 className="text-4xl font-semibold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, landlord</p>
        </motion.div>

        {hasErrors && (
          <div className="mb-6 space-y-3">
            {propertiesError && <ErrorAlert error={propertiesError} />}
            {tenantsError && <ErrorAlert error={tenantsError} />}
            {requestsError && <ErrorAlert error={requestsError} />}
          </div>
        )}

        {(propertiesLoading || rentRecordsLoading || expensesLoading) && (
          <div className="mb-6 text-center py-8">
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
        )}

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
                title="Monthly Revenue"
                value={monthlyRevenue}
                description="Paid rent due this month"
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
                <CardTitle>Monthly Collection</CardTitle>
                <CardDescription>Last 6 months</CardDescription>
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
                description={`${metrics.marginPercentage.toFixed(1)}% margin`}
                onClick={() => setProfitModalOpen(true)}
                variant={netIncome >= 0 ? 'success' : 'danger'}
                data-testid="dashboard-net-income"
              />
            </div>
            <div className="relative">
              <ModalIndicator onClick={() => setExpenseModalOpen(true)} />
              <MetricCard
                title="Total Expenses"
                value={formatCurrency(monthlyExpenses)}
                description="This month"
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
          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            transition={{
              duration: durationToSeconds(motionTokens.duration.base),
              delay: 0.24, // Reduced from 0.5
              ease: motionTokens.ease.standard,
            }}
            layout={false}
            className="mb-8"
          >
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-foreground">Property Profitability</h2>
              <p className="text-sm text-muted-foreground">Net profit and margins by property</p>
            </div>

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
