import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Users, Calendar } from 'lucide-react'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton-loader'

interface Housemate {
  id: string
  user_id: string
  move_in_date: string
  lease_end_date: string | null
  user: {
    email: string | null
  }
}

interface HousematesListProps {
  propertyId: string
  currentTenantId?: string
}

export function HousematesList({ propertyId, currentTenantId }: HousematesListProps) {
  const [housemates, setHousemates] = useState<Housemate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHousemates() {
      try {
        setLoading(true)
        setError(null)

        // Query all tenants at the same property
        const { data: tenants, error: tenantsError } = await supabase
          .from('tenants')
          .select('id, user_id, move_in_date, lease_end_date')
          .eq('property_id', propertyId)
          .order('move_in_date', { ascending: true })

        if (tenantsError) throw tenantsError

        if (!tenants || tenants.length === 0) {
          setHousemates([])
          setLoading(false)
          return
        }

        // Fetch user info for each tenant
        const housematesWithUsers = await Promise.all(
          tenants.map(async tenant => {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('email')
              .eq('id', tenant.user_id)
              .maybeSingle()

            // Handle RLS restrictions gracefully
            if (userError || !userData) {
              return {
                ...tenant,
                user: { email: null },
              }
            }

            return {
              ...tenant,
              user: userData,
            }
          })
        )

        setHousemates(housematesWithUsers)
      } catch (err) {
        console.error('Error fetching housemates:', err)
        setError('Failed to load housemates')
      } finally {
        setLoading(false)
      }
    }

    if (propertyId) {
      fetchHousemates()
    }
  }, [propertyId])

  function getInitials(email: string | null): string {
    if (!email) return '?'
    const parts = email.split('@')[0].split('.')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  function formatName(email: string | null): string {
    if (!email) return 'Unknown'
    const localPart = email.split('@')[0]
    // Convert firstname.lastname or firstname_lastname to "Firstname Lastname"
    const name = localPart
      .split(/[._]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
    return name
  }

  if (loading) {
    return (
      <Card className="glass-card relative overflow-hidden">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Housemates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="glass-card relative overflow-hidden">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Housemates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card relative overflow-hidden">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Housemates
        </CardTitle>
        <CardDescription>
          {housemates.length === 1
            ? 'You are the only tenant at this property'
            : `${housemates.length} tenant${housemates.length > 1 ? 's' : ''} at this property`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {housemates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tenants found</p>
        ) : (
          <div className="space-y-4">
            {housemates.map(housemate => {
              const isCurrentTenant = housemate.id === currentTenantId
              const moveInDate = new Date(housemate.move_in_date).toLocaleDateString()

              return (
                <div
                  key={housemate.id}
                  className={`flex items-start gap-4 p-3 rounded-lg border ${
                    isCurrentTenant
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-matte/30 border-border'
                  }`}
                >
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(housemate.user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-foreground">
                        {formatName(housemate.user.email)}
                      </h3>
                      {isCurrentTenant && (
                        <span className="text-xs text-primary font-medium">(You)</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {housemate.user.email}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>Moved in {moveInDate}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

