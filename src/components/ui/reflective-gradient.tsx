import { cn } from '@/lib/utils'

interface ReflectiveGradientProps {
  className?: string
  intensity?: 'subtle' | 'medium'
}

/**
 * ReflectiveGradient - Top gradient overlay using CSS variables
 * Optimized: No theme dependency, uses CSS variables for opacity
 */
export function ReflectiveGradient({ className, intensity = 'medium' }: ReflectiveGradientProps) {
  const intensityClass = `reflective-${intensity}`

  return (
    <div
      className={cn(
        'pointer-events-none absolute top-0 left-0 right-0 h-1/3 z-10 rounded-t-xl',
        intensityClass,
        className
      )}
      aria-hidden="true"
    />
  )
}
