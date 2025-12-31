import { cn } from '@/lib/utils'

interface MatteLayerProps {
  className?: string
  intensity?: 'subtle' | 'medium' | 'strong'
}

/**
 * MatteLayer - Gradient overlay using CSS variables
 * Optimized: No theme dependency, uses CSS variables for opacity
 */
export function MatteLayer({ className, intensity = 'subtle' }: MatteLayerProps) {
  const intensityClass = `matte-${intensity}`

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 z-0', intensityClass, className)}
      aria-hidden="true"
    />
  )
}
