import { useState, useCallback } from 'react'
import { productsService } from '@/services/products'
import { lookupBarcode } from '@/services/barcodeScanner'

/**
 * Resolves a barcode to product metadata using a two-step strategy:
 *
 *   1. Supabase `products` table (user's own scan history) — fast, offline-capable.
 *   2. Open Food Facts public API — global product database, no auth required.
 *
 * This is intentionally read-only: it does NOT write to Supabase.
 * Product creation happens in the Scanner flow when the user records a price.
 *
 * @returns {{
 *   loading: boolean,
 *   result: ProductLookupResult | null,
 *   error: string | null,
 *   lookup: (barcode: string) => Promise<void>,
 *   clear: () => void,
 * }}
 *
 * @typedef {{
 *   barcode: string,
 *   name: string,
 *   brand: string,
 *   category: string,
 *   imageUrl: string,
 *   nutriScore: string | null,
 *   lastPrice: number | null,   // from Supabase record, null if not found locally
 *   source: 'local' | 'openfoodfacts',
 * }} ProductLookupResult
 */
export function useProductLookup() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const lookup = useCallback(async (barcode) => {
    const trimmed = barcode?.trim()
    if (!trimmed) return

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      // ── Step 1: Supabase local record ──────────────────────────────────────
      const local = await productsService.getByBarcode(trimmed)
      if (local) {
        setResult({
          barcode:    local.barcode,
          name:       local.name,
          brand:      local.brand ?? '',
          category:   local.category ?? '',
          imageUrl:   local.image_url ?? '',
          nutriScore: local.nutri_score ?? null,
          lastPrice:  local.last_price ?? null,
          source:     'local',
        })
        return
      }

      // ── Step 2: Open Food Facts ────────────────────────────────────────────
      const off = await lookupBarcode(trimmed)
      if (off) {
        setResult({
          barcode:    off.barcode,
          name:       off.name,
          brand:      off.brand,
          category:   off.category,
          imageUrl:   off.imageUrl,
          nutriScore: off.nutriScore,
          lastPrice:  null,   // OFF doesn't have price data
          source:     'openfoodfacts',
        })
        return
      }

      // ── Not found anywhere ─────────────────────────────────────────────────
      setError('Producto no encontrado. Podés ingresarlo manualmente.')
    } catch (err) {
      console.error('[useProductLookup]', err)
      setError('Error al buscar el producto. Verificá tu conexión.')
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setResult(null)
    setError(null)
    setLoading(false)
  }, [])

  return { loading, result, error, lookup, clear }
}
