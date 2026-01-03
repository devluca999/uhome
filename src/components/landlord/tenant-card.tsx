import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { motion as motionTokens, durationToSeconds } from '@/lib/motion'
import { MapPin } from 'lucide-react'

type Tenant = {
  id: string
  user_id: string
  property_id: string
  move_in_date: string
  lease_end_date?: string | null
  phone?: string | null
  notes?: string | null
  user?: {
    email: string
    role: string
  }
  property?: {
    name: string
    address?: string
  }
}

interface TenantCardProps {
  tenant: Tenant
  onDelete?: (id: string) => void
}

export function TenantCard({ tenant, onDelete }: TenantCardProps) {
  const handleDelete = () => {
    if (confirm(`Are you sure you want to remove this tenant?`)) {
      onDelete?.(tenant.id)
    }
  }

  const moveInDate = new Date(tenant.move_in_date).toLocaleDateString()
  const leaseEndDate = tenant.lease_end_date
    ? new Date(tenant.lease_end_date).toLocaleDateString()
    : 'No end date'

  return (
    <motion.div
      initial={{ opacity: motionTokens.opacity.hidden, y: 4 }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      exit={{ opacity: motionTokens.opacity.hidden, y: -4 }}
      transition={{
        duration: durationToSeconds(motionTokens.duration.base),
        ease: motionTokens.ease.standard,
      }}
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{tenant.user?.email || 'Tenant'}</CardTitle>
          {tenant.property && (
            <CardDescription>
              <Link
                to={`/landlord/properties/${tenant.property_id}`}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <MapPin className="w-3 h-3" />
                {tenant.property.name}
                {tenant.property.address && ` - ${tenant.property.address}`}
              </Link>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Move-in Date</span>
              <span className="text-sm font-medium text-foreground">{moveInDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Lease End</span>
              <span className="text-sm font-medium">{leaseEndDate}</span>
            </div>
            {tenant.phone && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Phone</span>
                <span className="text-sm font-medium text-foreground">{tenant.phone}</span>
              </div>
            )}
            {tenant.notes && (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Notes</span>
                <div className="bg-muted/50 p-2 rounded-md">
                  <MarkdownRenderer content={tenant.notes} />
                </div>
              </div>
            )}
            {onDelete && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="w-full text-destructive hover:text-destructive/90"
                >
                  Remove Tenant
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
