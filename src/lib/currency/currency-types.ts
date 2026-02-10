/**
 * Currency Types and Definitions
 */

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CNY' | 'INR' | 'MXN' | 'BRL'

export interface CurrencyConfig {
  code: CurrencyCode
  symbol: string
  name: string
  locale: string
  decimalPlaces: number
  symbolPosition: 'before' | 'after'
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
    decimalPlaces: 2,
    symbolPosition: 'after',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    locale: 'en-CA',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    locale: 'en-AU',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    locale: 'ja-JP',
    decimalPlaces: 0,
    symbolPosition: 'before',
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    locale: 'zh-CN',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    locale: 'en-IN',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  MXN: {
    code: 'MXN',
    symbol: 'Mex$',
    name: 'Mexican Peso',
    locale: 'es-MX',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Brazilian Real',
    locale: 'pt-BR',
    decimalPlaces: 2,
    symbolPosition: 'before',
  },
}

/**
 * Get currency configuration by code
 */
export function getCurrencyConfig(code: CurrencyCode): CurrencyConfig {
  return CURRENCIES[code] || CURRENCIES.USD
}
