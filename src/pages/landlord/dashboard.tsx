import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { NumberCounter } from '@/components/ui/number-counter'
import { RevenueBreakdownModal } from '@/components/landlord/revenue-breakdown-modal'
import { RecentActivityModal } from '@/components/landlord/recent-activity-modal'
import { ProfitBreakdownModal } from '@/components/landlord/profit-breakdown-modal'
import { ExpenseDistributionModal } from '@/components/landlord/expense-distribution-modal'
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
  MessageSquare,
  DollarSign,
  Receipt,
  CheckSquare,
  Users,
  FileText,
  Calendar,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { motionTokens, durationToSeconds, createSpring } from '@/lib/motion'

export function LandlordDashboard() {
  const navigate = useNavigate()
  const { properties, loading: propertiesLoading, error: propertiesError } = useProperties()
  const { tenants, loading: tenantsLoading, error: tenantsError } = useTenants()
  const { requests, loading: requestsLoading, error: requestsError } = useMaintenanceRequests()
  const { records: rentRecords } = useLandlordRentRecords()
  const { expenses } = useExpenses()
  const { tasks } = useTasks()
  const { documents } = useDocuments() // Get all documents for activity feed
  const metrics = useFinancialMetrics(rentRecords, expenses, 6)
  const cardSpring = createSpring('card')
  const [revenueModalOpen, setRevenueModalOpen] = useState(false)
  const [revenueViewMode, setRevenueViewMode] = useState<'cash' | 'accrual'>('cash')
  const [activityModalOpen, setActivityModalOpen] = useState(false)
  const [profitModalOpen, setProfitModalOpen] = useState(false)
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)

  // Count pending tenant tasks
  const pendingTenantTasks = tasks.filter(
    t => t.status === 'pending' && t.assigned_to_type === 'tenant'
  ).length

  const hasErrors = propertiesError || tenantsError || requestsError

  // Calculate occupancy percentage (simplified - assumes all properties have tenants)
  const occupancyRate =
    properties.length > 0 ? Math.round((tenants.length / properties.length) * 100) : 0

  // Use financial metrics for consistency across app
  // Total monthly revenue should match what's shown in finances page
  const totalMonthlyPayments = metrics.rentCollected + metrics.upcomingRent

  // Generate comprehensive activity feed
  const recentActivity = useMemo(() => {
    const activities: Array<{
      id: string
      title: string
      description?: string
      timestamp: string
      icon: React.ReactNode
      onClick: () => void
    }> = []

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
        return updateDate >= weekAgo && r.status !== 'pending'
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

  // Recent expenses (last 5) - read-only for dashboard
  const recentExpenses = expenses.slice(0, 5)

  // Donut chart data
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <PortfolioCard
            title="Properties"
            value={propertiesLoading ? 0 : properties.length}
            description="Total properties"
            index={0}
          />
          <PortfolioCard
            title="Occupancy"
            value={tenantsLoading ? 0 : occupancyRate}
            description="Occupancy rate"
            format={v => `${Math.round(v)}%`}
            index={1}
          />
          <div onClick={() => setRevenueModalOpen(true)} className="cursor-pointer">
            <PortfolioCard
              title="Monthly Revenue"
              value={totalMonthlyPayments}
              description="Total collected + upcoming"
              format={v => `$${Math.round(v).toLocaleString()}`}
              index={2}
            />
          </div>
          <PortfolioCard
            title="Pending Tasks"
            value={pendingTenantTasks}
            description="Tenant tasks pending"
            index={3}
          />
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
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No monthly data available
                  </div>
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
            <MetricCard
              title="Net Profit"
              value={`$${Math.round(metrics.netProfit).toLocaleString()}`}
              description={`${metrics.marginPercentage.toFixed(1)}% margin`}
              onClick={() => setProfitModalOpen(true)}
              variant={metrics.netProfit >= 0 ? 'success' : 'danger'}
            />
            <MetricCard
              title="Total Expenses"
              value={`$${Math.round(metrics.totalExpenses).toLocaleString()}`}
              description="This month"
              icon={<Receipt className="w-4 h-4" />}
              onClick={() => setExpenseModalOpen(true)}
            />
            <MetricCard
              title="Projected Net"
              value={`$${Math.round(metrics.projectedNet).toLocaleString()}`}
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
          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            transition={{
              duration: durationToSeconds(motionTokens.duration.base),
              delay: 0.3, // Reduced from 0.6
              ease: motionTokens.ease.standard,
            }}
            layout={false}
            className="mb-8"
          >
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-foreground">Insights</h2>
              <p className="text-sm text-muted-foreground">Key metrics and observations</p>
            </div>

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
        )}

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            transition={{
              duration: durationToSeconds(motionTokens.duration.base),
              delay: 0.36, // Reduced from 0.7
              ease: motionTokens.ease.standard,
            }}
            layout={false}
          >
            <Card
              className="glass-card relative overflow-hidden cursor-pointer"
              onClick={() => dashboardActivities.length > 0 && setActivityModalOpen(true)}
            >
              <GrainOverlay />
              <MatteLayer intensity="subtle" />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Activity</CardTitle>
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

          <motion.div
            initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
            animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
            transition={{
              duration: durationToSeconds(motionTokens.duration.base),
              delay: 0.42, // Reduced from 0.75
              ease: motionTokens.ease.standard,
            }}
            layout={false}
          >
            <Card className="glass-card relative overflow-hidden">
              <GrainOverlay />
              <MatteLayer intensity="subtle" />
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
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
        </div>
      </div>

      {/* Revenue Breakdown Modal */}
      <RevenueBreakdownModal
        isOpen={revenueModalOpen}
        onClose={() => setRevenueModalOpen(false)}
        viewMode={revenueViewMode}
        onViewModeChange={setRevenueViewMode}
      />

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
    </div>
  )
}
