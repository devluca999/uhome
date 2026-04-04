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
import { useIsMobile } from '@/hooks/use-is-mobile'
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
  const isMobile = useIsMobile()
  const { theme } = useTheme()
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  const textColor = theme === 'dark' ? '#F5F6F8' : '#111318'
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  const barColor = theme === 'dark' ? '#84A98C' : '#84A98C'

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg z-50">
          <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
          <p className="text-sm font-medium text-foreground">${Number(value).toLocaleString()}</p>
        </div>
      )
    }
    return null
  }

  // Create a key based on data to trigger re-animation when data changes
  const dataKey = JSON.stringify(data.map(d => ({ month: d.month, amount: d.amount })))

  return (
    <motion.div
      key={dataKey}
      className={className}
      initial={{ opacity: motionTokens.opacity.hidden }}
      animate={{ opacity: motionTokens.opacity.visible }}
      transition={{
        duration: prefersReducedMotion ? 0 : durationToSeconds(motionTokens.duration.base),
        ease: motionTokens.ease.standard,
      }}
    >
      <ResponsiveContainer
        width="100%"
        aspect={isMobile ? 2 : undefined}
        height={isMobile ? undefined : 300}
      >
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
