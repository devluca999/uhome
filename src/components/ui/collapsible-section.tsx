import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { motionTokens, durationToSeconds, createSpring } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  id: string // Unique ID for localStorage key
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  showCriticalAlerts?: boolean
  criticalAlerts?: React.ReactNode
  className?: string
  headerClassName?: string
}

/**
 * Collapsible Section Component
 *
 * Global pattern for collapsible sections with localStorage persistence.
 * Collapsible indicator (chevron) appears in front of section header.
 *
 * Usage:
 * - Provide unique ID for localStorage persistence
 * - Default expanded state can be overridden
 * - Critical alerts remain visible when collapsed
 */
export function CollapsibleSection({
  id,
  title,
  children,
  defaultExpanded = true,
  showCriticalAlerts = false,
  criticalAlerts,
  className,
  headerClassName,
}: CollapsibleSectionProps) {
  const storageKey = `collapsible-section-${id}`
  const cardSpring = createSpring('card')

  // Load initial state from localStorage or use default
  const [isExpanded, setIsExpanded] = useState(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored !== null) {
      return stored === 'true'
    }
    return defaultExpanded
  })

  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(storageKey, String(isExpanded))
  }, [isExpanded, storageKey])

  const toggle = () => {
    setIsExpanded(prev => !prev)
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Header with collapsible indicator */}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'flex items-center gap-2 w-full text-left',
          'hover:bg-muted/50 rounded-md p-2 -ml-2 transition-colors',
          headerClassName
        )}
        aria-expanded={isExpanded}
        aria-controls={`collapsible-content-${id}`}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 0 : -90 }}
          transition={{
            duration: durationToSeconds(motionTokens.duration.fast),
            ease: motionTokens.easing.standard,
          }}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </motion.div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </button>

      {/* Critical alerts (always visible) */}
      {showCriticalAlerts && criticalAlerts && <div className="mt-2">{criticalAlerts}</div>}

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={`collapsible-content-${id}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              type: 'spring',
              ...cardSpring,
            }}
            style={{ overflow: 'hidden' }}
          >
            <div className="mt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
