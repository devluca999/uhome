import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Badge } from '@/components/ui/badge'
// Simple select component - using native select for now
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts'
import { useTheme } from '@/contexts/theme-context'
import { useAdminPerformance, type TimeRange } from '@/hooks/admin/use-admin-performance'
import { usePerformanceTracker } from '@/hooks/use-performance-tracker'
import { Clock, Activity, Upload, Shield, XCircle, Gauge, AlertTriangle } from 'lucide-react'

export function AdminPerformance() {
  // Track performance metrics (meta tracking)
  usePerformanceTracker({ componentName: 'AdminPerformance' })

  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [activeTab, setActiveTab] = useState<string>('performance')
  const { metrics, pageLoadMetrics, apiMetrics, uploadLogs, securityLogs, loading, error } =
    useAdminPerformance(timeRange)
  const { theme } = useTheme()

  const textColor = theme === 'dark' ? '#F5F6F8' : '#111318'
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'

  // Prepare chart data
  const pageLoadChartData = useMemo(() => {
    return pageLoadMetrics
      .slice(0, 10)
      .sort((a, b) => b.avg_duration - a.avg_duration)
      .map(m => ({
        path: m.page_path || 'unknown',
        duration: m.avg_duration,
        count: m.count,
      }))
  }, [pageLoadMetrics])

  const apiChartData = useMemo(() => {
    return apiMetrics
      .slice(0, 10)
      .sort((a, b) => b.avg_duration - a.avg_duration)
      .map(m => ({
        name: m.metric_name.replace(/^api_/, ''),
        duration: m.avg_duration,
        count: m.count,
      }))
  }, [apiMetrics])

  const uploadSuccessData = useMemo(() => {
    const success = uploadLogs.filter(u => u.status === 'success').length
    const failed = uploadLogs.filter(u => u.status === 'failed').length
    return [
      { name: 'Success', value: success, color: '#84A98C' },
      { name: 'Failed', value: failed, color: '#ef4444' },
    ]
  }, [uploadLogs])

  const uploadByTypeData = useMemo(() => {
    const byType = new Map<string, number>()
    uploadLogs.forEach(u => {
      const type = u.file_type || 'unknown'
      byType.set(type, (byType.get(type) || 0) + 1)
    })
    return Array.from(byType.entries()).map(([name, value]) => ({
      name: name.split('/')[1] || name,
      value,
    }))
  }, [uploadLogs])

  const securityEventsData = useMemo(() => {
    const byType = new Map<string, number>()
    securityLogs.forEach(s => {
      byType.set(s.event_type, (byType.get(s.event_type) || 0) + 1)
    })
    return Array.from(byType.entries()).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value,
    }))
  }, [securityLogs])

  const failedUploads = useMemo(() => {
    return uploadLogs.filter(u => u.status === 'failed').slice(0, 10)
  }, [uploadLogs])

  const highSeveritySecurity = useMemo(() => {
    return securityLogs.filter(s => s.severity === 'high' || s.severity === 'medium').slice(0, 10)
  }, [securityLogs])

  if (loading) {
    return (
      <div className="min-h-screen bg-background [isolation:isolate] relative">
        <GrainOverlay />
        <MatteLayer />
        <div className="relative z-10 p-6">
          <div className="max-w-7xl mx-auto">Loading performance metrics...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background [isolation:isolate] relative">
        <GrainOverlay />
        <MatteLayer />
        <div className="relative z-10 p-6">
          <div className="max-w-7xl mx-auto text-destructive">
            Error loading metrics: {error.message}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background [isolation:isolate] relative">
      <GrainOverlay />
      <MatteLayer />
      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Performance & Monitoring</h1>
              <p className="text-muted-foreground mt-2">System monitoring and metrics</p>
            </div>
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value as TimeRange)}
              className="w-[180px] px-3 py-2 rounded-md border border-border bg-background text-foreground"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-muted/60 rounded-lg p-1">
              <TabsTrigger
                value="performance"
                className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground font-medium transition-all cursor-pointer"
              >
                Performance Metrics
              </TabsTrigger>
              <TabsTrigger
                value="quotas"
                className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground font-medium transition-all cursor-pointer"
              >
                Quotas & Limits
              </TabsTrigger>
              <TabsTrigger
                value="errors"
                className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground font-medium transition-all cursor-pointer"
              >
                Error Logs
              </TabsTrigger>
            </TabsList>

            {/* Performance Metrics Tab */}
            <TabsContent value="performance" className="space-y-6 mt-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Page Load</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics?.avgPageLoadTime || 0}ms</div>
                    <p className="text-xs text-muted-foreground mt-1">Average load time</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">API Calls</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics?.totalAPICalls || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total requests</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Upload Success Rate</CardTitle>
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics?.uploadSuccessRate || 0}%</div>
                    <p className="text-xs text-muted-foreground mt-1">Successful uploads</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Security Incidents</CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics?.securityIncidents || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">High/Medium severity</p>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Page Load Times</CardTitle>
                    <CardDescription>Top 10 slowest pages</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsBarChart data={pageLoadChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis
                          dataKey="path"
                          tick={{ fill: textColor, fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          tick={{ fill: textColor, fontSize: 12 }}
                          tickFormatter={value => `${value}ms`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
                            border: `1px solid ${gridColor}`,
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="duration" fill="#84A98C" radius={[4, 4, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>API Call Durations</CardTitle>
                    <CardDescription>Average response times by endpoint</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsBarChart data={apiChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: textColor, fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          tick={{ fill: textColor, fontSize: 12 }}
                          tickFormatter={value => `${value}ms`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
                            border: `1px solid ${gridColor}`,
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="duration" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Upload Monitoring */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Success Rate</CardTitle>
                    <CardDescription>Success vs failed uploads</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={uploadSuccessData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {uploadSuccessData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Files by Type</CardTitle>
                    <CardDescription>Upload distribution by file type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsBarChart data={uploadByTypeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 12 }} />
                        <YAxis tick={{ fill: textColor, fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
                            border: `1px solid ${gridColor}`,
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="value" fill="#84A98C" radius={[4, 4, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Failed Uploads Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Failed Uploads</CardTitle>
                  <CardDescription>Recent failed upload attempts</CardDescription>
                </CardHeader>
                <CardContent>
                  {failedUploads.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No failed uploads in this time range
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {failedUploads.map(upload => (
                        <div
                          key={upload.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{upload.file_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {upload.file_type} •{' '}
                              {(upload.file_size_bytes / 1024 / 1024).toFixed(2)}MB
                            </div>
                            {upload.error_message && (
                              <div className="text-sm text-destructive mt-1">
                                {upload.error_message}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-destructive" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(upload.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Security Dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Events by Type</CardTitle>
                    <CardDescription>Event distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsBarChart data={securityEventsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: textColor, fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fill: textColor, fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
                            border: `1px solid ${gridColor}`,
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Suspicious Activity Alerts</CardTitle>
                    <CardDescription>High/Medium severity incidents</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {highSeveritySecurity.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No security incidents in this time range
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {highSeveritySecurity.map(incident => (
                          <div
                            key={incident.id}
                            className="flex items-start justify-between p-3 border rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    incident.severity === 'high' ? 'destructive' : 'secondary'
                                  }
                                >
                                  {incident.severity}
                                </Badge>
                                <span className="font-medium">{incident.event_type}</span>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {JSON.stringify(incident.details, null, 2)}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(incident.created_at).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Quotas & Limits Tab */}
            <TabsContent value="quotas" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gauge className="h-5 w-5" />
                    Quota Configuration
                  </CardTitle>
                  <CardDescription>Usage quotas and rate limits per account type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Tenant Quotas</h3>
                        <Badge>Active</Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-muted-foreground">API Calls</p>
                          <p className="text-2xl font-bold">1000/day</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">File Uploads</p>
                          <p className="text-2xl font-bold">50/day</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Max File Size</p>
                          <p className="text-2xl font-bold">10MB</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Landlord Quotas</h3>
                        <Badge>Active</Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-muted-foreground">API Calls</p>
                          <p className="text-2xl font-bold">5000/day</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">File Uploads</p>
                          <p className="text-2xl font-bold">200/day</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Max File Size</p>
                          <p className="text-2xl font-bold">50MB</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">Admin Quotas</h3>
                        <Badge>Active</Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-muted-foreground">API Calls</p>
                          <p className="text-2xl font-bold">Unlimited</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">File Uploads</p>
                          <p className="text-2xl font-bold">Unlimited</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Max File Size</p>
                          <p className="text-2xl font-bold">100MB</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Quota configuration is managed via the admin_quota_config table. Rate limits
                      are enforced at the Edge Function level.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rate Limit Violations</CardTitle>
                  <CardDescription>
                    Users exceeding rate limits in the selected time range
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    Rate limit violations will appear here when users exceed their quotas.
                    {metrics?.securityIncidents === 0 && ' No violations in this time range.'}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Error Logs Tab */}
            <TabsContent value="errors" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Error Logs
                  </CardTitle>
                  <CardDescription>System errors, exceptions, and failed requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {securityLogs.filter(
                      s => s.severity === 'high' || s.event_type === 'invalid_api_call'
                    ).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No error logs in this time range
                      </div>
                    ) : (
                      securityLogs
                        .filter(s => s.severity === 'high' || s.event_type === 'invalid_api_call')
                        .slice(0, 20)
                        .map(log => (
                          <div
                            key={log.id}
                            className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant={log.severity === 'high' ? 'destructive' : 'secondary'}
                                >
                                  {log.severity}
                                </Badge>
                                <span className="font-medium">{log.event_type}</span>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {JSON.stringify(log.details, null, 2)}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground ml-4">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Failed API Requests</CardTitle>
                  <CardDescription>API calls that failed or returned errors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {failedUploads.length === 0 &&
                    securityLogs.filter(s => s.event_type === 'invalid_api_call').length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No failed requests in this time range
                      </div>
                    ) : (
                      <>
                        {securityLogs
                          .filter(s => s.event_type === 'invalid_api_call')
                          .slice(0, 10)
                          .map(log => (
                            <div
                              key={log.id}
                              className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <XCircle className="h-4 w-4 text-destructive" />
                                  <span className="font-medium">Invalid API Call</span>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {JSON.stringify(log.details, null, 2)}
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground ml-4">
                                {new Date(log.created_at).toLocaleString()}
                              </span>
                            </div>
                          ))}
                      </>
                    )}
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
