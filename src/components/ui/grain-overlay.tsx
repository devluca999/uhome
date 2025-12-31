import { cn } from '@/lib/utils'

interface GrainOverlayProps {
  className?: string
}

/**
 * GrainOverlay - Static texture overlay using CSS pseudo-element
 * Optimized: No theme dependency, uses CSS variables for opacity
 * Applied via ::before pseudo-element for better performance
 */
export function GrainOverlay({ className }: GrainOverlayProps) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 z-0 grain-texture', className)}
      aria-hidden="true"
    />
  )
}
