import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Mail, MessageSquare } from 'lucide-react'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'
import { supabase } from '@/lib/supabase/client'
import { Link } from 'react-router-dom'

interface LandlordContactCardProps {
  propertyId: string
  leaseId?: string
}

export function LandlordContactCard({ propertyId, leaseId }: LandlordContactCardProps) {
  const [landlordEmail, setLandlordEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLandlordContact() {
      try {
        setLoading(true)
        // Get property owner
        const { data: property, error: propertyError } = await supabase
          .from('properties')
          .select('owner_id')
          .eq('id', propertyId)
          .single()

        if (propertyError) throw propertyError

        // Get landlord user email
        const { data: landlordUser, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('id', property.owner_id)
          .maybeSingle()

        // Handle RLS restrictions gracefully
        if (userError || !landlordUser) {
          console.warn('Unable to fetch landlord contact info (RLS restriction)')
          setLandlordEmail(null)
          return
        }

        setLandlordEmail(landlordUser.email)
      } catch (error) {
        console.error('Error fetching landlord contact:', error)
      } finally {
        setLoading(false)
      }
    }

    if (propertyId) {
      fetchLandlordContact()
    }
  }, [propertyId])

  if (loading) {
    return (
      <Card className="glass-card relative overflow-hidden">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Landlord Contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
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
          <User className="w-5 h-5" />
          Landlord Contact
        </CardTitle>
        <CardDescription>Your property manager</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {landlordEmail ? (
          <>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <a
                href={`mailto:${landlordEmail}`}
                className="text-foreground hover:text-primary transition-colors"
              >
                {landlordEmail}
              </a>
            </div>

            {leaseId && (
              <Button asChild className="w-full">
                <Link to={`/tenant/messages/${leaseId}`}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Message
                </Link>
              </Button>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Contact information unavailable</p>
        )}
      </CardContent>
    </Card>
  )
}
