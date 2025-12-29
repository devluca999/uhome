import { useState } from 'react'
import { useMaintenanceRequests } from '@/hooks/use-maintenance-requests'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wrench } from 'lucide-react'

type MaintenanceRequest = {
  id: string
  property_id: string
  tenant_id: string
  status: 'pending' | 'in_progress' | 'completed'
  category?: string
  description: string
  created_at: string
  updated_at: string
  property?: {
    name: string
  }
  tenant?: {
    user?: {
      email: string
    }
  }
}

export function LandlordMaintenance() {
  const { requests, loading, updateRequestStatus } = useMaintenanceRequests()
  const [updating, setUpdating] = useState<string | null>(null)

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const inProgressRequests = requests.filter(r => r.status === 'in_progress')
  const completedRequests = requests.filter(r => r.status === 'completed')

  async function handleStatusUpdate(id: string, status: 'pending' | 'in_progress' | 'completed') {
    setUpdating(id)
    try {
      await updateRequestStatus(id, status)
    } catch (error) {
      console.error('Error updating request:', error)
    } finally {
      setUpdating(null)
    }
  }

  function getStatusBadge(status: string) {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
    }
    return variants[status as keyof typeof variants] || 'bg-stone-100 text-stone-800'
  }

  function RequestCard({ request }: { request: MaintenanceRequest }) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg" id={`request-${request.id}-title`}>
                {request.property?.name || 'Unknown Property'}
              </CardTitle>
              <CardDescription className="mt-1">
                {request.tenant?.user?.email || 'Unknown Tenant'}
              </CardDescription>
            </div>
            <Badge className={getStatusBadge(request.status)}>
              {request.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {request.category && (
              <div>
                <span className="text-xs text-stone-500">Category</span>
                <p className="text-sm font-medium">{request.category}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-stone-500">Description</span>
              <p className="text-sm text-stone-700 mt-1">{request.description}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>Submitted {new Date(request.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex gap-2 pt-2">
              {request.status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusUpdate(request.id, 'in_progress')}
                    disabled={updating === request.id}
                    className="flex-1"
                    aria-label={`Mark maintenance request as in progress`}
                  >
                    Mark In Progress
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleStatusUpdate(request.id, 'completed')}
                    disabled={updating === request.id}
                    className="flex-1"
                    aria-label={`Mark maintenance request as completed`}
                  >
                    Complete
                  </Button>
                </>
              )}
              {request.status === 'in_progress' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusUpdate(request.id, 'completed')}
                  disabled={updating === request.id}
                  className="w-full"
                  aria-label={`Mark maintenance request as completed`}
                >
                  Mark Complete
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-stone-900">Maintenance Requests</h1>
        <p className="text-stone-600 mt-1">View and manage maintenance requests</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-stone-600">Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-8 w-8" />}
          title="No maintenance requests"
          description="Maintenance requests from tenants will appear here once submitted."
        />
      ) : (
        <div className="space-y-8">
          {pendingRequests.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">
                Pending ({pendingRequests.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {pendingRequests.map(request => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            </div>
          )}

          {inProgressRequests.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">
                In Progress ({inProgressRequests.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {inProgressRequests.map(request => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            </div>
          )}

          {completedRequests.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">
                Completed ({completedRequests.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {completedRequests.map(request => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
