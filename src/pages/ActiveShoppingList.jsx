import { useState, useMemo, useCallback, memo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Plus, ScanLine, CameraOff, Trash2, CheckCircle2, Circle,
  TrendingUp, TrendingDown, Search, Loader2,
  ShoppingBag, Store, AlertTriangle, X, Pencil, Camera,
  Share2, Copy, Check, Trash, Lock, MessageSquare,
} from 'lucide-react'
import PageHeader     from '@/components/layout/PageHeader'
import Modal          from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useShoppingList } from '@/hooks/useShoppingList'
import { useListShares } from '@/hooks/useListShares'
import { useAuth } from '@/hooks/useSupabase'
import { useProductLookup } from '@/hooks/useProductLookup'
import { useProductAutocomplete } from '@/hooks/useProductAutocomplete'
import { uploadItemPhoto, deleteItemPhoto } from '@/services/storage'
import { SCANNER_DISABLED } from '@/utils/constants'
import { formatPrice, formatPercent, priceVariance } from '@/utils/formatters'
import { cn } from '@/utils/cn'

// ─── Constants ────────────────────────────────────────────────────────────────
const UNITS = ['unid', 'kg', 'g', 'l', 'ml', 'paq', 'lata']

const EMPTY_FORM = { barcode: '', name: '', quantity: 1, unit: 'unid', price: '', note: '' }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function budgetColor(pct) {
  if (pct >= 100) return { bar: 'bg-red-500',       text: 'text-red-600'       }
  if (pct >= 80)  return { bar: 'bg-accent-500',    text: 'text-accent-600'    }
  return                  { bar: 'bg-secondary-500', text: 'text-secondary-600' }
}

function PriceIndicator({ product }) {
  if (!product?.last_price || !product?.prev_price) return null
  const variance = priceVariance(product.last_price, product.prev_price)
  if (!variance || Math.abs(variance.value) < 0.5) return null

  return variance.increased ? (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
      <TrendingUp className="w-2.5 h-2.5" />
      {formatPercent(variance.value)}
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-secondary-600 bg-secondary-50 px-1.5 py-0.5 rounded-full">
      <TrendingDown className="w-2.5 h-2.5" />
      {formatPercent(variance.value)}
    </span>
  )
}

