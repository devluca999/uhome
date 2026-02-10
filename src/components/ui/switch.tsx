import { forwardRef } from 'react'
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
          'relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-[#34C759]' : 'bg-[#e9e9eb] dark:bg-[#3a3a3c]',
          className
        )}
      >
        <span
          className={cn(
            'inline-block h-6 w-6 shrink-0 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-200 ease-out',
            checked ? 'translate-x-7' : 'translate-x-1'
          )}
        />
      </button>
    )
  }
)

Switch.displayName = 'Switch'
