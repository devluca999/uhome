import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorAlert } from '@/components/error-alert'
import { useProperties } from '@/hooks/use-properties'
import { useTenants } from '@/hooks/use-tenants'
import { useMaintenanceRequests } from '@/hooks/use-maintenance-requests'

export function LandlordDashboard() {
  const { properties, loading: propertiesLoading, error: propertiesError } = useProperties()
  const { tenants, loading: tenantsLoading, error: tenantsError } = useTenants()
  const { requests, loading: requestsLoading, error: requestsError } = useMaintenanceRequests()

  const pendingRequests = requests.filter(r => r.status === 'pending').length

  const hasErrors = propertiesError || tenantsError || requestsError

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-stone-900">Dashboard</h1>
        <p className="text-stone-600 mt-1">Welcome back, landlord</p>
      </div>

      {hasErrors && (
        <div className="mb-6 space-y-3">
          {propertiesError && <ErrorAlert error={propertiesError} />}
          {tenantsError && <ErrorAlert error={tenantsError} />}
          {requestsError && <ErrorAlert error={requestsError} />}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Properties</CardTitle>
            <CardDescription>Manage your properties</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {propertiesLoading ? '...' : properties.length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Tenants</CardTitle>
            <CardDescription>Active tenants</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{tenantsLoading ? '...' : tenants.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Maintenance</CardTitle>
            <CardDescription>Pending requests</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{requestsLoading ? '...' : pendingRequests}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
