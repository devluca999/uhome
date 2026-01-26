import { motion } from 'framer-motion'
import { motion as motionTokens, durationToSeconds } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface HeroGreetingProps {
  name: string
  className?: string
}

export function HeroGreeting({ name, className }: HeroGreetingProps) {
  const timeOfDay = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <motion.div
      className={cn('mb-8', className)}
      initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      transition={{
        duration: durationToSeconds(motionTokens.duration.base),
        ease: motionTokens.ease.standard,
      }}
    >
      <h1 className="text-4xl font-semibold text-foreground mb-2">
        {timeOfDay()}, {name}
      </h1>
      <p className="text-muted-foreground">Welcome back, {name}</p>
    </motion.div>
  )
}
