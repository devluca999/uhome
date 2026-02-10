import { type ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { motionTokens } from '@/lib/motion'

interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function SettingsSection({ title, description, children, className }: SettingsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: motionTokens.opacity.hidden, y: 4 }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      transition={{
        duration: motionTokens.duration.fast,
        ease: motionTokens.easing.standard,
      }}
      className={className}
    >
      <Card className="glass-card !max-h-none overflow-visible">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </motion.div>
  )
}
