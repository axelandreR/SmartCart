import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, Package, X, Plus, ChevronRight,
  Loader2, BookOpen, Globe,
} from 'lucide-react'
import PageHeader     from '@/components/layout/PageHeader'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Badge          from '@/components/ui/Badge'
import { productsService } from '@/services/products'
import { searchProductsByName, lookupBarcode } from '@/services/barcodeScanner'
import { listItemsService } from '@/services/shoppingLists'
import { useLocale } from '@/hooks/useLocale'
import { formatPrice } from '@/utils/formatters'
import { cn }         from '@/utils/cn'
import toast          from 'react-hot-toast'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BARCODE_RE = /^\d{8,14}$/

// ─── Result card ──────────────────────────────────────────────────────────────
function ResultCard({ item, listId, onAdded }) {
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)

  const handleAdd = async (e) => {
    e.stopPropagation()
    if (!listId) {
      toast('Seleccioná una lista desde el dashboard primero', { icon: 'ℹ️' })
      return
    }
    setAdding(true)
    try {
      await listItemsService.addItem(listId, {
        name:       item.name,
        product_id: item.localId ?? null,
        barcode:    item.barcode ?? null,
        price:      item.lastPrice ?? null,
        quantity:   1,
        unit:       'unid',
      })
      toast.success(`"${item.name}" agregado`)
      onAdded?.()
    } catch (err) {
      console.error('[ManualProductSearch] addItem:', err)
      toast.error('No se pudo agregar el producto')
    } finally {
      setAdding(false)
    }
  }

  const handleCardClick = () => {
    if (item.localId) {
      navigate(`/products/${item.localId}${listId ? `?listId=${listId}` : ''}`)
    }
  }

  return (
    <div
      role={item.localId ? 'button' : undefined}
      onClick={item.localId ? handleCardClick : undefined}
      className={cn(
        'flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-card',
        item.localId && 'cursor-pointer active:bg-gray-50 transition-colors'
      )}
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
        {item.imageUrl
          ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
          : <Package className="w-5 h-5 text-gray-300" />
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate leading-snug">
          {item.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {item.brand && (
            <span className="text-xs text-gray-400 truncate">{item.brand}</span>
          )}
          {item.lastPrice != null && (
            <span className="text-xs font-semibold text-primary-600">
              {formatPrice(item.lastPrice)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {item.source === 'local' && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-secondary-600 bg-secondary-50 px-1.5 py-0.5 rounded-full">
              <BookOpen className="w-2.5 h-2.5" /> Biblioteca
            </span>
          )}
          {item.source === 'openfoodfacts' && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
              <Globe className="w-2.5 h-2.5" /> Open Food Facts
            </span>
          )}
          {item.nutriScore && (
            <Badge
              variant={['A','B'].includes(item.nutriScore) ? 'success' : 'warning'}
              className="text-[10px]"
            >
              Nutri-Score {item.nutriScore}
            </Badge>
          )}
        </div>
      </div>

      {/* Add button */}
      <div className="flex items-center gap-1 shrink-0">
        {item.localId && !listId && (
          <ChevronRight className="w-4 h-4 text-gray-300" />
        )}
        {listId && (
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center text-white hover:bg-primary-600 active:bg-primary-700 transition-colors disabled:opacity-50"
            aria-label={`Agregar ${item.name}`}
          >
            {adding
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Plus className="w-4 h-4" strokeWidth={2.5} />
            }
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ManualProductSearch() {
  const navigate         = useNavigate()
  const [searchParams]   = useSearchParams()
  const listId           = searchParams.get('listId')
  const initialQuery     = searchParams.get('q') ?? ''
  const { offTag }       = useLocale()

  const [query,        setQuery]        = useState(initialQuery)
  const [localResults, setLocalResults] = useState([])
  const [offResults,   setOffResults]   = useState([])
  const [searching,    setSearching]    = useState(false)
  const [addedCount,   setAddedCount]   = useState(0)

  const abortRef = useRef(null)

  // ── Search function (debounced via useEffect) ─────────────────────────────
  const performSearch = useCallback(async (q) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setLocalResults([])
      setOffResults([])
      return
    }

    // Cancel any in-flight search
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setSearching(true)

    try {
      // Parallel: local DB + OFF
      const isBarcode = BARCODE_RE.test(trimmed)

      const [local, off] = await Promise.allSettled([
        // Local Supabase search
        isBarcode
          ? productsService.getByBarcode(trimmed).then((p) => (p ? [p] : []))
          : productsService.search(trimmed),

        // Open Food Facts
        isBarcode
          ? lookupBarcode(trimmed).then((p) => (p ? [p] : []))
          : searchProductsByName(trimmed, { limit: 15, countryTag: offTag }),
      ])

      const localData = local.status === 'fulfilled' ? (local.value ?? []) : []
      const offData   = off.status   === 'fulfilled' ? (off.value   ?? []) : []

      // Map local products to common shape
      const localMapped = localData.map((p) => ({
        localId:   p.id,
        barcode:   p.barcode,
        name:      p.name,
        brand:     p.brand ?? '',
        imageUrl:  p.image_url ?? '',
        lastPrice: p.last_price ?? null,
        nutriScore: p.nutri_score ?? null,
        source:    'local',
      }))

      // Map OFF results, skip duplicates already in local
      const localBarcodes = new Set(localData.map((p) => p.barcode).filter(Boolean))
      const offMapped = offData
        .filter((p) => !p.barcode || !localBarcodes.has(p.barcode))
        .map((p) => ({
          localId:   null,
          barcode:   p.barcode,
          name:      p.name,
          brand:     p.brand,
          imageUrl:  p.imageUrl,
          lastPrice: null,
          nutriScore: p.nutriScore,
          source:    'openfoodfacts',
        }))

      setLocalResults(localMapped)
      setOffResults(offMapped)
    } finally {
      setSearching(false)
    }
  }, [])

  // Debounce search: 400 ms
  useEffect(() => {
    if (!query.trim()) {
      setLocalResults([])
      setOffResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const timer = setTimeout(() => performSearch(query), 400)
    return () => clearTimeout(timer)
  }, [query, performSearch])

  // Run initial query from URL
  useEffect(() => {
    if (initialQuery) performSearch(initialQuery)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAdded = () => setAddedCount((c) => c + 1)

  const handleCreateCustom = () => {
    // Navigate to products page with the query prefilled
    // (full custom product creation flow is future work)
    navigate(`/products?q=${encodeURIComponent(query)}`)
  }

  const hasResults = localResults.length > 0 || offResults.length > 0
  const showEmpty  = !searching && query.trim().length >= 2 && !hasResults

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <PageHeader
        back
        title={listId ? 'Agregar producto' : 'Buscar producto'}
        subtitle={addedCount > 0 ? `${addedCount} agregado${addedCount !== 1 ? 's' : ''}` : undefined}
      />

      {/* ── Search input ─────────────────────────────────────────────────────── */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 sticky top-0 z-10">
        <div className="relative">
          {searching
            ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 animate-spin" />
            : <Search  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          }
          <input
            type="search"
            autoFocus
            placeholder="Código de barras o nombre del producto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-field pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {!query && (
          <p className="text-xs text-gray-400 mt-2 text-center">
            Busca por nombre, marca o código de barras
          </p>
        )}
      </div>

      {/* ── Results ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-4 pb-24 space-y-4 overflow-y-auto">

        {/* Initial state */}
        {!query && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">
                Buscá en tu biblioteca y catálogo global
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Resultados de Supabase + Open Food Facts
              </p>
            </div>
          </div>
        )}

        {/* Local results */}
        {localResults.length > 0 && (
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Tu biblioteca ({localResults.length})
            </p>
            <div className="space-y-2">
              {localResults.map((item, i) => (
                <ResultCard
                  key={item.localId ?? `local-${i}`}
                  item={item}
                  listId={listId}
                  onAdded={handleAdded}
                />
              ))}
            </div>
          </section>
        )}

        {/* OFF results */}
        {offResults.length > 0 && (
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              Catálogo global ({offResults.length})
            </p>
            <div className="space-y-2">
              {offResults.map((item, i) => (
                <ResultCard
                  key={item.barcode ?? `off-${i}`}
                  item={item}
                  listId={listId}
                  onAdded={handleAdded}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {showEmpty && (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Package className="w-7 h-7 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Sin resultados para</p>
              <p className="text-sm text-gray-400 font-mono mt-0.5">"{query}"</p>
            </div>
            <button
              type="button"
              onClick={handleCreateCustom}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Crear producto personalizado
            </button>
          </div>
        )}

        {/* Back to list */}
        {listId && addedCount > 0 && (
          <button
            type="button"
            onClick={() => navigate(`/shopping/${listId}`)}
            className="w-full py-3 rounded-xl bg-secondary-500 text-white text-sm font-semibold hover:bg-secondary-600 transition-colors"
          >
            Volver a la lista ({addedCount} agregado{addedCount !== 1 ? 's' : ''})
          </button>
        )}
      </div>
    </div>
  )
}
