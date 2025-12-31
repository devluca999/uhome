import { motion } from 'framer-motion'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface ThemePreviewProps {
  theme: 'light' | 'dark'
  selected?: boolean
  onClick?: () => void
  className?: string
}

export function ThemePreview({ theme, selected = false, onClick, className }: ThemePreviewProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        'relative h-20 w-32 rounded-lg border-2 overflow-hidden cursor-pointer transition-all',
        selected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50',
        className
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{
        duration: motionTokens.duration.fast,
        ease: motionTokens.easing.standard,
      }}
      aria-label={`${theme} theme preview`}
    >
      <div className={cn('absolute inset-0', theme === 'dark' ? 'bg-[#111318]' : 'bg-[#F5F5F5]')} />
      {/* Preview content */}
      <div className="absolute inset-0 p-2 flex flex-col gap-1">
        <div className={cn('h-2 rounded', theme === 'dark' ? 'bg-[#2A2D34]' : 'bg-white')} />
        <div
          className={cn('h-1.5 rounded w-3/4', theme === 'dark' ? 'bg-[#2A2D34]' : 'bg-white')}
        />
        <div
          className={cn('h-1.5 rounded w-1/2', theme === 'dark' ? 'bg-[#2A2D34]' : 'bg-white')}
        />
      </div>
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-1 right-1"
        >
          <div className="h-3 w-3 rounded-full bg-primary" />
        </motion.div>
      )}
    </motion.button>
  )
}
