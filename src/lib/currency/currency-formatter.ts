/**
 * Centralized Currency Formatting Utility
 * 
 * Provides consistent currency formatting throughout the application.
 * Respects user's currency preference from settings.
 */

import type { CurrencyCode } from './currency-types'
import { getCurrencyConfig } from './currency-types'

export interface CurrencyFormatOptions {
  includeCents?: boolean
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

/**
 * Format a number as currency
 * 
 * @param value - The numeric value to format
 * @param currency - The currency code (defaults to USD)
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  currency: CurrencyCode = 'USD',
  options: CurrencyFormatOptions = {}
): string {
  const config = getCurrencyConfig(currency)
  const {
    includeCents = false,
    minimumFractionDigits = includeCents ? config.decimalPlaces : 0,
    maximumFractionDigits = includeCents ? config.decimalPlaces : 0,
  } = options

  // Format the number using locale
  const formattedNumber = Math.abs(value).toLocaleString(config.locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  })

  // Add currency symbol based on position
  if (config.symbolPosition === 'before') {
    return `${config.symbol}${formattedNumber}`
  } else {
    return `${formattedNumber} ${config.symbol}`
  }
}

/**
 * Format currency with cents (always shows decimal places)
 */
export function formatCurrencyWithCents(
  value: number,
  currency: CurrencyCode = 'USD'
): string {
  return formatCurrency(value, currency, { includeCents: true })
}

/**
 * Format currency without cents (no decimal places)
 */
export function formatCurrencyWithoutCents(
  value: number,
  currency: CurrencyCode = 'USD'
): string {
  return formatCurrency(value, currency, { includeCents: false })
}
