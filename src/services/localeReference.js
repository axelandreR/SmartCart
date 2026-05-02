/**
 * Locale reference service
 * Fetches ref_countries, ref_currencies and ref_country_currencies from Supabase.
 * Falls back to embedded static data if Supabase is unreachable (e.g. cold start).
 *
 * Data is cached in memory for the lifetime of the session — these tables
 * never change at runtime, so a single fetch per boot is enough.
 * To add a country/currency: INSERT into the ref_* tables; no code deploy needed.
 */
import supabase from './supabase'

// ─── In-memory cache (module-level singleton) ─────────────────────────────────
let _cache = null

// ─── Static fallback (used when Supabase is unreachable) ─────────────────────
const FALLBACK_CURRENCIES = [
  { code: 'PEN', name: 'Sol peruano',          symbol: 'S/',  locale: 'es-PE' },
  { code: 'ARS', name: 'Peso argentino',        symbol: '$',   locale: 'es-AR' },
  { code: 'MXN', name: 'Peso mexicano',         symbol: '$',   locale: 'es-MX' },
  { code: 'CLP', name: 'Peso chileno',          symbol: '$',   locale: 'es-CL' },
  { code: 'COP', name: 'Peso colombiano',       symbol: '$',   locale: 'es-CO' },
  { code: 'USD', name: 'Dólar estadounidense',  symbol: '$',   locale: 'en-US' },
  { code: 'BOB', name: 'Boliviano',             symbol: 'Bs',  locale: 'es-BO' },
  { code: 'UYU', name: 'Peso uruguayo',         symbol: '$',   locale: 'es-UY' },
  { code: 'EUR', name: 'Euro',                  symbol: '€',   locale: 'es-ES' },
]
const FALLBACK_COUNTRIES = [
  { code: 'PE', name: 'Perú',       flag_emoji: '🇵🇪', default_currency: 'PEN', off_tag: 'en:peru'      },
  { code: 'AR', name: 'Argentina',  flag_emoji: '🇦🇷', default_currency: 'ARS', off_tag: 'en:argentina' },
  { code: 'MX', name: 'México',     flag_emoji: '🇲🇽', default_currency: 'MXN', off_tag: 'en:mexico'    },
  { code: 'CL', name: 'Chile',      flag_emoji: '🇨🇱', default_currency: 'CLP', off_tag: 'en:chile'     },
  { code: 'CO', name: 'Colombia',   flag_emoji: '🇨🇴', default_currency: 'COP', off_tag: 'en:colombia'  },
  { code: 'EC', name: 'Ecuador',    flag_emoji: '🇪🇨', default_currency: 'USD', off_tag: 'en:ecuador'   },
  { code: 'BO', name: 'Bolivia',    flag_emoji: '🇧🇴', default_currency: 'BOB', off_tag: 'en:bolivia'   },
  { code: 'UY', name: 'Uruguay',    flag_emoji: '🇺🇾', default_currency: 'UYU', off_tag: 'en:uruguay'   },
  { code: 'ES', name: 'España',     flag_emoji: '🇪🇸', default_currency: 'EUR', off_tag: 'en:spain'     },
]
const FALLBACK_LINKS = [
  { country_code: 'PE', currency_code: 'PEN', is_default: true  },
  { country_code: 'PE', currency_code: 'USD', is_default: false },
  { country_code: 'AR', currency_code: 'ARS', is_default: true  },
  { country_code: 'AR', currency_code: 'USD', is_default: false },
  { country_code: 'MX', currency_code: 'MXN', is_default: true  },
  { country_code: 'MX', currency_code: 'USD', is_default: false },
  { country_code: 'CL', currency_code: 'CLP', is_default: true  },
  { country_code: 'CO', currency_code: 'COP', is_default: true  },
  { country_code: 'EC', currency_code: 'USD', is_default: true  },
  { country_code: 'BO', currency_code: 'BOB', is_default: true  },
  { country_code: 'UY', currency_code: 'UYU', is_default: true  },
  { country_code: 'ES', currency_code: 'EUR', is_default: true  },
]

/**
 * @typedef {{ code: string, name: string, symbol: string, locale: string }} Currency
 * @typedef {{ code: string, name: string, flag_emoji: string, default_currency: string, off_tag: string }} Country
 * @typedef {{ country_code: string, currency_code: string, is_default: boolean }} CountryCurrency
 * @typedef {{ countries: Country[], currencies: Currency[], countryMap: Record<string,Country>, currencyMap: Record<string,Currency>, currenciesForCountry: (code:string) => Currency[] }} LocaleReference
 */

/** Build the reference object from raw arrays */
function buildRef(countries, currencies, links) {
  const countryMap  = Object.fromEntries(countries.map((c) => [c.code, c]))
  const currencyMap = Object.fromEntries(currencies.map((c) => [c.code, c]))
  const byCurrency  = {}
  links.forEach(({ country_code, currency_code, is_default }) => {
    if (!byCurrency[country_code]) byCurrency[country_code] = []
    byCurrency[country_code].push({ currency_code, is_default })
  })
  function currenciesForCountry(countryCode) {
    return (byCurrency[countryCode] ?? [])
      .sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0))
      .map(({ currency_code }) => currencyMap[currency_code])
      .filter(Boolean)
  }
  return { countries, currencies, countryMap, currencyMap, currenciesForCountry }
}

/**
 * Load and cache locale reference data.
 * Falls back to embedded static data if Supabase is unreachable or slow.
 * @returns {Promise<LocaleReference>}
 */
export async function getLocaleReference() {
  if (_cache) return _cache

  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000)
    )
    const fetch = Promise.all([
      supabase.from('ref_countries').select('*').order('name'),
      supabase.from('ref_currencies').select('*').order('name'),
      supabase.from('ref_country_currencies').select('*'),
    ])

    const [
      { data: countries, error: e1 },
      { data: currencies, error: e2 },
      { data: links, error: e3 },
    ] = await Promise.race([fetch, timeout.then(() => { throw new Error('timeout') })])

    if (e1 || e2 || e3) throw e1 ?? e2 ?? e3

    _cache = buildRef(countries, currencies, links)
  } catch (err) {
    console.warn('[localeReference] using static fallback —', err.message)
    _cache = buildRef(FALLBACK_COUNTRIES, FALLBACK_CURRENCIES, FALLBACK_LINKS)
  }

  return _cache
}

/** Clear the cache — useful for testing or after an admin data update. */
export function clearLocaleCache() {
  _cache = null
}
