// useState removed - not used
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motionTokens, createSpring } from '@/lib/motion'
import { useModalScrollLock } from '@/hooks/use-modal-scroll-lock'
import { X, DollarSign, Link as LinkIcon, SkipForward } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Database } from '@/types/database'

type MaintenanceRequest = Omit<
  Database['public']['Tables']['maintenance_requests']['Row'],
  'tenant_id'
> & {
  tenant_id: string | null
  property?: { id: string; name: string } | null
}

interface WorkOrderExpensePromptProps {
  workOrder: MaintenanceRequest
  onClose: () => void
  onCreateOneTime?: () => void
  onCreateRecurring?: () => void
  onLinkExisting?: () => void
}

export function WorkOrderExpensePrompt({
  workOrder,
  onClose,
  onCreateOneTime,
  onCreateRecurring,
  onLinkExisting,
}: WorkOrderExpensePromptProps) {
  const navigate = useNavigate()
  const cardSpring = createSpring('card')

  // Lock body scroll when modal is open (component is rendered)
  useModalScrollLock(true)

  const handleCreateOneTime = () => {
    onClose()
    if (onCreateOneTime) {
      onCreateOneTime()
    } else {
      // Navigate to finances with pre-filled expense form
      navigate(
        `/landlord/finances?createExpense=one-time&workOrderId=${workOrder.id}&propertyId=${workOrder.property_id}`
      )
    }
  }

  const handleCreateRecurring = () => {
    onClose()
    if (onCreateRecurring) {
      onCreateRecurring()
    } else {
      // Navigate to finances with pre-filled recurring expense form
      navigate(
        `/landlord/finances?createExpense=recurring&workOrderId=${workOrder.id}&propertyId=${workOrder.property_id}`
      )
    }
  }

  const handleLinkExisting = () => {
    onClose()
    if (onLinkExisting) {
      onLinkExisting()
    } else {
      // Navigate to finances to link expense
      navigate(`/landlord/finances?linkExpense&workOrderId=${workOrder.id}`)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: motionTokens.duration.fast,
            ease: motionTokens.easing.standard,
          }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{
            type: 'spring',
            ...cardSpring,
          }}
          className="relative z-10 w-full max-w-md"
        >
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Record Cost?</CardTitle>
                  <CardDescription className="mt-1">
                    Work order for {workOrder.property?.name || 'property'} has been completed.
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="default"
                className="w-full justify-start"
                onClick={handleCreateOneTime}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Create one-time expense
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleCreateRecurring}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Create recurring expense
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleLinkExisting}
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Link to existing expense
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground"
                onClick={onClose}
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Skip
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
