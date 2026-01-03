import { useMemo } from 'react'
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { useTheme } from '@/contexts/theme-context'
import { motion } from 'framer-motion'
import { motion as motionTokens, durationToSeconds } from '@/lib/motion'

interface PieChartData {
  name: string
  value: number
  color: string
}

interface PieChartProps {
  data: PieChartData[]
  className?: string
}

export function PieChart({ data, className }: PieChartProps) {
  const { theme } = useTheme()
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  const textColor = theme === 'dark' ? '#F5F6F8' : '#111318'

  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + item.value, 0)
  }, [data])

  const formattedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0',
    }))
  }, [data, total])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg z-50">
          <p className="text-sm font-semibold text-foreground mb-1">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            ${data.value.toLocaleString()} ({data.percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: motionTokens.opacity.hidden }}
      animate={{ opacity: motionTokens.opacity.visible }}
      transition={{
        duration: prefersReducedMotion ? 0 : durationToSeconds(motionTokens.duration.base),
        ease: motionTokens.ease.standard,
      }}
    >
      <ResponsiveContainer width="100%" height={300}>
        <RechartsPieChart>
          <Pie
            data={formattedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            animationDuration={prefersReducedMotion ? 0 : 800}
            animationBegin={0}
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: textColor }} iconType="circle" />
        </RechartsPieChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
