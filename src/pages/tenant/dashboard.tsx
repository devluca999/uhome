import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTenantData } from '@/hooks/use-tenant-data'
import { useRentRecords } from '@/hooks/use-rent-records'
import { useMaintenanceRequests } from '@/hooks/use-maintenance-requests'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function TenantDashboard() {
  const { data: tenantData, loading: tenantLoading } = useTenantData()
  const { records: rentRecords, loading: rentLoading } = useRentRecords(tenantData?.tenant.id)
  const { requests, loading: maintenanceLoading } = useMaintenanceRequests(tenantData?.property.id)

  const pendingRent = rentRecords.filter(
    r => r.status === 'pending' || r.status === 'overdue'
  ).length
  const pendingMaintenance = requests.filter(r => r.status === 'pending').length

  if (tenantLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-stone-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!tenantData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-stone-900">Dashboard</h1>
          <p className="text-stone-600 mt-1">Welcome back</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-600 mb-4">No property assigned yet</p>
            <p className="text-sm text-stone-500">
              Contact your landlord to be assigned to a property
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const nextRentRecord = rentRecords.find(r => r.status === 'pending')
  const overdueRent = rentRecords.filter(r => r.status === 'overdue').length

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-stone-900">Dashboard</h1>
        <p className="text-stone-600 mt-1">Welcome back</p>
      </div>

      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>{tenantData.property.name}</CardTitle>
            {tenantData.property.address && (
              <CardDescription>{tenantData.property.address}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-stone-600">Monthly Rent</span>
                <span className="text-xl font-semibold">
                  ${tenantData.property.rent_amount.toLocaleString()}
                </span>
              </div>
              {tenantData.property.rent_due_date && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-600">Due Date</span>
                  <span className="font-medium">
                    {tenantData.property.rent_due_date}
                    {tenantData.property.rent_due_date === 1
                      ? 'st'
                      : tenantData.property.rent_due_date === 2
                        ? 'nd'
                        : tenantData.property.rent_due_date === 3
                          ? 'rd'
                          : 'th'}{' '}
                    of month
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rent Status</CardTitle>
            <CardDescription>Current rent information</CardDescription>
          </CardHeader>
          <CardContent>
            {rentLoading ? (
              <p className="text-stone-600">Loading...</p>
            ) : rentRecords.length === 0 ? (
              <p className="text-stone-600">No rent records yet</p>
            ) : (
              <div className="space-y-3">
                {nextRentRecord && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-stone-600">Next Payment</span>
                      <span className="text-sm font-semibold">
                        ${nextRentRecord.amount.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">
                      Due: {new Date(nextRentRecord.due_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {overdueRent > 0 && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">
                      {overdueRent} payment{overdueRent > 1 ? 's' : ''} overdue
                    </p>
                  </div>
                )}
                <div className="pt-2">
                  <p className="text-2xl font-semibold">{pendingRent}</p>
                  <p className="text-xs text-stone-500">Pending/Overdue</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Maintenance</CardTitle>
            <CardDescription>Your maintenance requests</CardDescription>
          </CardHeader>
          <CardContent>
            {maintenanceLoading ? (
              <p className="text-stone-600">Loading...</p>
            ) : (
              <div className="space-y-3">
                <div className="pt-2">
                  <p className="text-2xl font-semibold">{pendingMaintenance}</p>
                  <p className="text-xs text-stone-500">Pending requests</p>
                </div>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/tenant/maintenance">View All Requests</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {tenantData.property.rules && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>House Rules / Considerations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone-700 whitespace-pre-wrap">{tenantData.property.rules}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
