import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdminSupportTickets } from '@/hooks/admin/use-admin-support-tickets'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Filter } from 'lucide-react'
// Date formatting helper
function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, '0')
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${displayHours}:${displayMinutes} ${ampm}`
}

type StatusFilter = 'all' | 'open' | 'resolved'

export function AdminSupport() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const { tickets, loading, error, markResolved } = useAdminSupportTickets(statusFilter)
  const [resolving, setResolving] = useState<string | null>(null)

  async function handleMarkResolved(ticketId: string) {
    try {
      setResolving(ticketId)
      await markResolved(ticketId)
    } catch (err) {
      console.error('Error marking ticket as resolved:', err)
      alert('Error marking ticket as resolved. Please try again.')
    } finally {
      setResolving(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-muted-foreground">Loading support tickets...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-destructive">Error loading support tickets: {error.message}</div>
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
            <h1 className="text-3xl font-bold text-foreground">Support Tickets</h1>
            <p className="text-muted-foreground mt-2">View and manage support ticket queue</p>
          </div>

          {/* Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Status:</span>
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  All ({tickets.length})
                </Button>
                <Button
                  variant={statusFilter === 'open' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('open')}
                >
                  Open ({tickets.filter(t => t.status === 'open').length})
                </Button>
                <Button
                  variant={statusFilter === 'resolved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('resolved')}
                >
                  Resolved ({tickets.filter(t => t.status === 'resolved').length})
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tickets List */}
          <div className="space-y-4">
            {tickets.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    {statusFilter === 'all'
                      ? 'No support tickets found'
                      : `No ${statusFilter} tickets found`}
                  </div>
                </CardContent>
              </Card>
            ) : (
              tickets.map(ticket => (
                <Card key={ticket.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle>{ticket.subject}</CardTitle>
                          <Badge variant={ticket.status === 'open' ? 'destructive' : 'default'}>
                            {ticket.status}
                          </Badge>
                        </div>
                        <CardDescription>
                          <div className="space-y-1">
                            <p>
                              <strong>From:</strong> {ticket.email} (User ID: {ticket.user_id.substring(0, 8)}...)
                            </p>
                            <p>
                              <strong>Created:</strong> {formatDateTime(ticket.created_at)}
                            </p>
                            {ticket.resolved_at && (
                              <p>
                                <strong>Resolved:</strong> {formatDateTime(ticket.resolved_at)}
                              </p>
                            )}
                          </div>
                        </CardDescription>
                      </div>
                      {ticket.status === 'open' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkResolved(ticket.id)}
                          disabled={resolving === ticket.id}
                        >
                          {resolving === ticket.id ? (
                            'Resolving...'
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Resolved
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
