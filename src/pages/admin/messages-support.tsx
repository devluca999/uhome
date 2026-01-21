import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useAdminConversations,
  type ConversationMessage,
} from '@/hooks/admin/use-admin-conversations'
import { useAdminSupportTickets } from '@/hooks/admin/use-admin-support-tickets'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, MessageSquare, Ticket, Mail, CheckCircle, XCircle, Filter } from 'lucide-react'
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

type StatusFilter = 'all' | 'open' | 'resolved'

export function AdminMessagesSupport() {
  // Track performance metrics
  usePerformanceTracker({ componentName: 'AdminMessagesSupport' })

  const [activeTab, setActiveTab] = useState<string>('tickets')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Conversations state
  const {
    conversations,
    loading: conversationsLoading,
    error: conversationsError,
    fetchMessagesForLease,
  } = useAdminConversations()
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)

  // Support tickets state
  const {
    tickets,
    loading: ticketsLoading,
    error: ticketsError,
    markResolved,
  } = useAdminSupportTickets(statusFilter)
  const [resolving, setResolving] = useState<string | null>(null)

  useEffect(() => {
    if (selectedLeaseId) {
      loadMessages(selectedLeaseId)
    }
  }, [selectedLeaseId])

  async function loadMessages(leaseId: string) {
    try {
      setMessagesLoading(true)
      const msgs = await fetchMessagesForLease(leaseId)
      setMessages(msgs)
    } catch (err) {
      console.error('Error loading messages:', err)
    } finally {
      setMessagesLoading(false)
    }
  }

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

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      conv.tenant_emails.some(email => email.toLowerCase().includes(query)) ||
      conv.landlord_emails.some(email => email.toLowerCase().includes(query)) ||
      conv.property_name?.toLowerCase().includes(query)
    )
  })

  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      ticket.email?.toLowerCase().includes(query) ||
      ticket.subject?.toLowerCase().includes(query) ||
      ticket.message?.toLowerCase().includes(query)
    )
  })

  if (conversationsLoading || ticketsLoading) {
    return (
      <div className="min-h-screen bg-background relative">
        <GrainOverlay />
        <MatteLayer />
        <div className="relative z-10 p-6">
          <div className="max-w-7xl mx-auto">Loading...</div>
        </div>
      </div>
    )
  }

  if (conversationsError || ticketsError) {
    return (
      <div className="min-h-screen bg-background relative">
        <GrainOverlay />
        <MatteLayer />
        <div className="relative z-10 p-6">
          <div className="max-w-7xl mx-auto text-destructive">
            Error loading data: {conversationsError?.message || ticketsError?.message}
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
            <h1 className="text-3xl font-bold text-foreground">Messages & Support</h1>
            <p className="text-muted-foreground mt-2">
              Support tickets, platform announcements, and message monitoring
            </p>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets, conversations, or emails..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tickets">
                <Ticket className="h-4 w-4 mr-2" />
                Tickets
              </TabsTrigger>
              <TabsTrigger value="conversations">
                <MessageSquare className="h-4 w-4 mr-2" />
                Conversations
              </TabsTrigger>
              <TabsTrigger value="announcements">
                <Mail className="h-4 w-4 mr-2" />
                Announcements
              </TabsTrigger>
            </TabsList>

            {/* Tickets Tab */}
            <TabsContent value="tickets" className="space-y-6 mt-6">
              {/* Status Filter */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">Status:</label>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                      className="px-3 py-2 rounded-md border border-border bg-background text-foreground"
                    >
                      <option value="all">All Tickets</option>
                      <option value="open">Open</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Support Tickets */}
              <Card>
                <CardHeader>
                  <CardTitle>Support Tickets ({filteredTickets.length})</CardTitle>
                  <CardDescription>Customer support tickets and requests</CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredTickets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchQuery
                        ? 'No tickets found matching your search'
                        : 'No support tickets found'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTickets.map(ticket => (
                        <div
                          key={ticket.id}
                          className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>
                                {ticket.status}
                              </Badge>
                              <h3 className="font-medium truncate">{ticket.subject}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {ticket.message}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{ticket.email}</span>
                              <span>•</span>
                              <span>{formatDateTime(ticket.created_at)}</span>
                            </div>
                          </div>
                          {ticket.status === 'open' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkResolved(ticket.id)}
                              disabled={resolving === ticket.id}
                              className="ml-4"
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
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Conversations Tab */}
            <TabsContent value="conversations" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Conversations ({filteredConversations.length})</CardTitle>
                  <CardDescription>Read-only view of tenant-landlord conversations</CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchQuery
                        ? 'No conversations found matching your search'
                        : 'No conversations found'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredConversations.map(conv => (
                        <div
                          key={conv.lease_id}
                          className={`p-4 border rounded-lg hover:bg-muted/50 cursor-pointer ${
                            selectedLeaseId === conv.lease_id ? 'bg-muted border-primary' : ''
                          }`}
                          onClick={() =>
                            setSelectedLeaseId(
                              conv.lease_id === selectedLeaseId ? null : conv.lease_id
                            )
                          }
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{conv.message_count} messages</Badge>
                                <span className="font-medium">
                                  {conv.property_name || 'Unknown Property'}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground mb-2">
                                <span>Tenants: {conv.tenant_emails.join(', ') || 'None'}</span>
                                <span className="mx-2">•</span>
                                <span>Landlords: {conv.landlord_emails.join(', ') || 'None'}</span>
                              </div>
                              {conv.last_message_at && (
                                <div className="text-xs text-muted-foreground mt-2">
                                  Last message: {formatDateTime(conv.last_message_at)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Expanded Messages */}
                          {selectedLeaseId === conv.lease_id && (
                            <div className="mt-4 pt-4 border-t">
                              {messagesLoading ? (
                                <div className="text-center py-4 text-muted-foreground">
                                  Loading messages...
                                </div>
                              ) : messages.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground">
                                  No messages found
                                </div>
                              ) : (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                  {messages.map(msg => (
                                    <div
                                      key={msg.id}
                                      className={`p-3 rounded-lg ${
                                        msg.sender_role === 'tenant'
                                          ? 'bg-blue-50 dark:bg-blue-950/20 ml-8'
                                          : msg.sender_role === 'landlord'
                                            ? 'bg-green-50 dark:bg-green-950/20 mr-8'
                                            : 'bg-muted'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="text-xs">
                                          {msg.sender_role}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                          {formatDateTime(msg.created_at)}
                                        </span>
                                      </div>
                                      <p className="text-sm">{msg.body}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Announcements Tab */}
            <TabsContent value="announcements" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Announcements</CardTitle>
                  <CardDescription>
                    Email broadcasts and platform-wide announcements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Announcements Feature</p>
                    <p className="text-sm">
                      Platform announcements and email broadcasts feature will be implemented here.
                    </p>
                    <p className="text-xs mt-4">
                      This will allow admins to send platform-wide announcements and email
                      broadcasts to users.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Email Logs</CardTitle>
                  <CardDescription>
                    History of email broadcasts and transactional emails
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Email Logs</p>
                    <p className="text-sm">
                      Email sending history and logs will be displayed here.
                    </p>
                    <p className="text-xs mt-4">
                      Track delivery status, opens, clicks, and bounces for all platform emails.
                    </p>
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
