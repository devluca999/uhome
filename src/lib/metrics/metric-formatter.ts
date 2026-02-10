/**
 * Type-Safe Metric Formatter
 * 
 * Prevents currency formatting from being applied to non-monetary metrics.
 * Uses the metric type system to ensure correct formatting.
 */

import { getMetricMetadata, isMonetaryMetric, isPercentageMetric, isCountMetric } from './metric-types'

export type MetricFormatter = (value: number, label: string) => string

/**
 * Format a metric value based on its type
 * 
 * @param value - The numeric value to format
 * @param label - The metric label (used to determine type)
 * @param currencyFormatter - Optional function to format currency (defaults to USD)
 * @returns Formatted string
 */
export function formatMetric(
  value: number,
  label: string,
  currencyFormatter?: (value: number) => string
): string {
  const metadata = getMetricMetadata(label)
  
  if (!metadata) {
    // Default to number formatting if unknown
    return Math.abs(value).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }
  
  switch (metadata.type) {
    case 'monetary':
      if (currencyFormatter) {
        return currencyFormatter(value)
      }
      // Default currency formatting
      return `$${Math.abs(value).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`
    
    case 'percentage':
      return `${Math.abs(value)}%`
    
    case 'count':
      return Math.abs(value).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    
    case 'ratio':
      return value.toFixed(2)
    
    default:
      return Math.abs(value).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
  }
}

/**
 * Create a formatter function for a specific metric label
 * 
 * @param label - The metric label
 * @param currencyFormatter - Optional function to format currency
 * @returns Formatter function
 */
export function createMetricFormatter(
  label: string,
  currencyFormatter?: (value: number) => string
): (value: number) => string {
  return (value: number) => formatMetric(value, label, currencyFormatter)
}

/**
 * Validate that a formatter is appropriate for a metric type
 * 
 * @param label - The metric label
 * @param formatter - The formatter function to validate
 * @returns true if formatter is appropriate, false otherwise
 */
export function validateFormatter(label: string, formatter: (value: number) => string): boolean {
  const testValue = 1000
  const formatted = formatter(testValue)
  
  if (isMonetaryMetric(label)) {
    // Monetary metrics should have currency symbol
    return formatted.includes('$') || formatted.includes('€') || formatted.includes('£')
  }
  
  if (isPercentageMetric(label)) {
    // Percentage metrics should have % symbol
    return formatted.includes('%')
  }
  
  if (isCountMetric(label)) {
    // Count metrics should NOT have currency symbol
    return !formatted.includes('$') && !formatted.includes('€') && !formatted.includes('£')
  }
  
  return true
}