// ─── Budget progress bar ──────────────────────────────────────────────────────
function BudgetBar({ spent, budget, planned, totalItems, pricedItems }) {
  const pct          = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
  const colors       = budgetColor(pct)
  const isOver       = budget > 0 && spent > budget
  const unpricedCount = totalItems - pricedItems

  return (
    <div className="px-4 py-3 bg-white border-b border-gray-100 space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 font-medium">
          {budget > 0 ? 'Presupuesto' : 'Total estimado'}
        </span>
        <span className={cn('font-bold', budget > 0 ? colors.text : 'text-primary-600')}>
          {budget > 0
            ? `${formatPrice(spent)} de ${formatPrice(budget)}`
            : formatPrice(planned)
          }
        </span>
      </div>

      {budget > 0 && (
        <>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', colors.bar)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span>
              {isOver ? (
                <span className="text-red-500 font-semibold flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Superaste el presupuesto
                </span>
              ) : (
                `${Math.round(pct)}% utilizado`
              )}
            </span>
            {totalItems > 0 && (
              <span>{pricedItems} de {totalItems} con precio</span>
            )}
          </div>
        </>
      )}

      {/* Warning: items without price */}
      {unpricedCount > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-accent-700 bg-accent-50 rounded-lg px-2.5 py-1.5">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>
            {unpricedCount} producto{unpricedCount !== 1 ? 's' : ''} sin precio —
            tocá el precio para actualizarlo
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Inline price editor ──────────────────────────────────────────────────────
function PriceEditor({ item, onUpdatePrice, disabled }) {
  const [editing,    setEditing]    = useState(false)
  const [priceInput, setPriceInput] = useState('')
  const [saving,     setSaving]     = useState(false)

  const hasPrice = item.price != null

  const startEdit = () => {
    setPriceInput(item.price != null ? String(item.price) : '')
    setEditing(true)
  }

  const cancelEdit = () => setEditing(false)

  const savePrice = async () => {
    const trimmed = priceInput.trim()
    const val     = trimmed === '' ? null : Number(trimmed)
    if (val !== null && (isNaN(val) || val < 0)) return
    setSaving(true)
    await onUpdatePrice(item.id, val)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold pointer-events-none">
            $
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            autoFocus
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') savePrice()
              if (e.key === 'Escape') cancelEdit()
            }}
            className="input-field pl-5 py-1 text-xs w-24 h-7"
            placeholder="0.00"
          />
        </div>
        <button
          type="button"
          onClick={savePrice}
          disabled={saving}
          className="text-xs font-semibold text-secondary-600 hover:text-secondary-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      disabled={disabled}
      aria-label="Editar precio"
      className="flex items-center gap-1 group focus-visible:outline-none"
    >
      {hasPrice ? (
        <>
          <span className="text-xs font-medium text-gray-600">
            {formatPrice(item.price)}
          </span>
          {(item.quantity ?? 1) > 1 && (
            <span className="text-xs text-gray-400">
              = {formatPrice(item.price * (item.quantity ?? 1))}
            </span>
          )}
        </>
      ) : (
        <span className="text-xs text-gray-400 italic">Precio pendiente</span>
      )}
      <Pencil className="w-3 h-3 text-gray-300 group-hover:text-primary-400 transition-colors ml-0.5" />
    </button>
  )
}

// ─── Item row ─────────────────────────────────────────────────────────────────
const ItemRow = memo(function ItemRow({ item, onToggle, onRemove, onUpdatePrice, onUpdateImage, onClearNote, disabled }) {
  const displayName    = item.name ?? item.products?.name ?? '—'
  const unitLabel      = item.unit && item.unit !== 'unid' ? ` ${item.unit}` : ''
  const photoInputRef  = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handlePhotoSelect = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      // Delete previous photo from storage before uploading the new one
      if (item.image_url) deleteItemPhoto(item.image_url).catch((err) =>
        console.error('[ItemRow] delete old photo:', err)
      )
      const url = await uploadItemPhoto(file)
      await onUpdateImage(item.id, url)
    } catch (err) {
      console.error('[ItemRow] photo upload:', err)
    } finally {
      setUploading(false)
    }
  }, [item.id, item.image_url, onUpdateImage])

  const handleRemovePhoto = useCallback(() => {
    // Delete from storage as fire-and-forget, then clear the DB reference
    if (item.image_url) deleteItemPhoto(item.image_url).catch((err) =>
      console.error('[ItemRow] remove photo storage:', err)
    )
    onUpdateImage(item.id, null)
  }, [item.id, item.image_url, onUpdateImage])

  return (
    <div className={cn(
      'flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-card',
      'transition-all duration-200',
      item.checked && 'opacity-50'
    )}>
      {/* Checkbox */}
      <button
        type="button"
        onClick={() => onToggle(item.id, !item.checked)}
        disabled={disabled}
        className={cn(
          'shrink-0 transition-transform active:scale-90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-full'
        )}
        aria-label={item.checked ? 'Marcar como no comprado' : 'Marcar como comprado'}
      >
        {item.checked
          ? <CheckCircle2 className="w-6 h-6 text-secondary-500" />
          : <Circle       className="w-6 h-6 text-gray-300" />
        }
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-semibold text-gray-900 truncate leading-snug',
          item.checked && 'line-through text-gray-400'
        )}>
          {displayName}
        </p>

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-400">
            ×{item.quantity ?? 1}{unitLabel}
          </span>

          <PriceEditor
            item={item}
            onUpdatePrice={onUpdatePrice}
            disabled={disabled}
          />

          <PriceIndicator product={item.products} />

          {item.note && (
            <span className="text-[10px] italic text-gray-400 truncate max-w-[120px]">
              {item.note}
            </span>
          )}
        </div>

        {/* Shopper note badge — shown below the detail row, clears on tap */}
        {item.shopper_note && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 max-w-[200px] truncate">
              <MessageSquare className="w-2.5 h-2.5 shrink-0" />
              {item.shopper_note}
            </span>
            <button
              type="button"
              onClick={() => onClearNote?.(item.id)}
              disabled={disabled}
              className="w-4 h-4 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center text-amber-600 shrink-0"
              aria-label="Borrar nota del comprador"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>

      {/* Photo (unchecked items only) */}
      {!item.checked && (
        <>
          {item.image_url ? (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={disabled || uploading}
                className="w-9 h-9 rounded-xl overflow-hidden border border-gray-200 block"
                aria-label="Cambiar foto"
              >
                {uploading
                  ? <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                    </div>
                  : <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                }
              </button>
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={disabled}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
                aria-label="Eliminar foto"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={disabled || uploading}
              className="p-1.5 rounded-xl hover:bg-primary-50 text-gray-200 hover:text-primary-400 transition-colors focus-visible:outline-none"
              aria-label="Agregar foto"
            >
              {uploading
                ? <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                : <Camera  className="w-4 h-4" />
              }
            </button>
          )}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </>
      )}

      {/* Delete */}
      <button
        type="button"
        onClick={() => onRemove(item.id, item.image_url)}
        disabled={disabled}
        className="p-1.5 rounded-xl hover:bg-red-50 text-gray-200 hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        aria-label={`Eliminar ${displayName}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
})

