import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdminStats } from '@/hooks/admin/use-admin-stats'
import {
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
  UserCheck,
  UserX,
  DollarSign,
  Activity,
  Server,
} from 'lucide-react'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { usePerformanceTracker } from '@/hooks/use-performance-tracker'
import { DataHealthCard } from '@/components/data-health/data-health-card'

export function AdminOverview() {
  // Track performance metrics
  usePerformanceTracker({ componentName: 'AdminOverview' })
  const { stats, loading, error } = useAdminStats()
  const [activeTab, setActiveTab] = useState<string>('metrics')

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-muted-foreground">Loading metrics...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-destructive">Error loading metrics: {error.message}</div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-muted-foreground">No metrics available</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative">
      <GrainOverlay />
      <MatteLayer />
      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <DataHealthCard className="mb-4" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">System Overview</h1>
            <p className="text-muted-foreground mt-2">High-level system metrics and statistics</p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-muted/60 rounded-lg p-1">
              <TabsTrigger
                value="metrics"
                className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground font-medium transition-all cursor-pointer"
              >
                Metrics
              </TabsTrigger>
              <TabsTrigger
                value="transactions"
                className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground font-medium transition-all cursor-pointer"
              >
                Transactions
              </TabsTrigger>
              <TabsTrigger
                value="system-load"
                className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground font-medium transition-all cursor-pointer"
              >
                System Load
              </TabsTrigger>
            </TabsList>

            {/* Metrics Tab */}
            <TabsContent value="metrics" className="space-y-6 mt-6">
              {/* User Metrics */}
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Users</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalUsers}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Landlords</CardTitle>
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.usersByRole.landlord}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tenants</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.usersByRole.tenant}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Admins</CardTitle>
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.usersByRole.admin}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Subscription Metrics */}
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Subscriptions</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Free Plan</CardTitle>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.subscriptionsByPlan.free}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pro Plan</CardTitle>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.subscriptionsByPlan.pro}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Trialing</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.trialingUsers}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Paid (Active)</CardTitle>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.paidUsers}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Growth & Churn Metrics */}
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Growth & Churn</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">New Users (7 days)</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.newUsersLast7Days}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">New Users (30 days)</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.newUsersLast30Days}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Canceled (7 days)</CardTitle>
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.canceledLast7Days}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Canceled (30 days)</CardTitle>
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.canceledLast30Days}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="space-y-6 mt-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Platform Revenue & Transactions
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ${stats.transactionMetrics?.platformRevenue.toLocaleString() || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Total SaaS fees (annual)</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ${stats.transactionMetrics?.monthlyRevenue.toLocaleString() || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Current month</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Failed Transactions</CardTitle>
                      <UserX className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">
                        {stats.transactionMetrics?.failedTransactions || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Refunds</CardTitle>
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {stats.transactionMetrics?.refunds || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                    </CardContent>
                  </Card>
                </div>
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Note</CardTitle>
                    <CardDescription>
                      Platform revenue figures are estimated from active Pro subscriptions. Failed
                      payments reflect <code className="text-xs">rent_records</code> with{' '}
                      <code className="text-xs">payment_status = failed</code> in the last 30 days.
                      Refunds are not tracked in-app yet (shown as 0).
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </TabsContent>

            {/* System Load Tab */}
            <TabsContent value="system-load" className="space-y-6 mt-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  System Load & Performance
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {stats.systemLoad?.activeSessions || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Estimated active users</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">API Calls (24h)</CardTitle>
                      <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {stats.systemLoad?.apiCallsLast24h.toLocaleString() || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {stats.systemLoad?.averageResponseTime || 0}ms
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">API response time</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
