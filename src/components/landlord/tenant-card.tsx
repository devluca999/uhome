import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Tenant = {
  id: string
  user_id: string
  property_id: string
  move_in_date: string
  lease_end_date?: string
  user?: {
    email: string
    role: string
  }
  property?: {
    name: string
    address?: string
  }
}

interface TenantCardProps {
  tenant: Tenant
  onDelete?: (id: string) => void
}

export function TenantCard({ tenant, onDelete }: TenantCardProps) {
  const handleDelete = () => {
    if (confirm(`Are you sure you want to remove this tenant?`)) {
      onDelete?.(tenant.id)
    }
  }

  const moveInDate = new Date(tenant.move_in_date).toLocaleDateString()
  const leaseEndDate = tenant.lease_end_date
    ? new Date(tenant.lease_end_date).toLocaleDateString()
    : 'No end date'

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <CardTitle>{tenant.user?.email || 'Tenant'}</CardTitle>
        {tenant.property && <CardDescription>{tenant.property.name}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-600">Move-in Date</span>
            <span className="text-sm font-medium">{moveInDate}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-600">Lease End</span>
            <span className="text-sm font-medium">{leaseEndDate}</span>
          </div>
          {onDelete && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="w-full text-red-600 hover:text-red-700"
              >
                Remove Tenant
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
