import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdminAuditLogs } from '@/hooks/admin/use-admin-audit-logs'
import { useAdminSecurityAlerts } from '@/hooks/admin/use-admin-security-alerts'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Shield,
  AlertTriangle,
  FileText,
  Search,
  Ban,
  Lock,
  Unlock,
  Key,
  LogOut,
  ShieldOff,
} from 'lucide-react'
import { usePerformanceTracker } from '@/hooks/use-performance-tracker'

// Date formatting helper
function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, '0')
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${displayHours}:${displayMinutes} ${ampm}`
}

function getActionIcon(actionType: string) {
  switch (actionType) {
    case 'ban':
      return <Ban className="h-4 w-4" />
    case 'unban':
      return <Unlock className="h-4 w-4" />
    case 'lock':
      return <Lock className="h-4 w-4" />
    case 'unlock':
      return <Unlock className="h-4 w-4" />
    case 'suspend':
      return <Shield className="h-4 w-4" />
    case 'unsuspend':
      return <ShieldOff className="h-4 w-4" />
    case 'reset_password':
      return <Key className="h-4 w-4" />
    case 'force_logout':
      return <LogOut className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

export function AdminAuditSecurity() {
  // Track performance metrics
  usePerformanceTracker({ componentName: 'AdminAuditSecurity' })

  const [activeTab, setActiveTab] = useState<string>('audit')
  const [searchEmail, setSearchEmail] = useState('')
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<'low' | 'medium' | 'high' | 'all'>('all')
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h')
  const [currentPage, setCurrentPage] = useState(1)

  // Calculate time range for audit logs
  const getTimeRangeISO = (range: string) => {
    const now = Date.now()
    let hours = 24
    if (range === '7d') hours = 7 * 24
    if (range === '30d') hours = 30 * 24
    return new Date(now - hours * 60 * 60 * 1000).toISOString()
  }

  const {
    logs,
    loading: auditLoading,
    error: auditError,
    pagination,
  } = useAdminAuditLogs(
    {
      actionType: actionTypeFilter !== 'all' ? actionTypeFilter : undefined,
      searchEmail: searchEmail || undefined,
      startDate: getTimeRangeISO(timeRange),
    },
    { page: currentPage, pageSize: 50 }
  )

  const {
    alerts,
    loading: alertsLoading,
    error: alertsError,
  } = useAdminSecurityAlerts({
    severity: severityFilter !== 'all' ? severityFilter : undefined,
    timeRange,
  })

  const filteredAuditLogs = useMemo(() => {
    if (!searchEmail.trim()) return logs
    const query = searchEmail.toLowerCase()
    return logs.filter(
      log =>
        log.admin_email?.toLowerCase().includes(query) ||
        log.target_user_email?.toLowerCase().includes(query)
    )
  }, [logs, searchEmail])

  const filteredSecurityAlerts = useMemo(() => {
    return alerts.filter(alert => {
      if (severityFilter !== 'all' && alert.severity !== severityFilter) {
        return false
      }
      return true
    })
  }, [alerts, severityFilter])

  if (auditLoading || alertsLoading) {
    return (
      <div className="min-h-screen bg-background relative">
        <GrainOverlay />
        <MatteLayer />
        <div className="relative z-10 p-6">
          <div className="max-w-7xl mx-auto">Loading audit logs...</div>
        </div>
      </div>
    )
  }

  if (auditError || alertsError) {
    return (
      <div className="min-h-screen bg-background relative">
        <GrainOverlay />
        <MatteLayer />
        <div className="relative z-10 p-6">
          <div className="max-w-7xl mx-auto text-destructive">
            Error loading data: {auditError?.message || alertsError?.message}
          </div>
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
            <h1 className="text-3xl font-bold text-foreground">Audit & Security</h1>
            <p className="text-muted-foreground mt-2">
              Audit logs, security alerts, and system behavior monitoring
            </p>
          </div>

          {/* Time Range Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Time Range:</label>
                <select
                  value={timeRange}
                  onChange={e => setTimeRange(e.target.value as '24h' | '7d' | '30d')}
                  className="px-3 py-2 rounded-md border border-border bg-background text-foreground"
                >
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="audit">Audit Logs</TabsTrigger>
              <TabsTrigger value="security">Security Alerts</TabsTrigger>
              <TabsTrigger value="behavior">System Behavior</TabsTrigger>
            </TabsList>

            {/* Audit Logs Tab */}
            <TabsContent value="audit" className="space-y-6 mt-6">
              {/* Filters */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by admin or user email..."
                        value={searchEmail}
                        onChange={e => setSearchEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <select
                      value={actionTypeFilter}
                      onChange={e => setActionTypeFilter(e.target.value)}
                      className="px-3 py-2 rounded-md border border-border bg-background text-foreground"
                    >
                      <option value="all">All Actions</option>
                      <option value="ban">Ban</option>
                      <option value="unban">Unban</option>
                      <option value="lock">Lock</option>
                      <option value="unlock">Unlock</option>
                      <option value="suspend">Suspend</option>
                      <option value="unsuspend">Unsuspend</option>
                      <option value="reset_password">Reset Password</option>
                      <option value="force_logout">Force Logout</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Audit Logs Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Admin Audit Logs</CardTitle>
                  <CardDescription>
                    Complete history of all admin actions ({pagination?.total || 0} total)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredAuditLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No audit logs found in this time range
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {filteredAuditLogs.map(log => (
                          <div
                            key={log.id}
                            className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <div className="mt-1 text-muted-foreground">
                              {getActionIcon(log.action_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="capitalize">
                                  {log.action_type.replace(/_/g, ' ')}
                                </Badge>
                                <span className="text-sm font-medium">
                                  {log.admin_email || 'Unknown Admin'}
                                </span>
                                <span className="text-sm text-muted-foreground">→</span>
                                <span className="text-sm">
                                  {log.target_user_email || 'Unknown User'}
                                </span>
                                {log.target_user_role && (
                                  <Badge variant="outline" className="text-xs">
                                    {log.target_user_role}
                                  </Badge>
                                )}
                              </div>
                              {log.reason && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  Reason: {log.reason}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDateTime(log.created_at)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <div className="text-sm text-muted-foreground">
                            Page {pagination.page} of {pagination.totalPages} ({pagination.total}{' '}
                            total)
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={!pagination.hasPreviousPage}
                            >
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(p => p + 1)}
                              disabled={!pagination.hasNextPage}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Alerts Tab */}
            <TabsContent value="security" className="space-y-6 mt-6">
              {/* Severity Filter */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium">Severity:</label>
                    <select
                      value={severityFilter}
                      onChange={e =>
                        setSeverityFilter(e.target.value as 'low' | 'medium' | 'high' | 'all')
                      }
                      className="px-3 py-2 rounded-md border border-border bg-background text-foreground"
                    >
                      <option value="all">All Severities</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Security Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle>Security Alerts</CardTitle>
                  <CardDescription>
                    Failed logins, suspicious activity, and rate limit violations (
                    {filteredSecurityAlerts.length} total)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredSecurityAlerts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No security alerts in this time range
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredSecurityAlerts.map(alert => (
                        <div
                          key={alert.id}
                          className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="mt-1">
                            {alert.severity === 'high' ? (
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                            ) : alert.severity === 'medium' ? (
                              <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            ) : (
                              <Shield className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant={
                                  alert.severity === 'high'
                                    ? 'destructive'
                                    : alert.severity === 'medium'
                                      ? 'secondary'
                                      : 'outline'
                                }
                              >
                                {alert.severity}
                              </Badge>
                              <span className="font-medium capitalize">
                                {alert.event_type.replace(/_/g, ' ')}
                              </span>
                              {alert.user_role && (
                                <Badge variant="outline" className="text-xs">
                                  {alert.user_role}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {JSON.stringify(alert.details, null, 2)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatDateTime(alert.created_at)}
                              {alert.ip_address && ` • IP: ${alert.ip_address}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Behavior Tab */}
            <TabsContent value="behavior" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Behavior Analysis</CardTitle>
                  <CardDescription>
                    Unusual patterns, abuse detection, and system anomalies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Abuse Detection */}
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Abuse Detection</h3>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {filteredSecurityAlerts.filter(
                          a =>
                            a.event_type === 'rate_limit_exceeded' ||
                            a.event_type === 'suspicious_activity'
                        ).length > 0 ? (
                          <div className="space-y-2">
                            {filteredSecurityAlerts
                              .filter(
                                a =>
                                  a.event_type === 'rate_limit_exceeded' ||
                                  a.event_type === 'suspicious_activity'
                              )
                              .slice(0, 5)
                              .map(alert => (
                                <div key={alert.id} className="p-2 bg-muted/50 rounded">
                                  <div className="font-medium text-foreground">
                                    {alert.event_type === 'rate_limit_exceeded'
                                      ? 'Rate Limit Exceeded'
                                      : 'Suspicious Activity'}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {formatDateTime(alert.created_at)}
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p>No abuse patterns detected in this time range</p>
                        )}
                      </div>
                    </div>

                    {/* Failed Login Patterns */}
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Failed Login Patterns</h3>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {filteredSecurityAlerts.filter(a => a.event_type === 'failed_login')
                          .length > 0 ? (
                          <div>
                            <p className="mb-2">
                              {
                                filteredSecurityAlerts.filter(a => a.event_type === 'failed_login')
                                  .length
                              }{' '}
                              failed login attempts in this time range
                            </p>
                            <div className="space-y-1">
                              {filteredSecurityAlerts
                                .filter(a => a.event_type === 'failed_login')
                                .slice(0, 5)
                                .map(alert => (
                                  <div key={alert.id} className="p-2 bg-muted/50 rounded text-xs">
                                    {formatDateTime(alert.created_at)}
                                    {alert.ip_address && ` • IP: ${alert.ip_address}`}
                                  </div>
                                ))}
                            </div>
                          </div>
                        ) : (
                          <p>No failed login attempts in this time range</p>
                        )}
                      </div>
                    </div>

                    {/* Invalid API Call Patterns */}
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Invalid API Calls</h3>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {filteredSecurityAlerts.filter(a => a.event_type === 'invalid_api_call')
                          .length > 0 ? (
                          <div>
                            <p className="mb-2">
                              {
                                filteredSecurityAlerts.filter(
                                  a => a.event_type === 'invalid_api_call'
                                ).length
                              }{' '}
                              invalid API calls in this time range
                            </p>
                            <div className="space-y-1">
                              {filteredSecurityAlerts
                                .filter(a => a.event_type === 'invalid_api_call')
                                .slice(0, 5)
                                .map(alert => (
                                  <div key={alert.id} className="p-2 bg-muted/50 rounded text-xs">
                                    {formatDateTime(alert.created_at)}
                                    {alert.ip_address && ` • IP: ${alert.ip_address}`}
                                  </div>
                                ))}
                            </div>
                          </div>
                        ) : (
                          <p>No invalid API calls in this time range</p>
                        )}
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
