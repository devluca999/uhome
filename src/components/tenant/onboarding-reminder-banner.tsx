import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ClipboardList } from 'lucide-react'
import { motionTokens } from '@/lib/motion'
import type { PendingOnboarding } from '@/hooks/use-onboarding'

interface OnboardingReminderBannerProps {
  pending: PendingOnboarding
  onContinue: () => void
}

export function OnboardingReminderBanner({ pending, onContinue }: OnboardingReminderBannerProps) {
  if (!pending.hasPending) return null

  const { completed, total } = pending.progress
  const status = pending.submission?.status

  const message =
    status === 'reopened'
      ? 'Your landlord has asked you to revisit your move-in checklist.'
      : status === 'in_progress'
        ? `Complete your move-in checklist (${completed}/${total} items done)`
        : `You have a move-in checklist to complete (${total} items)`

  return (
    <motion.div
      initial={{ opacity: motionTokens.opacity.hidden, y: -8 }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      exit={{ opacity: motionTokens.opacity.hidden, y: -8 }}
      transition={{ duration: motionTokens.duration.normal }}
      className="mb-6 flex items-center justify-between gap-4 rounded-lg border-2 border-primary/20 bg-primary/5 px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <ClipboardList className="h-5 w-5 text-primary shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">{message}</p>
          {status === 'in_progress' && total > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(completed / total) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {Math.round((completed / total) * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
      <Button size="sm" onClick={onContinue}>
        {status === 'in_progress' || status === 'reopened' ? 'Continue' : 'Start'}
      </Button>
    </motion.div>
  )
}
