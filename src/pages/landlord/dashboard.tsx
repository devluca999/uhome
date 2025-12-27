import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useProperties } from '@/hooks/use-properties'
import { useTenants } from '@/hooks/use-tenants'
import { useMaintenanceRequests } from '@/hooks/use-maintenance-requests'

export function LandlordDashboard() {
  const { properties, loading: propertiesLoading } = useProperties()
  const { tenants, loading: tenantsLoading } = useTenants()
  const { requests, loading: requestsLoading } = useMaintenanceRequests()

  const pendingRequests = requests.filter(r => r.status === 'pending').length

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-stone-900">Dashboard</h1>
        <p className="text-stone-600 mt-1">Welcome back, landlord</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
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
        <Card>
          <CardHeader>
            <CardTitle>Tenants</CardTitle>
            <CardDescription>Active tenants</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{tenantsLoading ? '...' : tenants.length}</p>
          </CardContent>
        </Card>
        <Card>
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
