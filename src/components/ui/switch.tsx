import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { motionTokens, createSpring, useReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
  'aria-label'?: string
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled = false, className, id, 'aria-label': ariaLabel }, ref) => {
    const prefersReducedMotion = useReducedMotion()
    const switchSpring = createSpring('soft')

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        id={id}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-muted',
          className
        )}
      >
        <motion.span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-background shadow-sm',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
          animate={{
            x: checked ? 24 : 4, // 6 * 4 = 24px, 1 * 4 = 4px
          }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  type: 'spring',
                  ...switchSpring,
                }
          }
        />
      </button>
    )
  }
)

Switch.displayName = 'Switch'
