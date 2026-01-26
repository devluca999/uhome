import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Calendar, DollarSign } from 'lucide-react'
import type { Database } from '@/types/database'

type Lease = Database['public']['Tables']['leases']['Row'] & {
  property?: Database['public']['Tables']['properties']['Row']
  unit?: Database['public']['Tables']['units']['Row']
}

interface PropertyDetailsCardProps {
  lease: Lease
}

export function PropertyDetailsCard({ lease }: PropertyDetailsCardProps) {
  const property = lease.property
  const unit = lease.unit

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Property Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-lg">{property?.name || 'Property Name'}</h3>
            <p className="text-muted-foreground">{property?.address || 'Address not available'}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Unit:</span>
              <Badge variant="outline">{unit?.unit_name || 'Unit Name'}</Badge>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Lease:{' '}
                {lease.lease_start_date
                  ? new Date(lease.lease_start_date).toLocaleDateString()
                  : 'Start date not set'}
                {lease.lease_end_date &&
                  ` - ${new Date(lease.lease_end_date).toLocaleDateString()}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                ${lease.rent_amount || 0} / {lease.rent_frequency || 'month'}
              </span>
            </div>
          </div>
        </div>

        {/* House Rules section */}
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">House Rules</h4>
          <p className="text-sm text-muted-foreground">
            House rules and property guidelines will be displayed here once configured by your
            landlord.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
