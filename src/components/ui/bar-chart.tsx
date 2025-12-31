import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useTheme } from '@/contexts/theme-context'
import { motion } from 'framer-motion'
import { motion as motionTokens, durationToSeconds } from '@/lib/motion'

interface BarChartData {
  month: string
  amount: number
}

interface BarChartProps {
  data: BarChartData[]
  className?: string
}

export function BarChart({ data, className }: BarChartProps) {
  const { theme } = useTheme()
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  const textColor = theme === 'dark' ? '#F5F6F8' : '#111318'
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  const barColor = theme === 'dark' ? '#84A98C' : '#84A98C'

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">${Number(value).toLocaleString()}</p>
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
        <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 12 }} stroke={gridColor} />
          <YAxis
            tick={{ fill: textColor, fontSize: 12 }}
            stroke={gridColor}
            tickFormatter={value => `$${value.toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="amount"
            fill={barColor}
            radius={[4, 4, 0, 0]}
            animationDuration={prefersReducedMotion ? 0 : 800}
            animationBegin={0}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
