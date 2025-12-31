import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { NumberCounter } from './number-counter'
import { ReflectiveGradient } from './reflective-gradient'
import { GrainOverlay } from './grain-overlay'
import { MatteLayer } from './matte-layer'
import { createSpring } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface PaymentCardProps {
  amount: number
  dueDate?: string
  status?: 'pending' | 'overdue' | 'paid'
  className?: string
}

export function PaymentCard({ amount, dueDate, status = 'pending', className }: PaymentCardProps) {
  const cardSpring = createSpring('card')

  return (
    <motion.div
      className={cn('relative', className)}
      whileHover={{
        y: -2,
        scale: 1.01,
      }}
      transition={{
        type: 'spring',
        ...cardSpring,
      }}
    >
      <Card className="glass-card relative overflow-hidden">
        <GrainOverlay />
        <MatteLayer intensity="subtle" />
        <ReflectiveGradient />
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Balance</p>
              <p className="text-3xl font-semibold text-foreground">
                <NumberCounter value={amount} format={v => `$${Math.round(v).toLocaleString()}`} />
              </p>
            </div>
            {dueDate && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Due Date</p>
                <p className="text-base font-medium text-foreground">{dueDate}</p>
              </div>
            )}
            {status === 'overdue' && (
              <div className="pt-2">
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-destructive/20 text-destructive">
                  Overdue
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
