import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { useTheme } from '@/contexts/theme-context'
import { motion } from 'framer-motion'
import { motion as motionTokens, durationToSeconds } from '@/lib/motion'

export interface LineChartData {
  month: string
  income?: number
  expenses?: number
  net?: number
}

interface LineChartProps {
  data: LineChartData[]
  className?: string
  showIncome?: boolean
  showExpenses?: boolean
  showNet?: boolean
  curveType?: 'smooth' | 'sharp'
}

export function LineChart({
  data,
  className,
  showIncome = true,
  showExpenses = true,
  showNet = true,
  curveType = 'smooth',
}: LineChartProps) {
  const { theme } = useTheme()
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  const textColor = theme === 'dark' ? '#F5F6F8' : '#111318'
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'

  // Green for income, red for expenses, neutral for net
  const incomeColor = '#84A98C' // Green
  const expensesColor = '#ef4444' // Red
  const netColor = theme === 'dark' ? '#94a3b8' : '#64748b' // Neutral gray

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg z-50">
          <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.name}: ${Number(entry.value).toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Create a key based on data to trigger re-animation when data changes
  const dataKey = JSON.stringify(
    data.map(d => ({ month: d.month, income: d.income, expenses: d.expenses, net: d.net }))
  )

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
      <ResponsiveContainer width="100%" height={300}>
        <RechartsLineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 12 }} stroke={gridColor} />
          <YAxis
            tick={{ fill: textColor, fontSize: 12 }}
            stroke={gridColor}
            tickFormatter={value => `$${value.toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: textColor }} iconType="line" />
          {showIncome && (
            <Line
              type={curveType === 'smooth' ? 'monotone' : 'linear'}
              dataKey="income"
              name="Income"
              stroke={incomeColor}
              strokeWidth={2}
              dot={{ r: 4 }}
              animationDuration={prefersReducedMotion ? 0 : 800}
              animationBegin={0}
            />
          )}
          {showExpenses && (
            <Line
              type={curveType === 'smooth' ? 'monotone' : 'linear'}
              dataKey="expenses"
              name="Expenses"
              stroke={expensesColor}
              strokeWidth={2}
              dot={{ r: 4 }}
              animationDuration={prefersReducedMotion ? 0 : 800}
              animationBegin={0}
            />
          )}
          {showNet && (
            <Line
              type={curveType === 'smooth' ? 'monotone' : 'linear'}
              dataKey="net"
              name="Net"
              stroke={netColor}
              strokeWidth={2}
              dot={{ r: 4 }}
              animationDuration={prefersReducedMotion ? 0 : 800}
              animationBegin={0}
            />
          )}
        </RechartsLineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
