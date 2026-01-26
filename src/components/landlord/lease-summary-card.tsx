import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { motion as motionTokens, durationToSeconds } from '@/lib/motion'
import { MessageSquare } from 'lucide-react'
import type { Database } from '@/types/database'

type Lease = Database['public']['Tables']['leases']['Row']

interface LeaseSummaryCardProps {
  lease: Lease & {
    property?: {
      name: string
      address?: string | null
    }
    tenant?: {
      id: string
      user?: {
        email: string
      }
    }
  }
  index?: number
}

export function LeaseSummaryCard({ lease, index = 0 }: LeaseSummaryCardProps) {
  const startDate = lease.lease_start_date
    ? new Date(lease.lease_start_date).toLocaleDateString()
    : 'Not set'
  const endDate = lease.lease_end_date
    ? new Date(lease.lease_end_date).toLocaleDateString()
    : 'Ongoing'
  const isActive = !lease.lease_end_date || (lease.lease_end_date ? new Date(lease.lease_end_date) > new Date() : false)

  return (
    <motion.div
      initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      transition={{
        duration: durationToSeconds(motionTokens.duration.base),
        delay: index * 0.05,
        ease: motionTokens.ease.standard,
      }}
    >
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">Lease #{lease.id.slice(0, 8)}</CardTitle>
              <CardDescription className="mt-1">
                {lease.tenant?.user?.email || 'Tenant'}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={isActive ? 'default' : 'secondary'}>
                {isActive ? 'Active' : 'Ended'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {lease.lease_type === 'long-term' ? 'Long-term' : 'Short-term'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="text-sm font-medium text-foreground">{startDate}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">End Date</p>
                <p className="text-sm font-medium text-foreground">{endDate}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Rent Amount</p>
                <p className="text-sm font-semibold text-foreground">
                  ${Number(lease.rent_amount).toLocaleString()} / {lease.rent_frequency}
                </p>
              </div>
              {lease.security_deposit && (
                <div>
                  <p className="text-xs text-muted-foreground">Security Deposit</p>
                  <p className="text-sm font-medium text-foreground">
                    ${Number(lease.security_deposit).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            <div className="pt-3 border-t border-border mt-3">
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link to={`/landlord/messages/${lease.id}`}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  View Messages
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
