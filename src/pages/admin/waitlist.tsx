import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { Users, Search, Download, UserPlus, X, CheckSquare, Square } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import {
  sendWaitlistInvite,
  bulkInviteWaitlist,
  bulkRemoveWaitlist,
} from '@/lib/waitlist/waitlist-service'

type WaitlistEntry = {
  id: string
  email: string
  name: string | null
  source: string | null
  status: 'pending' | 'invited' | 'converted' | 'removed'
  converted_to_user_id: string | null
  created_at: string
}

export function AdminWaitlist() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addName, setAddName] = useState('')
  const [addSource, setAddSource] = useState('manual')
  const [adding, setAdding] = useState(false)
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set())
  const [bulkOperating, setBulkOperating] = useState(false)

  const enabled = isFeatureEnabled('ENABLE_ADMIN_WAITLIST')

  useEffect(() => {
    if (enabled) {
      fetchWaitlist()
    }
  }, [enabled])

  async function fetchWaitlist() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('waitlist')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setEntries(data || [])
    } catch (error) {
      console.error('Error fetching waitlist:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEntries = entries.filter(entry => {
    const matchesSearch =
      entry.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.name && entry.name.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter
    const matchesSource = sourceFilter === 'all' || entry.source === sourceFilter
    return matchesSearch && matchesStatus && matchesSource
  })

  async function handleAddEntry() {
    if (!addEmail.trim()) {
      alert('Email is required')
      return
    }

    setAdding(true)
    try {
      const { error } = await supabase.from('waitlist').insert([
        {
          email: addEmail.trim().toLowerCase(),
          name: addName.trim() || null,
          source: addSource,
          status: 'pending',
        },
      ])

      if (error) {
        if (error.code === '23505') {
          throw new Error('This email is already on the waitlist')
        }
        throw error
      }

      setAddEmail('')
      setAddName('')
      setAddSource('manual')
      setShowAddForm(false)
      await fetchWaitlist()
    } catch (error: any) {
      console.error('Error adding waitlist entry:', error)
      alert(error.message || 'Failed to add entry')
    } finally {
      setAdding(false)
    }
  }

  async function handleInvite(entryId: string) {
    const entry = entries.find(e => e.id === entryId)
    if (!entry) return

    try {
      const result = await sendWaitlistInvite({
        entryId: entry.id,
        email: entry.email,
        name: entry.name || undefined,
        userId: entry.converted_to_user_id || undefined,
      })

      if (result.success) {
        await fetchWaitlist()
      } else {
        alert(`Failed to send invitation: ${result.error}`)
      }
    } catch (error) {
      console.error('Error inviting entry:', error)
      alert('Failed to invite entry')
    }
  }

  async function handleBulkInvite() {
    if (selectedEntries.size === 0) {
      alert('Please select entries to invite')
      return
    }

    if (
      !confirm(
        `Are you sure you want to send invitations to ${selectedEntries.size} selected entries?`
      )
    ) {
      return
    }

    setBulkOperating(true)
    try {
      const result = await bulkInviteWaitlist(Array.from(selectedEntries))
      alert(
        `Bulk invite completed!\nSuccess: ${result.success}\nFailed: ${result.failed}${
          result.errors.length > 0 ? `\n\nErrors:\n${result.errors.slice(0, 5).join('\n')}` : ''
        }`
      )
      setSelectedEntries(new Set())
      await fetchWaitlist()
    } catch (error) {
      console.error('Error bulk inviting:', error)
      alert('Failed to send bulk invitations')
    } finally {
      setBulkOperating(false)
    }
  }

  async function handleBulkRemove() {
    if (selectedEntries.size === 0) {
      alert('Please select entries to remove')
      return
    }

    if (
      !confirm(
        `Are you sure you want to remove ${selectedEntries.size} selected entries from the waitlist?`
      )
    ) {
      return
    }

    setBulkOperating(true)
    try {
      const result = await bulkRemoveWaitlist(Array.from(selectedEntries))
      alert(
        `Bulk remove completed!\nSuccess: ${result.success}\nFailed: ${result.failed}${
          result.errors.length > 0 ? `\n\nErrors:\n${result.errors.slice(0, 5).join('\n')}` : ''
        }`
      )
      setSelectedEntries(new Set())
      await fetchWaitlist()
    } catch (error) {
      console.error('Error bulk removing:', error)
      alert('Failed to remove entries')
    } finally {
      setBulkOperating(false)
    }
  }

  function toggleEntrySelection(entryId: string) {
    const newSelected = new Set(selectedEntries)
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId)
    } else {
      newSelected.add(entryId)
    }
    setSelectedEntries(newSelected)
  }

  function toggleSelectAll() {
    if (selectedEntries.size === filteredEntries.length) {
      setSelectedEntries(new Set())
    } else {
      setSelectedEntries(new Set(filteredEntries.map(e => e.id)))
    }
  }

  async function handleRemove(entryId: string) {
    if (!confirm('Are you sure you want to remove this entry from the waitlist?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('waitlist')
        .update({ status: 'removed' })
        .eq('id', entryId)

      if (error) throw error
      await fetchWaitlist()
    } catch (error) {
      console.error('Error removing entry:', error)
      alert('Failed to remove entry')
    }
  }

  function handleExport() {
    const csv = [
      ['Email', 'Name', 'Source', 'Status', 'Created At'].join(','),
      ...filteredEntries.map(entry =>
        [
          entry.email,
          entry.name || '',
          entry.source || '',
          entry.status,
          new Date(entry.created_at).toLocaleDateString(),
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `waitlist-export-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!enabled) {
    return (
      <div className="min-h-screen bg-background [isolation:isolate] p-6">
        <div className="max-w-7xl mx-auto">
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="Waitlist feature disabled"
            description="Enable ENABLE_ADMIN_WAITLIST feature flag to use this feature."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background [isolation:isolate] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Waitlist</h1>
            <p className="text-muted-foreground mt-1">
              Manage early access signups and invitations
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            {selectedEntries.size > 0 && (
              <>
                <Button variant="outline" onClick={handleBulkInvite} disabled={bulkOperating}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Selected ({selectedEntries.size})
                </Button>
                <Button variant="outline" onClick={handleBulkRemove} disabled={bulkOperating}>
                  <X className="w-4 h-4 mr-2" />
                  Remove Selected ({selectedEntries.size})
                </Button>
              </>
            )}
            <Button onClick={() => setShowAddForm(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
          </div>
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
                <option value="pending">Pending</option>
                <option value="invited">Invited</option>
                <option value="converted">Converted</option>
                <option value="removed">Removed</option>
              </select>
              <select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="all">All Sources</option>
                <option value="form">Form</option>
                <option value="import">Import</option>
                <option value="scraper">Scraper</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Waitlist Table */}
        <Card>
          <CardHeader>
            <CardTitle>Entries ({filteredEntries.length})</CardTitle>
            <CardDescription>All waitlist signups</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredEntries.length === 0 ? (
              <EmptyState
                icon={<Users className="h-8 w-8" />}
                title="No waitlist entries"
                description="Waitlist entries will appear here once people sign up."
              />
            ) : (
              <div className="space-y-2">
                {filteredEntries.length > 0 && (
                  <div className="flex items-center gap-2 p-2 border-b border-border">
                    <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="h-8">
                      {selectedEntries.size === filteredEntries.length ? (
                        <CheckSquare className="w-4 h-4 mr-2" />
                      ) : (
                        <Square className="w-4 h-4 mr-2" />
                      )}
                      Select All
                    </Button>
                    {selectedEntries.size > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {selectedEntries.size} selected
                      </span>
                    )}
                  </div>
                )}
                {filteredEntries.map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleEntrySelection(entry.id)}
                        className="flex-shrink-0"
                      >
                        {selectedEntries.has(entry.id) ? (
                          <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">{entry.email}</span>
                          <Badge
                            variant={
                              entry.status === 'converted'
                                ? 'default'
                                : entry.status === 'invited'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {entry.status}
                          </Badge>
                          {entry.source && (
                            <Badge variant="outline" className="text-xs">
                              {entry.source}
                            </Badge>
                          )}
                        </div>
                        {entry.name && (
                          <p className="text-sm text-muted-foreground">{entry.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {entry.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleInvite(entry.id)}
                          disabled={bulkOperating}
                        >
                          Invite
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(entry.id)}
                        disabled={bulkOperating}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Entry Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Waitlist Entry</CardTitle>
              <CardDescription>Manually add an entry to the waitlist</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email *
                </label>
                <Input
                  id="email"
                  type="email"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Name (Optional)
                </label>
                <Input
                  id="name"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="source" className="text-sm font-medium">
                  Source
                </label>
                <select
                  id="source"
                  value={addSource}
                  onChange={e => setAddSource(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="manual">Manual</option>
                  <option value="form">Form</option>
                  <option value="import">Import</option>
                  <option value="scraper">Scraper</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddForm(false)} disabled={adding}>
                  Cancel
                </Button>
                <Button onClick={handleAddEntry} disabled={adding}>
                  {adding ? 'Adding...' : 'Add Entry'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
