import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { User, MessageSquare } from 'lucide-react'
import type { Database } from '@/types/database'

type Lease = Database['public']['Tables']['leases']['Row'] & {
  property?: Database['public']['Tables']['properties']['Row']
  unit?: Database['public']['Tables']['units']['Row']
}

interface LandlordContactCardProps {
  lease: Lease
}

export function LandlordContactCard({ lease }: LandlordContactCardProps) {
  const navigate = useNavigate()
  const property = lease.property

  // For now, we don't have landlord contact info directly accessible
  // This would need to be added to the property or user relationships
  const landlordContact = {
    name: property?.owner_name || 'Property Owner',
    email: 'Contact through messages', // Placeholder until we add landlord contact fields
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Landlord Contact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold">{landlordContact.name}</h3>
          <p className="text-sm text-muted-foreground">{landlordContact.email}</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/tenant/messages')}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Send Message
          </Button>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-2">
          For urgent maintenance issues, please use the Messages tab above with the &quot;maintenance&quot;
          intent.
        </div>
      </CardContent>
    </Card>
  )
}
