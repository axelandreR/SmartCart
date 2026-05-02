import { useState, useEffect } from 'react'
import { productsService } from '@/services/products'

/**
 * Debounced product name autocomplete against the user's own products table.
 * Returns up to 5 matches sorted by name.
 *
 * @param {string} query - current text in the name field
 * @returns {{ suggestions: Array<{id,name,brand,last_price,unit}>, loading: boolean }}
 */
export function useProductAutocomplete(query) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const trimmed = query?.trim() ?? ''
    if (trimmed.length < 2) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await productsService.search(trimmed)
        setSuggestions(results.slice(0, 5))
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  return { suggestions, loading }
}
