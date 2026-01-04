import { useState } from 'react'
import { Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalIndicatorProps {
  className?: string
  onClick?: () => void
}

/**
 * Modal Indicator Component
 * 
 * Global pattern for indicating that a card opens a modal.
 * Shows a small expand icon (⤢) in the top-right corner.
 * 
 * Usage:
 * - Only add to cards that open modals
 * - Do not clutter non-interactive cards
 * - Hover increases opacity and shows tooltip
 */
export function ModalIndicator({ className, onClick }: ModalIndicatorProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'absolute top-3 right-3 z-10',
          'flex items-center justify-center',
          'w-6 h-6 rounded-md',
          'text-muted-foreground',
          'hover:text-foreground',
          'hover:bg-muted/50',
          'transition-all duration-200',
          'opacity-60 hover:opacity-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
        aria-label="Expand"
        title="Expand"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
      {/* Simple tooltip */}
      {isHovered && (
        <div className="absolute top-10 right-3 z-20 px-2 py-1 text-xs bg-popover text-popover-foreground rounded shadow-lg border border-border pointer-events-none whitespace-nowrap">
          Expand
        </div>
      )}
    </div>
  )
}

