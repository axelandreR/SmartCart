/**
 * useLocale — locale-aware utilities derived from the user's profile settings.
 *
 * Returns:
 *   - formatPrice(amount)  locale + currency aware price formatter
 *   - country              ISO 3166-1 alpha-2 ('PE', 'AR', …)
 *   - currency             ISO 4217 ('PEN', 'USD', …)
 *   - locale               BCP 47 locale string ('es-PE', 'es-AR', …)
 *   - offTag               Open Food Facts country tag ('en:peru', …)
 *   - countryData          full Country object from ref_countries (or null)
 *   - currencyData         full Currency object from ref_currencies (or null)
 *
 * Falls back to PE / PEN / es-PE when the profile or ref data isn't loaded yet,
 * so every component always gets a valid formatter — no null checks needed.
 */
import { useCallback } from 'react'
import { useAuth } from '@/hooks/useSupabase'
import { useQuery } from '@/hooks/useSupabase'
import { getLocaleReference } from '@/services/localeReference'

// ─── Fallback constants (used before profile/ref data loads) ──────────────────
const FALLBACK_COUNTRY  = 'PE'
const FALLBACK_CURRENCY = 'PEN'
const FALLBACK_LOCALE   = 'es-PE'
const FALLBACK_OFF_TAG  = 'en:peru'

export function useLocale() {
  const { profile } = useAuth()

  // Load reference tables once (cached in-memory after first call)
  const { data: ref } = useQuery(() => getLocaleReference(), [])

  const country  = profile?.country  ?? FALLBACK_COUNTRY
  const currency = profile?.currency ?? FALLBACK_CURRENCY

  const countryData  = ref?.countryMap?.[country]  ?? null
  const currencyData = ref?.currencyMap?.[currency] ?? null

  // Prefer the locale from ref_currencies, fall back to ref_countries, then hardcoded default
  const locale = currencyData?.locale ?? countryData?.locale ?? FALLBACK_LOCALE
  const offTag = countryData?.off_tag ?? FALLBACK_OFF_TAG

  /**
   * Format a numeric amount as a currency string using the user's locale + currency.
   * Memoised so it's stable across renders unless currency/locale change.
   */
  const formatPrice = useCallback(
    (amount) =>
      new Intl.NumberFormat(locale, {
        style:                 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(amount ?? 0),
    [locale, currency]
  )

  return {
    formatPrice,
    country,
    currency,
    locale,
    offTag,
    countryData,
    currencyData,
  }
}
