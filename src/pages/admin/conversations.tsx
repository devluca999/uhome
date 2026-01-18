import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdminConversations, type ConversationMessage } from '@/hooks/admin/use-admin-conversations'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, ArrowLeft, MessageSquare } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'

export function AdminConversations() {
  const { conversations, loading, error, fetchMessagesForLease } = useAdminConversations()
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      conv.property_name?.toLowerCase().includes(query) ||
      conv.lease_id.toLowerCase().includes(query) ||
      conv.tenant_emails.some(email => email.toLowerCase().includes(query)) ||
      conv.landlord_emails.some(email => email.toLowerCase().includes(query))
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-muted-foreground">Loading conversations...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-destructive">Error loading conversations: {error.message}</div>
        </div>
      </div>
    )
  }

  if (selectedLeaseId) {
    const selectedConv = conversations.find(c => c.lease_id === selectedLeaseId)
    return (
      <div className="min-h-screen bg-background relative">
        <GrainOverlay />
        <MatteLayer />
        <div className="relative z-10 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedLeaseId(null)
                  setMessages([])
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Conversations
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Conversation Thread</CardTitle>
                <CardDescription>
                  Property: {selectedConv?.property_name || 'Unknown'} | Lease ID: {selectedLeaseId.substring(0, 8)}...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Participants:</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Tenants: {selectedConv?.tenant_emails.join(', ') || 'None'}</Badge>
                      <Badge variant="outline">Landlords: {selectedConv?.landlord_emails.join(', ') || 'None'}</Badge>
                    </div>
                  </div>

                  {messagesLoading ? (
                    <div className="text-muted-foreground">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No messages in this conversation</div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map(message => (
                        <div
                          key={message.id}
                          className={`p-4 rounded-lg border ${
                            message.sender_role === 'tenant'
                              ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                              : message.sender_role === 'landlord'
                                ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                                : 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize">
                                {message.sender_role}
                              </Badge>
                              {message.sender_email && (
                                <span className="text-sm text-muted-foreground">{message.sender_email}</span>
                              )}
                              {message.intent !== 'general' && (
                                <Badge variant="secondary" className="capitalize">
                                  {message.intent}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(message.created_at)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                          {message.status && (
                            <div className="mt-2">
                              <Badge variant="outline" className="capitalize">
                                Status: {message.status}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
            <h1 className="text-3xl font-bold text-foreground">Conversations</h1>
            <p className="text-muted-foreground mt-2">Inspect tenant-landlord message threads (read-only)</p>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by property, lease ID, or participant email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Conversations List */}
          <div className="grid gap-4">
            {filteredConversations.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    {searchQuery ? 'No conversations found matching your search' : 'No conversations found'}
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredConversations.map(conversation => (
                <Card
                  key={conversation.lease_id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedLeaseId(conversation.lease_id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{conversation.property_name || 'Unknown Property'}</h3>
                          <Badge variant="outline" className="font-mono text-xs">
                            {conversation.lease_id.substring(0, 8)}...
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>
                            <strong>Tenants:</strong> {conversation.tenant_emails.join(', ') || 'None'}
                          </p>
                          <p>
                            <strong>Landlords:</strong> {conversation.landlord_emails.join(', ') || 'None'}
                          </p>
                          <p className="flex items-center gap-2 mt-2">
                            <MessageSquare className="h-4 w-4" />
                            {conversation.message_count} message{conversation.message_count !== 1 ? 's' : ''}
                            {conversation.last_message_at && (
                              <span>• Last message: {formatDateTime(conversation.last_message_at)}</span>
                            )}
                          </p>
                        </div>
                      </div>
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
