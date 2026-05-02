/**
 * Barcode scanner service
 * Wraps html5-qrcode for camera-based scanning.
 */
import { Html5Qrcode } from 'html5-qrcode'

let scanner = null

const SUPPORTED_FORMATS = [
  /* html5-qrcode format codes */
  0,  // QR_CODE
  1,  // AZTEC
  2,  // CODABAR
  3,  // CODE_39
  4,  // CODE_93
  5,  // CODE_128
  6,  // DATA_MATRIX
  7,  // MAXICODE
  8,  // ITF
  9,  // EAN_13
  10, // EAN_8
  11, // PDF_417
  12, // RSS_14
  13, // RSS_EXPANDED
  14, // UPC_A
  15, // UPC_E
  16, // UPC_EAN_EXTENSION
]

/**
 * Start scanning in the given HTML element id.
 * @param {string} elementId - id of the div where the viewfinder renders
 * @param {(barcode: string) => void} onSuccess
 * @param {(error: string) => void} onError
 */
export async function startScanner(elementId, onSuccess, onError) {
  if (scanner) await stopScanner()

  scanner = new Html5Qrcode(elementId, { verbose: false })

  const config = {
    fps: 15,
    qrbox: { width: 280, height: 180 },
    aspectRatio: 1.4,
    formatsToSupport: SUPPORTED_FORMATS,
  }

  await scanner.start(
    { facingMode: 'environment' },
    config,
    (decodedText) => onSuccess(decodedText),
    (errorMessage) => {
      // Suppress continuous not-found errors
      if (!errorMessage.includes('NotFoundException')) {
        onError?.(errorMessage)
      }
    }
  )
}

export async function stopScanner() {
  if (scanner) {
    try {
      await scanner.stop()
      scanner.clear()
    } catch (_) {
      // already stopped
    }
    scanner = null
  }
}

/**
 * Toggle the camera torch (flash).
 * @param {boolean} on
 * @returns {Promise<boolean>} true if supported and applied
 */
export async function toggleTorch(on) {
  if (!scanner) return false
  try {
    await scanner.applyVideoConstraints({ advanced: [{ torch: on }] })
    return true
  } catch {
    return false
  }
}

/** Check if the browser supports camera access */
export function isCameraSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

/** Request camera permission explicitly */
export async function requestCameraPermission() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
  stream.getTracks().forEach((t) => t.stop())
  return true
}

/**
 * Search Open Food Facts by product name.
 * Prefers Argentine products; returns up to `limit` results.
 * @param {string} query
 * @param {{ limit?: number, countryTag?: string }} [options]
 * @returns {Promise<Array<{name,brand,category,imageUrl,nutriScore,quantity}>>}
 */
export async function searchProductsByName(query, { limit = 20, countryTag = 'en:peru' } = {}) {
  if (!query?.trim()) return []
  try {
    const url = new URL('https://world.openfoodfacts.org/api/v2/search')
    url.searchParams.set('search_terms', query.trim())
    url.searchParams.set('fields', 'product_name,product_name_es,brands,categories_tags,image_front_small_url,nutriscore_grade,quantity,code')
    url.searchParams.set('page_size', String(limit))
    url.searchParams.set('countries_tags', countryTag)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json()

    return (data.products ?? [])
      .map((p) => ({
        barcode:    p.code        || null,
        name:       p.product_name_es || p.product_name || '',
        brand:      p.brands      || '',
        category:   p.categories_tags?.[0]?.replace(/^[a-z]{2}:/, '') || '',
        imageUrl:   p.image_front_small_url || '',
        nutriScore: p.nutriscore_grade?.toUpperCase() || null,
        quantity:   p.quantity    || '',
      }))
      .filter((p) => p.name.trim())
  } catch {
    return []
  }
}

/**
 * Look up product info from Open Food Facts by barcode.
 * Returns null if not found or network fails.
 * @param {string} barcode
 * @returns {Promise<{barcode,name,brand,category,imageUrl,nutriScore,ingredients,quantity}|null>}
 */
export async function lookupBarcode(barcode) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,product_name_es,brands,categories_tags,image_front_small_url,nutriscore_grade,ingredients_text_es,quantity`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 1) return null
    const p = data.product
    return {
      barcode,
      name: p.product_name_es || p.product_name || '',
      brand: p.brands || '',
      category: p.categories_tags?.[0]?.replace(/^[a-z]{2}:/, '') || '',
      imageUrl: p.image_front_small_url || '',
      nutriScore: p.nutriscore_grade?.toUpperCase() || null,
      ingredients: p.ingredients_text_es || '',
      quantity: p.quantity || '',
    }
  } catch {
    return null
  }
}
