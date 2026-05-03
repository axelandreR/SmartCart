/**
 * SharedList — public page for shared shopping lists.
 * Route: /shared/:token  (no auth required)
 *
 * Shoppers can:
 *  - View all items (pending + checked)
 *  - Mark items as checked/unchecked
 *  - Leave a note on any item to communicate with the list owner
 */
import { useState, useCallback, useEffect, memo } from 'react'
import { useParams } from 'react-router-dom'
import {
  CheckCircle2, Circle, MessageSquare, X, ShoppingCart,
  Store, Loader2, AlertTriangle, ShoppingBag,
} from 'lucide-react'
import { sharedListService } from '@/services/listShares'
import { formatPrice } from '@/utils/formatters'
import { cn } from '@/utils/cn'

// ─── Note editor ─────────────────────────────────────────────────────────────
function NoteEditor({ itemId, initialNote, token, onSaved }) {
  const [open,   setOpen]   = useState(false)
  const [text,   setText]   = useState(initialNote ?? '')
  const [saving, setSaving] = useState(false)

  const save = useCallback(async () => {
    setSaving(true)
    try {
      await sharedListService.setNote(token, itemId, text.trim() || null)
      onSaved(itemId, text.trim() || null)
      setOpen(false)
    } catch (err) {
      console.error('[SharedList] setNote:', err)
    } finally {
      setSaving(false)
    }
  }, [token, itemId, text, onSaved])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 transition-colors',
          initialNote
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : 'text-gray-400 hover:text-primary-500',
        )}
      >
        <MessageSquare className="w-2.5 h-2.5" />
        {initialNote ? 'Nota: ' + initialNote : 'Agregar nota'}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <input
        autoFocus
        type="text"
        maxLength={120}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') setOpen(false)
        }}
        placeholder="Ej: No había, ¿sirve la entera?"
        className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="p-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
        aria-label="Guardar nota"
      >
        {saving
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <CheckCircle2 className="w-3 h-3" />
        }
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600"
        aria-label="Cancelar"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

