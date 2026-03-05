/**
 * Metric Type System
 *
 * Prevents currency formatting from being applied to non-monetary metrics.
 * Provides type safety to distinguish between monetary and non-monetary metrics.
 */

export type MetricType = 'monetary' | 'percentage' | 'count' | 'ratio'

export interface MetricMetadata {
  type: MetricType
  label: string
  unit?: string
}

/**
 * Metric type definitions for common metrics
 */
export const METRIC_TYPES: Record<string, MetricMetadata> = {
  // Monetary metrics
  'Total Collected': { type: 'monetary', label: 'Total Collected', unit: 'currency' },
  'Outstanding Rent': { type: 'monetary', label: 'Outstanding Rent', unit: 'currency' },
  'Total Expenses': { type: 'monetary', label: 'Total Expenses', unit: 'currency' },
  'Net Cash Flow': { type: 'monetary', label: 'Net Cash Flow', unit: 'currency' },
  'Net Income': { type: 'monetary', label: 'Net Income', unit: 'currency' },
  'Projected Net': { type: 'monetary', label: 'Projected Net', unit: 'currency' },
  'Monthly Revenue': { type: 'monetary', label: 'Monthly Revenue', unit: 'currency' },
  'Total Revenue': { type: 'monetary', label: 'Total Revenue', unit: 'currency' },

  // Percentage metrics
  'Occupancy Rate': { type: 'percentage', label: 'Occupancy Rate', unit: '%' },
  'Profit Margin': { type: 'percentage', label: 'Profit Margin', unit: '%' },
  'Collection Rate': { type: 'percentage', label: 'Collection Rate', unit: '%' },

  // Count metrics
  'Active Properties': { type: 'count', label: 'Active Properties', unit: 'count' },
  Properties: { type: 'count', label: 'Properties', unit: 'count' },
  Tenants: { type: 'count', label: 'Tenants', unit: 'count' },
  Occupancy: { type: 'count', label: 'Occupancy', unit: 'count' },
  'Work Orders': { type: 'count', label: 'Work Orders', unit: 'count' },
  Documents: { type: 'count', label: 'Documents', unit: 'count' },

  // Ratio metrics
  'Tenant to Property Ratio': { type: 'ratio', label: 'Tenant to Property Ratio', unit: 'ratio' },
}

/**
 * Get metric metadata by label
 */
export function getMetricMetadata(label: string): MetricMetadata | null {
  return METRIC_TYPES[label] || null
}

/**
 * Check if a metric is monetary
 */
export function isMonetaryMetric(label: string): boolean {
  const metadata = getMetricMetadata(label)
  return metadata?.type === 'monetary'
}

/**
 * Check if a metric is a percentage
 */
export function isPercentageMetric(label: string): boolean {
  const metadata = getMetricMetadata(label)
  return metadata?.type === 'percentage'
}

/**
 * Check if a metric is a count
 */
export function isCountMetric(label: string): boolean {
  const metadata = getMetricMetadata(label)
  return metadata?.type === 'count'
}
