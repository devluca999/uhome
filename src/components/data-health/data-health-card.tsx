/**
 * Data Health Card Component
 *
 * Displays data health status and provides actionable fixes.
 * Only shows in dev mode or when explicitly enabled.
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { checkDataHealth, type DataHealthStatus } from '@/lib/data-health/data-health-checker'
import { useAuth } from '@/contexts/auth-context'
import { AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataHealthCardProps {
  className?: string
  showInProduction?: boolean
}

export function DataHealthCard({ className, showInProduction = false }: DataHealthCardProps) {
  const { user, role } = useAuth()
  const [healthStatus, setHealthStatus] = useState<DataHealthStatus | null>(null)
  const [_loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  // Only show in dev mode unless explicitly enabled
  const shouldShow = import.meta.env.DEV || showInProduction

  // When using dev bypass, use dev_role so we run the correct health check (avoids showing tenant errors on landlord dashboard during account switch)
  const effectiveRole =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    sessionStorage.getItem('dev_bypass') === 'true'
      ? (sessionStorage.getItem('dev_role') as 'landlord' | 'tenant' | 'admin' | null) || role
      : role

  useEffect(() => {
    if (!shouldShow || !user || dismissed) {
      setLoading(false)
      return
    }

    async function fetchHealth() {
      if (!user) return
      try {
        setLoading(true)
        const status = await checkDataHealth(user.id, effectiveRole)
        setHealthStatus(status)
      } catch (error) {
        console.error('Error checking data health:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHealth()
  }, [user, role, effectiveRole, shouldShow, dismissed])

  // Only show if there are actual errors, not just warnings/info
  const hasErrors = healthStatus?.issues.some(i => i.severity === 'error') ?? false

  if (!shouldShow || dismissed || !healthStatus || (!hasErrors && healthStatus.isHealthy)) {
    return null
  }

  const errorIssues = healthStatus.issues.filter(i => i.severity === 'error')
  const warningIssues = healthStatus.issues.filter(i => i.severity === 'warning')

  return (
    <Card className={cn('border-yellow-500/50 bg-yellow-500/10', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <CardTitle className="text-sm">Data Health Check</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Some data may be missing. Check the issues below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {errorIssues.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="w-4 h-4" />
              Errors
            </div>
            {errorIssues.map((issue, index) => (
              <Alert
                key={index}
                variant="destructive"
                className="text-xs border-destructive/50 bg-destructive/10"
              >
                <AlertTitle className="text-xs font-medium">{issue.message}</AlertTitle>
                {issue.fix && (
                  <AlertDescription className="text-xs mt-1">{issue.fix}</AlertDescription>
                )}
              </Alert>
            ))}
          </div>
        )}

        {warningIssues.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-400">
              <Info className="w-4 h-4" />
              Warnings
            </div>
            {warningIssues.map((issue, index) => (
              <Alert key={index} className="border-yellow-500/50 bg-yellow-500/10 text-xs">
                <AlertTitle className="text-xs font-medium">{issue.message}</AlertTitle>
                {issue.fix && (
                  <AlertDescription className="text-xs mt-1">{issue.fix}</AlertDescription>
                )}
              </Alert>
            ))}
          </div>
        )}

        {healthStatus.recommendations.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-foreground">Recommendations:</div>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
              {healthStatus.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {healthStatus.stats && (
          <div className="pt-2 border-t border-border">
            <div className="text-xs font-medium text-foreground mb-1">Current Stats:</div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              {healthStatus.stats.propertiesCount !== undefined && (
                <div>Properties: {healthStatus.stats.propertiesCount}</div>
              )}
              {healthStatus.stats.rentRecordsCount !== undefined && (
                <div>Rent Records: {healthStatus.stats.rentRecordsCount}</div>
              )}
              {healthStatus.stats.adminMetricsCount !== undefined && (
                <div>Admin Metrics: {healthStatus.stats.adminMetricsCount}</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
