import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Format a price in a given currency and locale.
 * Defaults to Peruvian Sol — the primary target market.
 *
 * For locale-aware formatting that reads from the user's profile,
 * use useLocale().formatPrice(amount) instead.
 *
 * @param {number} amount
 * @param {string} [currency='PEN'] ISO 4217 currency code
 * @param {string} [locale='es-PE'] BCP 47 locale string
 */
export function formatPrice(amount, currency = 'PEN', locale = 'es-PE') {
  return new Intl.NumberFormat(locale, {
    style:                 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount ?? 0)
}

/** Format a date as a readable string */
export function formatDate(dateStr, fmt = 'dd MMM yyyy') {
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(date, fmt, { locale: es })
  } catch {
    return dateStr
  }
}

/** Relative time (e.g. "hace 2 horas") */
export function formatRelative(dateStr) {
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return formatDistanceToNow(date, { addSuffix: true, locale: es })
  } catch {
    return dateStr
  }
}

/** Capitalize first letter */
export function capitalize(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/** Shorten long text */
export function truncate(str = '', maxLength = 30) {
  return str.length > maxLength ? str.slice(0, maxLength - 1) + '…' : str
}

/** Calculate price variance between two values */
export function priceVariance(current, previous) {
  if (!previous || previous === 0) return null
  const pct = ((current - previous) / previous) * 100
  return { value: pct, increased: pct > 0 }
}

/** Format a percentage */
export function formatPercent(value, decimals = 1) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}
