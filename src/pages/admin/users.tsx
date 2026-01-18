import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdminUsers } from '@/hooks/admin/use-admin-users'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useState, useMemo } from 'react'
// Date formatting helper
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

export function AdminUsers() {
  const { users, loading, error } = useAdminUsers()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users

    const query = searchQuery.toLowerCase()
    return users.filter(user => {
      const email = user.email?.toLowerCase() || ''
      const role = user.role?.toLowerCase() || ''
      const id = user.id.toLowerCase()
      return email.includes(query) || role.includes(query) || id.includes(query)
    })
  }, [users, searchQuery])

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-muted-foreground">Loading users...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-destructive">Error loading users: {error.message}</div>
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
            <h1 className="text-3xl font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground mt-2">View all system users (read-only)</p>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, role, or ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <CardDescription>All registered users in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No users found matching your search' : 'No users found'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">User ID</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Email</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Role</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Account Type</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Auth Provider</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Created At</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Last Sign In</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 text-sm font-mono text-muted-foreground">
                            {user.id.substring(0, 8)}...
                          </td>
                          <td className="p-3 text-sm">{user.email || 'N/A'}</td>
                          <td className="p-3 text-sm capitalize">{user.role}</td>
                          <td className="p-3 text-sm capitalize">{user.role}</td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {user.auth_provider || 'N/A'}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {user.created_at ? formatDate(user.created_at) : 'N/A'}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
