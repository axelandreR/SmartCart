import { useState, useMemo, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Package, TrendingDown, TrendingUp, Store, Clock,
  ShoppingCart, Bell, Lock, ChevronRight, CheckCircle2,
  Camera, Loader2, Trash2,
} from 'lucide-react'
import PageHeader      from '@/components/layout/PageHeader'
import Card            from '@/components/ui/Card'
import Button          from '@/components/ui/Button'
import Badge           from '@/components/ui/Badge'
import Modal           from '@/components/ui/Modal'
import LoadingSpinner  from '@/components/ui/LoadingSpinner'
import { useQuery }    from '@/hooks/useSupabase'
import { useShoppingLists } from '@/hooks/useShoppingList'
import { productsService } from '@/services/products'
import { listItemsService } from '@/services/shoppingLists'
import { uploadProductImage } from '@/services/storage'
import { formatPrice, formatDate, formatRelative, priceVariance, formatPercent } from '@/utils/formatters'
import { cn }          from '@/utils/cn'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import toast           from 'react-hot-toast'

// ─── Product image picker ─────────────────────────────────────────────────────
function ProductImagePicker({ productId, imageUrl: initialUrl, name }) {
  const [url, setUrl]         = useState(initialUrl)
  const [uploading, setUploading] = useState(false)
  const inputRef              = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 5 MB guard
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5 MB')
      return
    }

    setUploading(true)
    try {
      const publicUrl = await uploadProductImage(productId, file)
      await productsService.updateImage(productId, publicUrl)
      setUrl(publicUrl)
      toast.success('Foto actualizada')
    } catch (err) {
      console.error('[ProductImagePicker] upload failed', err)
      toast.error('No se pudo subir la imagen')
    } finally {
      setUploading(false)
      // Reset input so the same file can be re-selected
      e.target.value = ''
    }
  }

  return (
    <div className="relative w-20 h-20 shrink-0 group">
      {/* Hidden file input — accepts camera + gallery on mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Image / placeholder */}
      <div
        className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden cursor-pointer"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
        ) : url ? (
          <img src={url} alt={name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <Package className="w-8 h-8 text-gray-300" />
        )}
      </div>

      {/* Camera overlay button */}
      {!uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-md hover:bg-primary-600 active:bg-primary-700 transition-colors"
          aria-label="Cambiar foto del producto"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

// ─── Store comparison row ─────────────────────────────────────────────────────
function StoreRow({ store, price, count, isBest }) {
  return (
    <div className={cn(
      'flex items-center gap-3 py-3 rounded-xl transition-colors',
      isBest && 'bg-secondary-50 px-3 -mx-3'
    )}>
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
        isBest ? 'bg-secondary-100' : 'bg-gray-100'
      )}>
        <Store className={cn('w-4 h-4', isBest ? 'text-secondary-600' : 'text-gray-400')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{store}</p>
        <p className="text-xs text-gray-400">{count} registro{count !== 1 ? 's' : ''}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn('font-bold', isBest ? 'text-secondary-700' : 'text-gray-800')}>
          {formatPrice(price)}
        </span>
        {isBest && (
          <Badge variant="success" className="text-[10px] whitespace-nowrap">
            Mejor precio
          </Badge>
        )}
      </div>
    </div>
  )
}

