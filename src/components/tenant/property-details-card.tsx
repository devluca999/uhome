import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, MapPin, Calendar, DollarSign } from 'lucide-react'
import { GrainOverlay } from '@/components/ui/grain-overlay'
import { MatteLayer } from '@/components/ui/matte-layer'

interface PropertyDetailsCardProps {
  property: {
    id: string
    name: string
    address?: string | null
    rules?: string | null
    rent_amount?: number
    rent_due_date?: number | null
    rules_visible_to_tenants?: boolean
  }
  lease?: {
    rent_amount: number
    rent_frequency: 'monthly' | 'weekly' | 'biweekly' | 'yearly'
  }
}

export function PropertyDetailsCard({ property, lease }: PropertyDetailsCardProps) {
  const rentAmount = lease?.rent_amount || property.rent_amount || 0
  const rentFrequency = lease?.rent_frequency || 'monthly'
  const rentDueDate = property.rent_due_date

  const frequencyLabel: Record<string, string> = {
    monthly: 'month',
    weekly: 'week',
    biweekly: 'bi-weekly',
    yearly: 'year',
  }

  return (
    <Card className="glass-card relative overflow-hidden">
      <GrainOverlay />
      <MatteLayer intensity="subtle" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="w-5 h-5" />
          Property Details
        </CardTitle>
        <CardDescription>Information about your home</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Property Name */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Property Name</h3>
          <p className="text-foreground font-semibold">{property.name}</p>
        </div>

        {/* Address */}
        {property.address && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Address</h3>
              <p className="text-foreground">{property.address}</p>
            </div>
          </div>
        )}

        {/* Rent Information */}
        <div className="flex items-start gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Rent</h3>
            <p className="text-foreground">
              ${rentAmount.toLocaleString()} / {frequencyLabel[rentFrequency]}
            </p>
            {rentDueDate && (
              <p className="text-sm text-muted-foreground mt-1">
                Due on the {rentDueDate}
                {rentDueDate === 1 || rentDueDate === 21 || rentDueDate === 31
                  ? 'st'
                  : rentDueDate === 2 || rentDueDate === 22
                    ? 'nd'
                    : rentDueDate === 3 || rentDueDate === 23
                      ? 'rd'
                      : 'th'}{' '}
                of each month
              </p>
            )}
          </div>
        </div>

        {/* Rules / Policies */}
        {property.rules && property.rules_visible_to_tenants !== false && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">House Rules</h3>
            <div className="bg-muted/50 rounded-md p-3 border border-border">
              <p className="text-sm text-foreground whitespace-pre-wrap">{property.rules}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
