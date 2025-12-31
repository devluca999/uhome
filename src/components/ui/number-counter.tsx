import { useEffect, useMemo } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { createSpring } from '@/lib/motion'

interface NumberCounterProps {
  value: number
  className?: string
  format?: (value: number) => string
}

export function NumberCounter({
  value,
  className = '',
  format = v => Math.round(v).toString(),
}: NumberCounterProps) {
  const motionValue = useMotionValue(0)
  // Use card spring preset for consistency and performance
  const cardSpring = useMemo(() => createSpring('card'), [])
  const spring = useSpring(motionValue, cardSpring)
  const display = useTransform(spring, latest => format(latest))

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  return (
    <motion.span className={className} layout={false}>
      {display}
    </motion.span>
  )
}
