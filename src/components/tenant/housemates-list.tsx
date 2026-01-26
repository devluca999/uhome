import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton-loader'
import { supabase } from '@/lib/supabase/client'
import { Users, User } from 'lucide-react'
import type { Database } from '@/types/database'

type Tenant = Database['public']['Tables']['tenants']['Row'] & {
  user?: {
    email: string | null
  }
}

interface HousematesListProps {
  leaseId: string
}

export function HousematesList({ leaseId }: HousematesListProps) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchHousemates() {
      try {
        setLoading(true)

        // Get all tenants on this lease
        const { data, error: fetchError } = await supabase
          .from('tenants')
          .select(
            `
            *,
            user:users(email)
          `
          )
          .eq('lease_id', leaseId)

        if (fetchError) throw fetchError

        setTenants(data || [])
      } catch (err) {
        console.error('Error fetching housemates:', err)
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    if (leaseId) {
      fetchHousemates()
    }
  }, [leaseId])

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Housemates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Housemates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Error loading housemates. Please try refreshing the page.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Housemates ({tenants.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tenants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No other housemates found on this lease.</p>
        ) : (
          <div className="space-y-3">
            {tenants.map(tenant => {
              const email = tenant.user?.email || 'Unknown'
              const initials = email.substring(0, 2).toUpperCase()

              return (
                <div
                  key={tenant.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{email}</p>
                    <p className="text-xs text-muted-foreground">
                      Tenant since{' '}
                      {tenant.move_in_date
                        ? new Date(tenant.move_in_date).toLocaleDateString()
                        : 'Unknown'}
                    </p>
                  </div>

                  <Badge variant="outline" className="text-xs">
                    Roommate
                  </Badge>
                </div>
              )
            })}
          </div>
        )}

        <div className="text-xs text-muted-foreground border-t pt-3 mt-4">
          All housemates share the same lease and have access to household messaging.
        </div>
      </CardContent>
    </Card>
  )
}