// ─── List picker modal ────────────────────────────────────────────────────────
function ListPickerModal({ open, onClose, onSelect, loading }) {
  const { data: lists } = useShoppingLists()
  const activeLists = useMemo(
    () => lists?.filter((l) => l.status === 'active') ?? [],
    [lists]
  )

  return (
    <Modal open={open} onClose={onClose} title="Agregar a lista">
      {activeLists.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          No tenés listas activas. Creá una primero.
        </p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {activeLists.map((list) => (
            <button
              key={list.id}
              type="button"
              onClick={() => onSelect(list.id, list.name)}
              disabled={loading}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-4.5 h-4.5 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{list.name}</p>
                <p className="text-xs text-gray-400">
                  {list.shopping_list_items?.[0]?.count ?? 0} ítems
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProductDetail() {
  const { id }           = useParams()
  const navigate         = useNavigate()
  const [searchParams]   = useSearchParams()
  const returnListId     = searchParams.get('listId')

  const { data: product, loading } = useQuery(
    () => productsService.getById(id),
    [id]
  )

  const [showListPicker, setShowListPicker] = useState(false)
  const [addingToList,   setAddingToList]   = useState(false)

  // ── Derived data ─────────────────────────────────────────────────────────────
  const history = product?.price_history ?? []

  const chartData = useMemo(() =>
    history.slice().reverse().map((h) => ({
      date:  formatDate(h.recorded_at, 'dd/MM'),
      price: Number(h.price),
    })),
  [history])

  const prices     = history.map((h) => Number(h.price))
  const minPrice   = prices.length ? Math.min(...prices) : null
  const maxPrice   = prices.length ? Math.max(...prices) : null
  const latestVar  = history.length >= 2
    ? priceVariance(Number(history[0].price), Number(history[1].price))
    : null

  // Per-store min price aggregation
  const storeStats = useMemo(() => {
    const map = {}
    history.forEach((h) => {
      const name = h.stores?.name || 'Sin tienda'
      if (!map[name]) map[name] = { minPrice: Number(h.price), count: 0 }
      if (Number(h.price) < map[name].minPrice) map[name].minPrice = Number(h.price)
      map[name].count++
    })
    return Object.entries(map)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => a.minPrice - b.minPrice)
  }, [history])

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleSelectList = async (listId, listName) => {
    setAddingToList(true)
    try {
      await listItemsService.addItem(listId, {
        name:       product.name,
        product_id: product.id,
        price:      product.last_price ?? null,
        quantity:   1,
        unit:       'unid',
      })
      toast.success(`Agregado a "${listName}"`)
      setShowListPicker(false)
      // If we came from a list context, navigate back
      if (returnListId) navigate(`/shopping/${returnListId}`)
    } catch (err) {
      console.error('[ProductDetail] addItem:', err)
      toast.error('No se pudo agregar el producto')
    } finally {
      setAddingToList(false)
    }
  }

  // ── States ────────────────────────────────────────────────────────────────────
  if (loading) return <LoadingSpinner className="min-h-screen" />

  if (!product) return (
    <div className="flex flex-col min-h-full">
      <PageHeader back title="Producto" />
      <p className="text-center py-16 text-sm text-gray-400">Producto no encontrado.</p>
    </div>
  )

  const purchaseCount  = history.length
  const firstPurchase  = purchaseCount ? history[history.length - 1].recorded_at : null

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <PageHeader back title={product.name} />

      <div className="flex-1 px-4 py-4 pb-32 space-y-4 overflow-y-auto">

        {/* ── Product info card ───────────────────────────────────────────────── */}
        <Card className="flex gap-4">
          <ProductImagePicker
            productId={product.id}
            imageUrl={product.image_url}
            name={product.name}
          />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 leading-snug">{product.name}</h2>
            {product.brand && (
              <p className="text-sm text-gray-500 mt-0.5">{product.brand}</p>
            )}
            {product.barcode && (
              <p className="text-xs font-mono text-gray-400 mt-1">{product.barcode}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {product.category && <Badge variant="gray">{product.category}</Badge>}
              {product.nutri_score && (
                <Badge variant={['A','B'].includes(product.nutri_score) ? 'success' : 'warning'}>
                  Nutri-Score {product.nutri_score}
                </Badge>
              )}
            </div>

            {/* Purchase count */}
            {purchaseCount > 0 && (
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-secondary-500 shrink-0" />
                {purchaseCount} vez{purchaseCount !== 1 ? 'es' : ''} comprado
                {firstPurchase && ` desde ${formatDate(firstPurchase, 'MMM yyyy')}`}
              </p>
            )}
          </div>
        </Card>

        {/* ── Price summary ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: 'Actual',  value: history[0]?.price != null ? formatPrice(history[0].price) : '—', color: 'text-primary-600' },
            { label: 'Mínimo',  value: minPrice != null ? formatPrice(minPrice) : '—', color: 'text-secondary-600' },
            { label: 'Máximo',  value: maxPrice != null ? formatPrice(maxPrice) : '—', color: 'text-red-500' },
          ].map((s) => (
            <Card key={s.label} className="text-center py-3 px-2">
              <p className={cn('text-base font-extrabold', s.color)}>{s.value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* ── Store price comparison ──────────────────────────────────────────── */}
        {storeStats.length > 0 && (
          <Card>
            <h3 className="font-semibold text-gray-800 mb-1">Precios por tienda</h3>
            <div className="divide-y divide-gray-50">
              {storeStats.map((s, i) => (
                <StoreRow
                  key={s.name}
                  store={s.name}
                  price={s.minPrice}
                  count={s.count}
                  isBest={i === 0}
                />
              ))}
            </div>
          </Card>
        )}

        {/* ── Price chart ─────────────────────────────────────────────────────── */}
        {chartData.length > 1 && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Evolución de precios</h3>
              {latestVar && (
                <span className={cn(
                  'flex items-center gap-1 text-xs font-semibold',
                  latestVar.increased ? 'text-red-500' : 'text-secondary-600'
                )}>
                  {latestVar.increased
                    ? <TrendingUp className="w-3 h-3" />
                    : <TrendingDown className="w-3 h-3" />
                  }
                  {formatPercent(latestVar.value)}
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={52} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => [formatPrice(v), 'Precio']} />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#534AB7"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#534AB7' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* ── Price history list ───────────────────────────────────────────────── */}
        {history.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Últimos registros</h3>
              {history.length > 5 && (
                <button
                  type="button"
                  onClick={() => navigate(`/products/${id}/prices`)}
                  className="text-xs text-primary-500 font-semibold hover:text-primary-700"
                >
                  Ver todos ({history.length})
                </button>
              )}
            </div>
            <div className="space-y-3">
              {history.slice(0, 5).map((h) => (
                <div key={h.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                    <Store className="w-3.5 h-3.5 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {h.stores?.name ?? 'Tienda desconocida'}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatRelative(h.recorded_at)}
                    </p>
                  </div>
                  <span className="font-semibold text-gray-900 shrink-0">
                    {formatPrice(h.price)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* No price history yet */}
        {history.length === 0 && (
          <Card className="text-center py-6">
            <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              Aún no hay precios registrados para este producto.
            </p>
          </Card>
        )}
      </div>

      {/* ── Sticky CTAs ─────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-3 pb-6 safe-bottom space-y-2">
        <Button
          className="w-full flex items-center justify-center gap-2"
          onClick={() => setShowListPicker(true)}
        >
          <ShoppingCart className="w-4 h-4" />
          Agregar a lista
        </Button>

        <button
          type="button"
          onClick={() => toast('Disponible en la versión Premium', { icon: '🔒' })}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-400 hover:bg-gray-50 transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          <Bell className="w-3.5 h-3.5" />
          Crear alerta de precio
          <Badge variant="warning" className="text-[10px]">Premium</Badge>
        </button>
      </div>

      {/* ── List picker modal ─────────────────────────────────────────────────── */}
      <ListPickerModal
        open={showListPicker}
        onClose={() => setShowListPicker(false)}
        onSelect={handleSelectList}
        loading={addingToList}
      />
    </div>
  )
}
