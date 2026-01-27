import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { motionTokens, createSpring } from '@/lib/motion'
import { DollarSign, Calendar, FileText, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RentRecordWithRelations } from '@/hooks/use-landlord-rent-records'

interface FinanceSummaryCardProps {
  rentRecords: RentRecordWithRelations[]
  className?: string
}

/**
 * Tenant Finance Summary Card
 *
 * Shows on tenant dashboard:
 * - Current balance (outstanding + pending)
 * - Due date (next pending)
 * - Last payment date
 * - CTA: "View payment history"
 */
export function FinanceSummaryCard({ rentRecords, className }: FinanceSummaryCardProps) {
  const cardSpring = createSpring('card')

  // Calculate current balance (outstanding + pending)
  const currentBalance = rentRecords
    .filter(r => r.status === 'pending' || r.status === 'overdue')
    .reduce((sum, r) => {
      const amount = Number(r.amount)
      const lateFee = r.late_fee || 0
      return sum + amount + lateFee
    }, 0)

  // Find next pending record
  const nextPending = rentRecords
    .filter(r => r.status === 'pending')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]

  // Find last paid record
  const lastPaid = rentRecords
    .filter(r => r.status === 'paid' && r.paid_date)
    .sort((a, b) => {
      const dateA = a.paid_date ? new Date(a.paid_date).getTime() : 0
      const dateB = b.paid_date ? new Date(b.paid_date).getTime() : 0
      return dateB - dateA
    })[0]

  return (
    <motion.div
      initial={{ opacity: motionTokens.opacity.hidden, y: 8 }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{
        type: 'spring',
        ...cardSpring,
      }}
      className={cn('mb-6', className)}
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Balance */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Current Balance</span>
            </div>
            <span
              className={cn(
                'text-xl font-semibold',
                currentBalance > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              )}
            >
              ${currentBalance.toLocaleString()}
            </span>
          </div>

          {/* Due Date */}
          {nextPending && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Due Date</span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {new Date(nextPending.due_date).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Last Payment */}
          {lastPaid && lastPaid.paid_date && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Last Payment</span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {new Date(lastPaid.paid_date).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* CTA */}
          <Link to="/tenant/finances">
            <Button variant="outline" className="w-full mt-4">
              View Payment History
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  )
}