// ─── Shared item row ──────────────────────────────────────────────────────────
const SharedItemRow = memo(function SharedItemRow({ item, token, canWrite, onToggle, onNoteUpdated }) {
  const [toggling, setToggling] = useState(false)

  const handleToggle = useCallback(async () => {
    if (!canWrite) return
    setToggling(true)
    try {
      await sharedListService.toggleItem(token, item.id, !item.checked)
      onToggle(item.id, !item.checked)
    } catch (err) {
      console.error('[SharedList] toggle:', err)
    } finally {
      setToggling(false)
    }
  }, [token, item.id, item.checked, canWrite, onToggle])

  return (
    <div className={cn(
      'flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100',
      'transition-opacity duration-200',
      item.checked && 'opacity-50',
    )}>
      {/* Checkbox */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={!canWrite || toggling}
        className={cn(
          'shrink-0 transition-transform active:scale-90',
          'focus-visible:outline-none',
          !canWrite && 'cursor-default',
        )}
        aria-label={item.checked ? 'Marcar como no comprado' : 'Marcar como comprado'}
      >
        {toggling
          ? <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
          : item.checked
            ? <CheckCircle2 className="w-6 h-6 text-secondary-500" />
            : <Circle       className="w-6 h-6 text-gray-300" />
        }
      </button>

      {/* Product photo */}
      {item.image_url && (
        <img
          src={item.image_url}
          alt=""
          className="w-10 h-10 rounded-xl object-cover border border-gray-100 shrink-0"
        />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-semibold text-gray-900 truncate leading-snug',
          item.checked && 'line-through text-gray-400',
        )}>
          {item.name}
        </p>

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-400">
            ×{item.quantity ?? 1}
            {item.unit && item.unit !== 'unid' ? ` ${item.unit}` : ''}
          </span>

          {item.price != null && (
            <span className="text-xs font-medium text-gray-500">
              {formatPrice(item.price)}
            </span>
          )}

          {item.note && (
            <span className="text-[10px] italic text-gray-400 truncate max-w-[100px]">
              {item.note}
            </span>
          )}
        </div>

        {/* Note editor — only for shopper permission */}
        {canWrite && !item.checked && (
          <NoteEditor
            key={item.id}
            itemId={item.id}
            initialNote={item.shopper_note}
            token={token}
            onSaved={onNoteUpdated}
          />
        )}

        {/* Show existing note read-only for viewers */}
        {!canWrite && item.shopper_note && (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full mt-1">
            <MessageSquare className="w-2.5 h-2.5" />
            {item.shopper_note}
          </span>
        )}
      </div>
    </div>
  )
})

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SharedList() {
  const { token } = useParams()

  const [list,       setList]       = useState(null)
  const [permission, setPermission] = useState('viewer')
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  // Load list on mount
  useEffect(() => {
    if (!token) return

    setLoading(true)
    sharedListService.getList(token)
      .then(({ list: l, permission: p }) => {
        setList(l)
        setPermission(p)
      })
      .catch((err) => {
        console.error('[SharedList] load:', err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [token])

  // Optimistic toggle — update local state immediately
  const handleToggle = useCallback((itemId, checked) => {
    setList((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        shopping_list_items: prev.shopping_list_items.map((item) =>
          item.id === itemId ? { ...item, checked } : item,
        ),
      }
    })
  }, [])

  // Note saved — update local state
  const handleNoteUpdated = useCallback((itemId, note) => {
    setList((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        shopping_list_items: prev.shopping_list_items.map((item) =>
          item.id === itemId ? { ...item, shopper_note: note } : item,
        ),
      }
    })
  }, [])

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Cargando lista…</p>
        </div>
      </div>
    )
  }

  // ── Error states ─────────────────────────────────────────────────────────
  if (error) {
    const isExpired = error.includes('expirado') || error.includes('disponible')
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-800">
            {isExpired ? 'Link no disponible' : 'Link no válido'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
        <a
          href="/"
          className="text-sm text-primary-500 font-semibold hover:underline"
        >
          Crear tu propia lista gratis →
        </a>
      </div>
    )
  }

  if (!list) return null

  const items    = list.shopping_list_items ?? []
  const pending  = items.filter((i) => !i.checked)
  const checked  = items.filter((i) =>  i.checked)
  const canWrite = permission === 'shopper'

  const totalSpent = checked
    .filter((i) => i.price != null)
    .reduce((s, i) => s + i.price * (i.quantity ?? 1), 0)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 pt-safe-top pb-4 sticky top-0 z-20">
        <div className="max-w-lg mx-auto">
          {/* Brand */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-primary-500 tracking-wide">SmartCart</span>
          </div>

          {/* List name */}
          <h1 className="text-xl font-extrabold text-gray-900 leading-tight truncate">
            {list.name}
          </h1>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {list.stores?.name && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Store className="w-3 h-3" />
                {list.stores.name}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {checked.length}/{items.length} comprados
            </span>
            {canWrite && (
              <span className="text-xs bg-secondary-50 text-secondary-700 font-medium px-2 py-0.5 rounded-full">
                Podés marcar y anotar
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Items ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-4 pb-28 max-w-lg mx-auto w-full space-y-2">

        {items.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-200" />
            <p className="text-sm text-gray-400">La lista está vacía</p>
          </div>
        ) : (
          <>
            {pending.map((item) => (
              <SharedItemRow
                key={item.id}
                item={item}
                token={token}
                canWrite={canWrite}
                onToggle={handleToggle}
                onNoteUpdated={handleNoteUpdated}
              />
            ))}

            {checked.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                  Comprados ({checked.length})
                </p>
                <div className="space-y-2">
                  {checked.map((item) => (
                    <SharedItemRow
                      key={item.id}
                      item={item}
                      token={token}
                      canWrite={canWrite}
                      onToggle={handleToggle}
                      onNoteUpdated={handleNoteUpdated}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pb-safe-bottom pt-3 pb-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">
              {pending.length > 0
                ? `${pending.length} pendiente${pending.length !== 1 ? 's' : ''}`
                : '¡Todo comprado!'}
            </p>
            {totalSpent > 0 && (
              <p className="text-base font-extrabold text-primary-600">
                {formatPrice(totalSpent)}
              </p>
            )}
          </div>

          {/* CTA for new users */}
          <a
            href="/register"
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary-500 text-white px-3 py-2 rounded-xl hover:bg-primary-600 transition-colors"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Crear mi lista gratis
          </a>
        </div>
      </div>

    </div>
  )
}
