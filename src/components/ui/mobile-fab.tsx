import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/haptics'
import { useIsMobile } from '@/hooks/use-is-mobile'

interface MobileFabProps {
  onClick: () => void
  label?: string
  className?: string
}

export function MobileFab({ onClick, label, className }: MobileFabProps) {
  const isMobile = useIsMobile()
  if (!isMobile) return null
  return (
    <button
      type="button"
      aria-label={label ?? 'Add'}
      onClick={() => {
        haptic.medium()
        onClick()
      }}
      className={cn(
        'fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full',
        'bg-primary text-primary-foreground shadow-lg shadow-primary/40',
        'flex items-center justify-center',
        className
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <Plus className="w-6 h-6" />
    </button>
  )
}
