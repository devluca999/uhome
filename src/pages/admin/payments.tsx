import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdminPayments } from '@/hooks/admin/use-admin-payments'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, TrendingDown, CreditCard, AlertCircle, Users } from 'lucide-react'
import { usePerformanceTracker } from '@/hooks/use-performance-tracker'
import {
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  LineChart as RechartsLineChart,
  Line,
} from 'recharts'
import { useTheme } from '@/contexts/theme-context'

export function AdminPayments() {
  // Track performance metrics
  usePerformanceTracker({ componentName: 'AdminPayments' })

  const [activeTab, setActiveTab] = useState<string>('revenue')
  const { metrics, loading, error } = useAdminPayments()
  const { theme } = useTheme()

  const textColor = theme === 'dark' ? '#F5F6F8' : '#111318'
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative">
        <GrainOverlay />
        <MatteLayer />
        <div className="relative z-10 p-6">
          <div className="max-w-7xl mx-auto">Loading payment data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background relative">
        <GrainOverlay />
        <MatteLayer />
        <div className="relative z-10 p-6">
          <div className="max-w-7xl mx-auto text-destructive">
            Error loading payment data: {error.message}
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-background relative">
        <GrainOverlay />
        <MatteLayer />
        <div className="relative z-10 p-6">
          <div className="max-w-7xl mx-auto">No payment data available</div>
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
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payments & Revenue</h1>
            <p className="text-muted-foreground mt-2">
              Platform revenue and subscription analytics
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="revenue">Revenue Overview</TabsTrigger>
              <TabsTrigger value="failed">Failed Transactions</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscription Analytics</TabsTrigger>
            </TabsList>

            {/* Revenue Overview Tab */}
            <TabsContent value="revenue" className="space-y-6 mt-6">
              {/* Revenue Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${metrics.revenue.totalRevenue.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Annual SaaS fees</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${metrics.revenue.monthlyRevenue.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Current month</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Failed Transactions</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">
                      {metrics.revenue.failedTransactions}
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
                    <div className="text-2xl font-bold">{metrics.revenue.refunds}</div>
                    <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>Monthly revenue over time (projected)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart
                      data={metrics.subscriptionTrends.map(t => ({
                        date: new Date(t.date).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        }),
                        revenue: t.active * 15, // $15/month per active subscription
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="date" tick={{ fill: textColor, fontSize: 12 }} />
                      <YAxis
                        tick={{ fill: textColor, fontSize: 12 }}
                        tickFormatter={value => `$${value}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
                          border: `1px solid ${gridColor}`,
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#84A98C"
                        strokeWidth={2}
                        dot={{ fill: '#84A98C', r: 4 }}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Note</CardTitle>
                  <CardDescription>
                    SaaS revenue is estimated from active Pro subscriptions. Failed rent payments
                    come from <code className="text-xs">rent_records</code> with{' '}
                    <code className="text-xs">payment_status = failed</code> (last 30 days). Stripe
                    charges are not shown here until webhooks are integrated.
                  </CardDescription>
                </CardHeader>
              </Card>
            </TabsContent>

            {/* Failed Transactions Tab */}
            <TabsContent value="failed" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Failed Transactions</CardTitle>
                  <CardDescription>Failed payments, refunds, and disputes</CardDescription>
                </CardHeader>
                <CardContent>
                  {metrics.recentTransactions.filter(t => t.status === 'failed').length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No failed transactions in recent history
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {metrics.recentTransactions
                        .filter(t => t.status === 'failed')
                        .map(transaction => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                                <span className="font-medium">{transaction.description}</span>
                                <Badge variant="destructive">Failed</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                ${(transaction.amount / 100).toFixed(2)}{' '}
                                {transaction.currency.toUpperCase()}
                                {transaction.failure_reason && ` • ${transaction.failure_reason}`}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground ml-4">
                              {new Date(transaction.created_at).toLocaleString()}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Refunds</CardTitle>
                  <CardDescription>Processed refunds</CardDescription>
                </CardHeader>
                <CardContent>
                  {metrics.recentTransactions.filter(t => t.type === 'refund').length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No refunds in recent history
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {metrics.recentTransactions
                        .filter(t => t.type === 'refund')
                        .map(transaction => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{transaction.description}</span>
                                <Badge variant="secondary">Refund</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                ${(transaction.amount / 100).toFixed(2)}{' '}
                                {transaction.currency.toUpperCase()}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground ml-4">
                              {new Date(transaction.created_at).toLocaleString()}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subscription Analytics Tab */}
            <TabsContent value="subscriptions" className="space-y-6 mt-6">
              {/* Subscription Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.subscriptions.totalActive}</div>
                    <p className="text-xs text-muted-foreground mt-1">Currently active</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Trialing</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.subscriptions.totalTrialing}</div>
                    <p className="text-xs text-muted-foreground mt-1">On trial</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Canceled</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.subscriptions.totalCanceled}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total canceled</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pro Plan</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.subscriptions.byPlan.pro}</div>
                    <p className="text-xs text-muted-foreground mt-1">Active pro subscriptions</p>
                  </CardContent>
                </Card>
              </div>

              {/* Subscription Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Trends</CardTitle>
                  <CardDescription>
                    Active, trialing, and canceled subscriptions over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart
                      data={metrics.subscriptionTrends.map(t => ({
                        date: new Date(t.date).toLocaleDateString('en-US', { month: 'short' }),
                        active: t.active,
                        trialing: t.trialing,
                        canceled: t.canceled,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="date" tick={{ fill: textColor, fontSize: 12 }} />
                      <YAxis tick={{ fill: textColor, fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
                          border: `1px solid ${gridColor}`,
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="active"
                        stroke="#84A98C"
                        strokeWidth={2}
                        name="Active"
                        dot={{ fill: '#84A98C', r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="trialing"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Trialing"
                        dot={{ fill: '#3b82f6', r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="canceled"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="Canceled"
                        dot={{ fill: '#ef4444', r: 4 }}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Plan Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Plan Distribution</CardTitle>
                  <CardDescription>Active subscriptions by plan</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Free Plan</span>
                        <Badge variant="secondary">{metrics.subscriptions.byPlan.free}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {metrics.subscriptions.totalActive > 0
                          ? Math.round(
                              (metrics.subscriptions.byPlan.free /
                                metrics.subscriptions.totalActive) *
                                100
                            )
                          : 0}
                        % of active subscriptions
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Pro Plan</span>
                        <Badge variant="default">{metrics.subscriptions.byPlan.pro}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {metrics.subscriptions.totalActive > 0
                          ? Math.round(
                              (metrics.subscriptions.byPlan.pro /
                                metrics.subscriptions.totalActive) *
                                100
                            )
                          : 0}
                        % of active subscriptions
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
