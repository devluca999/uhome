import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { Users, Search, Upload } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

type Lead = {
  id: string
  email: string
  name: string | null
  phone: string | null
  company: string | null
  source: string
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected'
  imported_at: string
}

export function AdminLeads() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  const enabled = isFeatureEnabled('ENABLE_ADMIN_LEADS')

  useEffect(() => {
    if (enabled) {
      fetchLeads()
    }
  }, [enabled])

  async function fetchLeads() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('imported_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.name && lead.name.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter
    return matchesSearch && matchesStatus && matchesSource
  })

  if (!enabled) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="Leads feature disabled"
            description="Enable ENABLE_ADMIN_LEADS feature flag to use this feature."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Leads</h1>
            <p className="text-muted-foreground mt-1">Manage and track potential customers</p>
          </div>
          <Button onClick={() => navigate('/admin/leads/upload')}>
            <Upload className="w-4 h-4 mr-2" />
            Import Leads
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="all">All Sources</option>
                <option value="manual_upload">Manual Upload</option>
                <option value="scraper">Scraper</option>
                <option value="apify">Apify</option>
                <option value="apollo">Apollo</option>
                <option value="form">Form</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>Leads ({filteredLeads.length})</CardTitle>
            <CardDescription>All imported and inbound leads</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredLeads.length === 0 ? (
              <EmptyState
                icon={<Users className="h-8 w-8" />}
                title="No leads"
                description="Import leads or wait for inbound signups."
              />
            ) : (
              <div className="space-y-2">
                {filteredLeads.map(lead => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">{lead.email}</span>
                        <Badge
                          variant={
                            lead.status === 'converted'
                              ? 'default'
                              : lead.status === 'qualified'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {lead.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {lead.source}
                        </Badge>
                      </div>
                      {lead.name && (
                        <p className="text-sm text-muted-foreground">{lead.name}</p>
                      )}
                      {lead.company && (
                        <p className="text-sm text-muted-foreground">{lead.company}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(lead.imported_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
