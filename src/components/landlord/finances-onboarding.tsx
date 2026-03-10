import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface Tooltip {
  id: string
  target: string // CSS selector or ref identifier
  title: string
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const TOOLTIPS: Tooltip[] = [
  {
    id: 'page-filters',
    target: '[data-onboarding="filter-bar"]',
    title: 'Page-Level Filters',
    content: 'These filters control all financial data on the page - graph, ledger, and expenses.',
    position: 'bottom',
  },
  {
    id: 'view-modes',
    target: '[data-onboarding="view-modes"]',
    title: 'View Modes',
    content:
      'Switch between Chart and Timeline views to see your financial data from different perspectives.',
    position: 'bottom',
  },
  {
    id: 'expand-icon',
    target: '[data-onboarding="expand-icon"]',
    title: 'Expand for Full Screen',
    content: 'Click the expand icon (⤢) to open a full-screen analytics view for deeper analysis.',
    position: 'left',
  },
]

interface FinancesOnboardingProps {
  className?: string
}

/**
 * Finances Onboarding Component
 *
 * Lightweight, non-blocking onboarding tooltips for first-time visitors.
 * Shows up to 3 dismissible tooltips explaining key features.
 *
 * Behavior:
 * - Non-blocking (tooltips don't prevent interaction)
 * - Dismissible
 * - Dismissed tooltips stored in localStorage (never reappear)
 * - Show only on first visit to Finances page
 */
export function FinancesOnboarding({ className }: FinancesOnboardingProps) {
  const [currentTooltipIndex, setCurrentTooltipIndex] = useState<number | null>(null)
  const [dismissedTooltips, setDismissedTooltips] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Check localStorage for dismissed tooltips
    const stored = localStorage.getItem('finances-onboarding-dismissed')
    let dismissedSet = new Set<string>()
    if (stored) {
      try {
        const dismissed = JSON.parse(stored) as string[]
        dismissedSet = new Set(dismissed)
        setDismissedTooltips(dismissedSet)
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    // Find first non-dismissed tooltip
    const firstVisibleIndex = TOOLTIPS.findIndex(t => !dismissedSet.has(t.id))
    if (firstVisibleIndex !== -1) {
      // Small delay to ensure target elements are rendered
      setTimeout(() => {
        setCurrentTooltipIndex(firstVisibleIndex)
      }, 500)
    }
  }, [])

  const handleDismiss = (tooltipId: string) => {
    const newDismissed = new Set(dismissedTooltips)
    newDismissed.add(tooltipId)
    setDismissedTooltips(newDismissed)
    localStorage.setItem('finances-onboarding-dismissed', JSON.stringify(Array.from(newDismissed)))

    // Show next tooltip if available
    const nextIndex = TOOLTIPS.findIndex(
      (t, idx) => idx > currentTooltipIndex! && !newDismissed.has(t.id)
    )
    if (nextIndex !== -1) {
      setCurrentTooltipIndex(nextIndex)
    } else {
      setCurrentTooltipIndex(null)
    }
  }

  const handleNext = () => {
    if (currentTooltipIndex === null) return

    const currentTooltip = TOOLTIPS[currentTooltipIndex]
    handleDismiss(currentTooltip.id)
  }

  if (currentTooltipIndex === null) return null

  const currentTooltip = TOOLTIPS[currentTooltipIndex]
  const targetElement = document.querySelector(currentTooltip.target)

  if (!targetElement) {
    // Target not found, skip this tooltip
    handleDismiss(currentTooltip.id)
    return null
  }

  const rect = targetElement.getBoundingClientRect()
  const scrollY = window.scrollY
  const scrollX = window.scrollX

  // Calculate position based on tooltip position preference
  let top = 0
  let left = 0

  switch (currentTooltip.position) {
    case 'bottom':
      top = rect.bottom + scrollY + 8
      left = rect.left + scrollX + rect.width / 2
      break
    case 'top':
      top = rect.top + scrollY - 8
      left = rect.left + scrollX + rect.width / 2
      break
    case 'left':
      top = rect.top + scrollY + rect.height / 2
      left = rect.left + scrollX - 8
      break
    case 'right':
      top = rect.top + scrollY + rect.height / 2
      left = rect.right + scrollX + 8
      break
    default:
      top = rect.bottom + scrollY + 8
      left = rect.left + scrollX + rect.width / 2
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{
          duration: durationToSeconds(motionTokens.duration.fast),
          ease: motionTokens.easing.standard,
        }}
        className={cn(
          'fixed z-50 w-64 p-4 rounded-lg glass-card',
          className
        )}
        style={{
          top: `${top}px`,
          left: `${left}px`,
          transform: 'translateX(-50%)',
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-semibold text-sm">{currentTooltip.title}</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDismiss(currentTooltip.id)}
            className="h-6 w-6 p-0"
            aria-label="Dismiss tooltip"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{currentTooltip.content}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {currentTooltipIndex + 1} of {TOOLTIPS.length}
          </span>
          <Button variant="outline" size="sm" onClick={handleNext} className="h-7 px-3 text-xs">
            {currentTooltipIndex < TOOLTIPS.length - 1 ? 'Next' : 'Got it'}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