// ─── Share modal ─────────────────────────────────────────────────────────────
function ShareModal({ open, onClose, listId, plan }) {
  const { shares, loading, creating, createShare, revokeShare } = useListShares(
    open ? listId : null,
  )
  const [copiedId, setCopiedId] = useState(null)

  const FREE_LIMIT = 1
  const atFreeLimit = plan === 'free' && shares.length >= FREE_LIMIT

  const shareUrl = (token) =>
    `${window.location.origin}/shared/${token}`

  const copyLink = useCallback((share) => {
    navigator.clipboard.writeText(shareUrl(share.token)).then(() => {
      setCopiedId(share.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }, [])

  const handleCreate = useCallback(async () => {
    const share = await createShare({ permission: 'shopper' })
    if (share) copyLink(share)
  }, [createShare, copyLink])

  return (
    <Modal open={open} onClose={onClose} title="Compartir lista">
      <div className="space-y-4">

        {/* Existing links */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : shares.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-400">
            <Share2 className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            No hay links activos.<br />Creá uno para compartir.
          </div>
        ) : (
          <div className="space-y-2">
            {shares.map((share) => (
              <div
                key={share.id}
                className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">
                    {shareUrl(share.token)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {share.use_count} visita{share.use_count !== 1 ? 's' : ''} ·{' '}
                    {share.permission === 'shopper' ? 'Puede marcar y anotar' : 'Solo lectura'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyLink(share)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 shrink-0"
                  aria-label="Copiar link"
                >
                  {copiedId === share.id
                    ? <Check className="w-4 h-4 text-secondary-500" />
                    : <Copy  className="w-4 h-4" />
                  }
                </button>
                <button
                  type="button"
                  onClick={() => revokeShare(share.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 shrink-0"
                  aria-label="Revocar link"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Freemium gate */}
        {atFreeLimit && (
          <div className="flex items-start gap-2 bg-accent-50 border border-accent-100 rounded-xl px-3 py-2.5 text-xs text-accent-700">
            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              El plan gratuito incluye 1 link activo por lista.
              Actualizá a <strong>Premium</strong> para links ilimitados.
            </span>
          </div>
        )}

        {/* Create button */}
        <button
          type="button"
          onClick={atFreeLimit ? undefined : handleCreate}
          disabled={creating || atFreeLimit}
          className={cn(
            'w-full btn-primary flex items-center justify-center gap-2',
            atFreeLimit && 'opacity-40 cursor-not-allowed',
          )}
        >
          {creating
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Share2  className="w-4 h-4" />
          }
          {creating ? 'Creando…' : 'Crear link y copiar'}
        </button>

        <p className="text-[10px] text-gray-400 text-center">
          Cualquiera con el link puede ver y marcar ítems.
          Podés revocarlo en cualquier momento.
        </p>
      </div>
    </Modal>
  )
}

// ─── Add item modal ───────────────────────────────────────────────────────────
function AddItemModal({ open, onClose, onAdd, saving, listId }) {
  const navigate      = useNavigate()
  const photoInputRef = useRef(null)
  const { loading: lookupLoading, result, error: lookupError, lookup, clear } = useProductLookup()
  const [form, setForm]               = useState(EMPTY_FORM)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [photoFile,    setPhotoFile]   = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [uploading,    setUploading]   = useState(false)

  const { suggestions } = useProductAutocomplete(showSuggestions ? form.name : '')

  const set = useCallback((key, val) => setForm((p) => ({ ...p, [key]: val })), [])

  const handlePhotoSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    e.target.value = ''
  }, [photoPreview])

  const clearPhoto = useCallback(() => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
  }, [photoPreview])

  // Auto-apply lookup result to form fields
  const handleLookupResult = useCallback((res) => {
    if (!res) return
    setForm((prev) => ({
      ...prev,
      name:  res.name  || prev.name,
      price: res.lastPrice != null ? String(res.lastPrice) : prev.price,
    }))
  }, [])

  const handleLookup = useCallback(async () => {
    if (!form.barcode.trim()) return
    const res = await lookup(form.barcode.trim())
    handleLookupResult(res)
  }, [form.barcode, lookup, handleLookupResult])

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) return
    setUploading(true)
    let imageUrl = null
    if (photoFile) {
      try {
        imageUrl = await uploadItemPhoto(photoFile)
      } catch (err) {
        console.error('[AddItemModal] photo upload:', err)
      }
    }
    setUploading(false)
    await onAdd({
      name:      form.name.trim(),
      barcode:   form.barcode.trim() || null,
      quantity:  Math.max(1, Number(form.quantity) || 1),
      unit:      form.unit,
      price:     form.price !== '' ? Number(form.price) : null,
      note:      form.note.trim() || null,
      image_url: imageUrl,
    })
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
    setForm(EMPTY_FORM)
    setShowSuggestions(false)
    clear()
    onClose()
  }, [form, photoFile, photoPreview, onAdd, clear, onClose])

  const handleSelectSuggestion = useCallback((product) => {
    setForm((prev) => ({
      ...prev,
      name:  product.name,
      price: product.last_price != null ? String(product.last_price) : prev.price,
    }))
    setShowSuggestions(false)
  }, [])

  const handleClose = useCallback(() => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
    setForm(EMPTY_FORM)
    setShowSuggestions(false)
    clear()
    onClose()
  }, [photoPreview, clear, onClose])

  return (
    <Modal open={open} onClose={handleClose} title="Agregar producto">
      <div className="space-y-4">

        {/* ── Barcode lookup ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Código de barras</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                placeholder="Ej: 7790040009015"
                value={form.barcode}
                onChange={(e) => { set('barcode', e.target.value); clear() }}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                className="input-field pr-9 text-sm"
              />
              {form.barcode && (
                <button
                  type="button"
                  onClick={() => { set('barcode', ''); clear() }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                  aria-label="Limpiar código"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleLookup}
              disabled={!form.barcode.trim() || lookupLoading}
              className="btn-primary px-3 py-2.5 flex items-center gap-1.5 text-sm disabled:opacity-40"
              aria-label="Buscar producto"
            >
              {lookupLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Search  className="w-4 h-4" />
              }
              Buscar
            </button>
          </div>

          {result && (
            <div className="flex items-start gap-2 bg-secondary-50 border border-secondary-100 rounded-xl px-3 py-2">
              <CheckCircle2 className="w-4 h-4 text-secondary-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-secondary-700 truncate">{result.name}</p>
                <p className="text-[10px] text-secondary-500">
                  {result.brand && `${result.brand} · `}
                  {result.source === 'local' ? 'En tu historial' : 'Open Food Facts'}
                  {result.lastPrice && ` · Último: ${formatPrice(result.lastPrice)}`}
                </p>
              </div>
              <button type="button" onClick={clear} className="text-secondary-400 hover:text-secondary-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {lookupError && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-accent-400 shrink-0" />
              {lookupError}
            </p>
          )}
        </div>

        {/* ── Product name ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="item-name" className="text-sm font-medium text-gray-700">
            Nombre <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="item-name"
              type="text"
              placeholder="Ej: Leche entera 1L"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoFocus={!form.barcode}
              autoComplete="off"
              className="input-field"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {suggestions.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectSuggestion(product)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-primary-50 transition-colors text-left"
                    >
                      <span className="font-medium text-gray-800 truncate">{product.name}</span>
                      {product.last_price != null && (
                        <span className="text-primary-500 font-semibold text-xs ml-2 shrink-0">
                          {formatPrice(product.last_price)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Qty + Unit + Price ──────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="item-qty" className="text-sm font-medium text-gray-700">Cantidad</label>
            <input
              id="item-qty"
              type="number"
              min="1"
              step="1"
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              className="input-field text-center"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="item-unit" className="text-sm font-medium text-gray-700">Unidad</label>
            <select
              id="item-unit"
              value={form.unit}
              onChange={(e) => set('unit', e.target.value)}
              className="input-field text-sm bg-white"
            >
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="item-price" className="text-sm font-medium text-gray-700">
              Precio
              <span className="text-gray-400 font-normal text-[11px] ml-1">(opcional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold pointer-events-none">$</span>
              <input
                id="item-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="En tienda"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                className="input-field pl-6 text-sm"
              />
            </div>
          </div>
        </div>

        {/* ── Note ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="item-note" className="text-sm font-medium text-gray-700">
            Nota <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            id="item-note"
            type="text"
            placeholder="Ej: Que sea sin sal"
            maxLength={80}
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            className="input-field text-sm"
          />
        </div>

        {/* ── Photo ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            Foto del producto
            <span className="text-gray-400 font-normal text-[11px] ml-1">(opcional)</span>
          </label>
          {photoPreview ? (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shrink-0">
              <img src={photoPreview} alt="Foto del producto" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                aria-label="Eliminar foto"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="flex items-center gap-2 text-sm text-primary-500 font-medium hover:text-primary-600 py-1 w-fit"
            >
              <Camera className="w-4 h-4" />
              Tomar foto
            </button>
          )}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </div>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={handleClose} className="btn-ghost flex-1">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || uploading || !form.name.trim()}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {saving || uploading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Agregar'
            }
          </button>
        </div>

        {/* ── Search catalog link ──────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => { handleClose(); navigate(`/product-search?listId=${listId}`) }}
          className="w-full text-xs text-primary-500 font-semibold text-center hover:underline pt-1"
        >
          Buscar en catálogo global →
        </button>
      </div>
    </Modal>
  )
}

// ─── Finalize confirmation modal ──────────────────────────────────────────────
function FinalizeModal({ open, onClose, onConfirm, uncheckedCount, total, saving }) {
  return (
    <Modal open={open} onClose={onClose} title="Finalizar compra">
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary-50 flex items-center justify-center mx-auto">
          <ShoppingBag className="w-8 h-8 text-secondary-500" />
        </div>

        {uncheckedCount > 0 ? (
          <div className="bg-accent-50 border border-accent-100 rounded-xl px-4 py-3 text-sm text-accent-700 text-left">
            <p className="font-semibold flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-4 h-4" />
              Quedan ítems sin comprar
            </p>
            <p className="text-xs text-accent-600">
              {uncheckedCount} producto{uncheckedCount !== 1 ? 's' : ''} sin tildar.
              ¿Querés finalizar igual?
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            ¡Todos los productos comprados! ¿Querés registrar esta compra?
          </p>
        )}

        <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between text-sm">
          <span className="text-gray-500">Total comprado</span>
          <span className="font-bold text-primary-600">{formatPrice(total)}</span>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Volver
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            {saving
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Finalizar'
            }
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ActiveShoppingList() {
  const { listId } = useParams()
  const navigate   = useNavigate()
  const { plan }   = useAuth()

  const { list, loading, saving, toggleItem, addItem, removeItem, updateItemPrice, updateItemImage, clearShopperNote, completeList } =
    useShoppingList(listId)

  const [showAdd,      setShowAdd]      = useState(false)
  const [showFinalize, setShowFinalize] = useState(false)
  const [showShare,    setShowShare]    = useState(false)
  const [finalizing,   setFinalizing]   = useState(false)

  // ── Derived data ────────────────────────────────────────────────────────────
  const allItems = useMemo(() => list?.shopping_list_items ?? [], [list])
  const budget   = list?.budget ?? 0

  const { pending, checked } = useMemo(() => ({
    pending: allItems.filter((i) => !i.checked),
    checked: allItems.filter((i) =>  i.checked),
  }), [allItems])

  // Only items with a price count toward budget math
  const pricedItems = useMemo(() =>
    allItems.filter((i) => i.price != null),
  [allItems])

  const spent = useMemo(() =>
    checked
      .filter((i) => i.price != null)
      .reduce((s, i) => s + i.price * (i.quantity ?? 1), 0),
  [checked])

  const planned = useMemo(() =>
    pricedItems.reduce((s, i) => s + i.price * (i.quantity ?? 1), 0),
  [pricedItems])

  // ── Finalize flow ───────────────────────────────────────────────────────────
  const handleFinalize = useCallback(async () => {
    setFinalizing(true)
    await completeList()
    setFinalizing(false)
    setShowFinalize(false)
    navigate('/dashboard', { replace: true })
  }, [completeList, navigate])

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) return <LoadingSpinner className="min-h-screen" />

  if (!list) return (
    <div className="flex flex-col min-h-full">
      <PageHeader back title="Lista" />
      <p className="text-center py-16 text-sm text-gray-400">Lista no encontrada.</p>
    </div>
  )

  return (
    <div className="flex flex-col min-h-full bg-gray-50">

      {/* ── Sticky header ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30">
        <PageHeader
          back
          title={list.name}
          subtitle={
            list.stores?.name
              ? undefined
              : `${checked.length}/${allItems.length} comprados`
          }
          actions={
            <div className="flex items-center gap-1.5">
              {list.stores?.name && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs bg-primary-50 text-primary-600 font-medium px-2 py-1 rounded-full">
                  <Store className="w-3 h-3" />
                  {list.stores.name}
                </span>
              )}
              {/* Share button */}
              <button
                type="button"
                onClick={() => setShowShare(true)}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label="Compartir lista"
                title="Compartir lista"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={SCANNER_DISABLED ? undefined : () => navigate(`/scanner?listId=${listId}`)}
                title={SCANNER_DISABLED ? 'Disponible solo en dispositivos móviles' : 'Abrir escáner'}
                aria-disabled={SCANNER_DISABLED}
                className={cn(
                  'p-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                  SCANNER_DISABLED
                    ? 'text-gray-300 cursor-not-allowed opacity-60'
                    : 'hover:bg-gray-100 text-gray-500'
                )}
                aria-label="Abrir escáner"
              >
                {SCANNER_DISABLED
                  ? <CameraOff className="w-5 h-5" />
                  : <ScanLine  className="w-5 h-5" />
                }
              </button>
            </div>
          }
        />

        {allItems.length > 0 && (
          <BudgetBar
            spent={spent}
            budget={budget}
            planned={planned}
            totalItems={allItems.length}
            pricedItems={pricedItems.length}
          />
        )}
      </div>

      {/* ── Item list ───────────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-4 pb-40 space-y-2">

        {allItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Lista vacía</p>
              <p className="text-xs text-gray-400 mt-1">
                Tocá <strong>+</strong> para agregar el primer producto
              </p>
            </div>
          </div>
        ) : (
          <>
            {pending.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onToggle={toggleItem}
                onRemove={removeItem}
                onUpdatePrice={updateItemPrice}
                onUpdateImage={updateItemImage}
                onClearNote={clearShopperNote}
                disabled={saving}
              />
            ))}

            {checked.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                  Comprados ({checked.length})
                </p>
                <div className="space-y-2">
                  {checked.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={toggleItem}
                      onRemove={removeItem}
                      onUpdatePrice={updateItemPrice}
                      onUpdateImage={updateItemImage}
                      onClearNote={clearShopperNote}
                      disabled={saving}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Fixed bottom bar ─────────────────────────────────────────────────── */}
      {allItems.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-3 pb-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">
                {pending.length > 0
                  ? `${pending.length} pendiente${pending.length !== 1 ? 's' : ''}`
                  : '¡Todo comprado!'
                }
              </p>
              <p className="text-lg font-extrabold text-primary-600 leading-tight">
                {formatPrice(spent)}
                {planned > 0 && spent !== planned && (
                  <span className="text-xs font-normal text-gray-400 ml-1">
                    / {formatPrice(planned)} planif.
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowFinalize(true)}
              className="btn-secondary px-5 py-2.5 flex items-center gap-2 text-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              Finalizar Compra
            </button>
          </div>
        </div>
      )}

      {/* ── FAB ─────────────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setShowAdd(true)}
        className={cn(
          'fixed right-4 z-20',
          allItems.length > 0 ? 'bottom-36' : 'bottom-24',
          'w-14 h-14 rounded-full bg-primary-500 shadow-lg',
          'flex items-center justify-center text-white',
          'hover:bg-primary-600 active:bg-primary-700 active:scale-95',
          'transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/30'
        )}
        aria-label="Agregar producto"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </button>

      {/* ── Add item modal ───────────────────────────────────────────────────── */}
      <AddItemModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={addItem}
        saving={saving}
        listId={listId}
      />

      {/* ── Finalize confirmation modal ──────────────────────────────────────── */}
      <FinalizeModal
        open={showFinalize}
        onClose={() => setShowFinalize(false)}
        onConfirm={handleFinalize}
        uncheckedCount={pending.length}
        total={spent}
        saving={finalizing}
      />

      {/* ── Share modal ──────────────────────────────────────────────────────── */}
      <ShareModal
        open={showShare}
        onClose={() => setShowShare(false)}
        listId={listId}
        plan={plan}
      />
    </div>
  )
}
