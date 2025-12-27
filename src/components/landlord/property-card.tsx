import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Database } from '@/types/database'

type Property = Database['public']['Tables']['properties']['Row']

interface PropertyCardProps {
  property: Property
  onDelete?: (id: string) => void
}

export function PropertyCard({ property, onDelete }: PropertyCardProps) {
  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${property.name}?`)) {
      onDelete?.(property.id)
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{property.name}</CardTitle>
            {property.address && (
              <CardDescription className="mt-1">{property.address}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-600">Monthly Rent</span>
            <span className="text-lg font-semibold">${property.rent_amount.toLocaleString()}</span>
          </div>
          {property.rent_due_date && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-600">Due Date</span>
              <span className="text-sm font-medium">
                {property.rent_due_date}
                {property.rent_due_date === 1
                  ? 'st'
                  : property.rent_due_date === 2
                    ? 'nd'
                    : property.rent_due_date === 3
                      ? 'rd'
                      : 'th'}{' '}
                of month
              </span>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link to={`/landlord/properties/${property.id}`}>View Details</Link>
            </Button>
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
