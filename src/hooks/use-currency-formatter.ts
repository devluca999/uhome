/**
 * Currency Formatter Hook
 * 
 * Automatically uses the user's currency preference from settings.
 */

import { useSettings } from '@/contexts/settings-context'
import { formatCurrencyWithCents, formatCurrencyWithoutCents } from '@/lib/currency/currency-formatter'
import type { CurrencyCode } from '@/lib/currency/currency-types'

export function useCurrencyFormatter() {
  const { settings } = useSettings()
  const currency = (settings.currency || 'USD') as CurrencyCode

  return {
    currency,
    format: (value: number, includeCents = false) =>
      includeCents
        ? formatCurrencyWithCents(value, currency)
        : formatCurrencyWithoutCents(value, currency),
    formatWithCents: (value: number) => formatCurrencyWithCents(value, currency),
    formatWithoutCents: (value: number) => formatCurrencyWithoutCents(value, currency),
  }
}
