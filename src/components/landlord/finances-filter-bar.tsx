import { motion } from 'framer-motion'
import { motionTokens, durationToSeconds } from '@/lib/motion'
import { cn } from '@/lib/utils'

export type TimePeriod = 'monthly' | 'quarterly' | 'yearly' | 'monthToDate' | 'yearToDate'

interface FinancesFilterBarProps {
  timePeriod: TimePeriod
  onTimePeriodChange: (period: TimePeriod) => void
  selectedPropertyId: string
  onPropertyChange: (propertyId: string) => void
  properties: Array<{ id: string; name: string }>
  className?: string
}

/**
 * Finances Filter Bar Component
 *
 * Page-level filter bar that controls ALL financial data on the finances page.
 * These two dropdowns (Time Period + Property) define the scope for:
 * - KPI strip values
 * - Ledger entries
 * - Interactive graph (default state)
 * - Breakdown views
 *
 * Filters:
 * - Time Period: Monthly, Quarterly, Yearly, Month to Date, Year to Date
 * - Property: All properties or specific property
 */
export function FinancesFilterBar({
  timePeriod,
  onTimePeriodChange,
  selectedPropertyId,
  onPropertyChange,
  properties,
  className,
}: FinancesFilterBarProps) {
  return (
    <motion.div
      initial={{ opacity: motionTokens.opacity.hidden, y: motionTokens.translate.y }}
      animate={{ opacity: motionTokens.opacity.visible, y: 0 }}
      transition={{
        duration: durationToSeconds(motionTokens.duration.base),
        ease: motionTokens.easing.standard,
      }}
      className={cn('mb-2', className)}
      data-onboarding="filter-bar"
    >
      {/* Compact filter bar - lightweight controls */}
      <div className="flex flex-wrap items-center gap-3 py-2">
        {/* Time Period */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground whitespace-nowrap">
            Time Period:
          </label>
          <select
            value={timePeriod}
            onChange={e => onTimePeriodChange(e.target.value as TimePeriod)}
            className="flex h-8 w-full min-w-[140px] rounded-md border border-input bg-background text-foreground px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="finances-time-period-select"
          >
            <option value="monthly" className="text-foreground">
              Monthly
            </option>
            <option value="quarterly" className="text-foreground">
              Quarterly
            </option>
            <option value="yearly" className="text-foreground">
              Yearly
            </option>
            <option value="monthToDate" className="text-foreground">
              Month to Date
            </option>
            <option value="yearToDate" className="text-foreground">
              Year to Date
            </option>
          </select>
        </div>

        {/* Property Filter */}
        {properties.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">
              Property:
            </label>
            <select
              value={selectedPropertyId}
              onChange={e => onPropertyChange(e.target.value)}
              className="flex h-8 w-full min-w-[140px] rounded-md border border-input bg-background text-foreground px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="finances-property-select"
            >
              <option value="" className="text-foreground">
                All Properties
              </option>
              {properties.map(prop => (
                <option key={prop.id} value={prop.id} className="text-foreground">
                  {prop.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </motion.div>
  )
}
