import { memo, useMemo } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/theme-context'
import { Button } from './button'
import { motion } from 'framer-motion'
import { createSpring, useReducedMotion } from '@/lib/motion'

export const ThemeToggle = memo(function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const buttonSpring = useMemo(() => createSpring('button'), [])
  const prefersReducedMotion = useReducedMotion()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <motion.div
        initial={false}
        animate={prefersReducedMotion ? {} : { rotate: theme === 'dark' ? 0 : 180 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : {
                type: 'spring',
                ...buttonSpring,
              }
        }
        layout={false}
        className="relative w-5 h-5 will-change-transform"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </motion.div>
    </Button>
  )
})
