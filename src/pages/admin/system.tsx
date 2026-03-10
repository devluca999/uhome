import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase/client'
import { sendUnifiedNotification } from '@/lib/notifications/notification-service'
import { DEMO_LANDLORD_CREDENTIALS, DEMO_TENANT_CREDENTIALS } from '@/lib/tenant-dev-mode'

export function AdminSystem() {
  // Note: This is a minimal system health view
  // In a real system, you would fetch this data from logs/system tables
  // For now, we show a basic informational view

  const { user } = useAuth()
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'ok' | 'error'>('idle')
  const [testError, setTestError] = useState<string | null>(null)

  const systemWarnings: Array<{ id: string; type: 'info' | 'warning' | 'error'; message: string }> =
    []
  const authErrors: Array<{ id: string; message: string; timestamp: string }> = []
  const jobFailures: Array<{ id: string; message: string; timestamp: string }> = []

  async function handleSendTestNotifications() {
    if (!import.meta.env.DEV) return
    if (!user) {
      setTestStatus('error')
      setTestError('No authenticated admin user')
      return
    }

    setTestStatus('running')
    setTestError(null)

    try {
      // Pick a sample lease (for deep-linking from notifications)
      const { data: leaseRow } = await supabase
        .from('leases')
        .select('id')
        .limit(1)
        .maybeSingle()

      const leaseId = leaseRow?.id ?? '00000000-0000-0000-0000-000000000000'

      // Try to find demo landlord/tenant users first (matches quick login buttons)
      const [{ data: demoLandlord }, { data: demoTenant }] = await Promise.all([
        supabase
          .from('users')
          .select('id')
          .eq('email', DEMO_LANDLORD_CREDENTIALS.email)
          .maybeSingle(),
        supabase
          .from('users')
          .select('id')
          .eq('email', DEMO_TENANT_CREDENTIALS.email)
          .maybeSingle(),
      ])

      let landlordId = demoLandlord?.id
      let tenantId = demoTenant?.id

      // Fallback to any landlord/tenant if demo accounts are missing
      if (!landlordId || !tenantId) {
        const [{ data: landlords }, { data: tenants }] = await Promise.all([
          supabase.from('users').select('id').eq('role', 'landlord').limit(1),
          supabase.from('users').select('id').eq('role', 'tenant').limit(1),
        ])
        landlordId = landlordId || landlords?.[0]?.id
        tenantId = tenantId || tenants?.[0]?.id
      }

      const targetUserIds = Array.from(
        new Set([user.id, landlordId, tenantId].filter((id): id is string => Boolean(id)))
      )

      if (targetUserIds.length === 0) {
        setTestStatus('error')
        setTestError('No target users found for test notifications')
        return
      }

      await Promise.all(
        targetUserIds.map(targetId =>
          sendUnifiedNotification({
            userId: targetId,
            leaseId,
            type: 'system',
            title: 'Test notification',
            body: 'This is a dev-only test of the unified notification system.',
            channels: { inApp: true, email: false, push: false },
            intent: 'general',
          })
        )
      )

      setTestStatus('ok')
    } catch (error) {
      console.error('[AdminSystem] Error sending test notifications:', error)
      setTestStatus('error')
      setTestError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  return (
    <div className="min-h-screen bg-background relative">
      <GrainOverlay />
      <MatteLayer />
      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">System Health</h1>
            <p className="text-muted-foreground mt-2">
              Basic operational signals and system status
            </p>
          </div>

          {/* System Warnings */}
          <Card>
            <CardHeader>
              <CardTitle>System Warnings</CardTitle>
              <CardDescription>Active system warnings and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              {systemWarnings.length === 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span>No active warnings</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {systemWarnings.map(warning => (
                    <div
                      key={warning.id}
                      className={`flex items-start gap-2 p-3 rounded-lg border ${
                        warning.type === 'error'
                          ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                          : warning.type === 'warning'
                            ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
                            : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      {warning.type === 'error' ? (
                        <AlertCircle className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400" />
                      ) : warning.type === 'warning' ? (
                        <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-600 dark:text-yellow-400" />
                      ) : (
                        <Info className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400" />
                      )}
                      <div className="flex-1">
                        <Badge variant="outline" className="mb-1 capitalize">
                          {warning.type}
                        </Badge>
                        <p className="text-sm">{warning.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Auth Errors */}
          <Card>
            <CardHeader>
              <CardTitle>Authentication Errors</CardTitle>
              <CardDescription>Recent authentication failures and errors</CardDescription>
            </CardHeader>
            <CardContent>
              {authErrors.length === 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span>No recent auth errors</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {authErrors.map(error => (
                    <div
                      key={error.id}
                      className="p-3 rounded-lg border bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{error.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{error.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Background Job Failures */}
          <Card>
            <CardHeader>
              <CardTitle>Background Job Failures</CardTitle>
              <CardDescription>Failed background jobs and retries (if applicable)</CardDescription>
            </CardHeader>
            <CardContent>
              {jobFailures.length === 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span>No recent job failures</span>
                  <Badge variant="outline" className="ml-2">
                    Note: Background jobs may not be implemented yet
                  </Badge>
                </div>
              ) : (
                <div className="space-y-2">
                  {jobFailures.map(failure => (
                    <div
                      key={failure.id}
                      className="p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-600 dark:text-yellow-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{failure.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{failure.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dev-only: Unified notification test */}
          {import.meta.env.DEV && (
            <Card>
              <CardHeader>
                <CardTitle>Notification System (Dev Only)</CardTitle>
                <CardDescription>
                  Send a test in-app notification to admin, one landlord, and one tenant.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  This uses <code>sendUnifiedNotification</code> and writes to the real{' '}
                  <code>notifications</code> table so the dropdown and badges behave exactly like
                  production.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestNotifications}
                  disabled={testStatus === 'running'}
                >
                  {testStatus === 'running' ? 'Sending…' : 'Send Test Notifications'}
                </Button>
                {testStatus === 'ok' && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Test notifications sent. Open the notification bell as admin, landlord, and
                    tenant to verify.
                  </p>
                )}
                {testStatus === 'error' && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Failed to send test notifications
                    {testError ? `: ${testError}` : '.'}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* System Status Summary */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Overall system health summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">System Status</span>
                  <Badge
                    variant="outline"
                    className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Operational
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Warnings</span>
                  <span className="text-sm font-medium">{systemWarnings.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Auth Errors (24h)</span>
                  <span className="text-sm font-medium">{authErrors.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Job Failures (24h)</span>
                  <span className="text-sm font-medium">{jobFailures.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
