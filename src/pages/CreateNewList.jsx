import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { CalendarDays, Zap, Users, Check, Plus, Store, X, Loader2 } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { useCreateList } from '@/hooks/useCreateList'
import { useStores, useStoreMutations } from '@/hooks/useStores'
import { formatPrice } from '@/utils/formatters'
import { cn } from '@/utils/cn'

// ─── Templates (no longer hard-code a store — user picks dynamically) ─────────
const TEMPLATES = [
  {
    id: 'semanal',
    label: 'Semanal',
    name: 'Compra Semanal',
    description: 'Para la semana',
    Icon: CalendarDays,
    budget: 200,
    colorBg:     'bg-primary-50',
    colorIcon:   'text-primary-500',
    colorBorder: 'border-primary-400',
    colorActive: 'bg-primary-500',
  },
  {
    id: 'rapida',
    label: 'Rápida',
    name: 'Lista Rápida',
    description: 'Pocos productos',
    Icon: Zap,
    budget: 80,
    colorBg:     'bg-secondary-50',
    colorIcon:   'text-secondary-500',
    colorBorder: 'border-secondary-400',
    colorActive: 'bg-secondary-500',
  },
  {
    id: 'familiar',
    label: 'Familiar',
    name: 'Canasta Familiar',
    description: 'Toda la familia',
    Icon: Users,
    budget: 350,
    colorBg:     'bg-accent-50',
    colorIcon:   'text-accent-500',
    colorBorder: 'border-accent-400',
    colorActive: 'bg-accent-500',
  },
]

// ─── Template card ────────────────────────────────────────────────────────────
function TemplateCard({ tpl, selected, onSelect }) {
  const { Icon } = tpl
  return (
    <button
      type="button"
      onClick={() => onSelect(tpl)}
      aria-pressed={selected}
      className={cn(
        'relative flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 text-center',
        'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        selected
          ? cn('border-2', tpl.colorBorder, tpl.colorBg)
          : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
      )}
    >
      {selected && (
        <span className={cn(
          'absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center',
          tpl.colorActive
        )}>
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </span>
      )}

      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center',
        selected ? tpl.colorActive : tpl.colorBg
      )}>
        <Icon className={cn('w-5 h-5', selected ? 'text-white' : tpl.colorIcon)} />
      </div>

      <div>
        <p className="text-xs font-bold text-gray-900 leading-tight">{tpl.label}</p>
        <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{tpl.description}</p>
        <p className={cn('text-[11px] font-semibold mt-1', selected ? tpl.colorIcon : 'text-gray-500')}>
          {formatPrice(tpl.budget)}
        </p>
      </div>
    </button>
  )
}

// ─── Store chip ───────────────────────────────────────────────────────────────
function StoreChip({ store, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(store)}
      aria-pressed={selected}
      className={cn(
        'px-4 py-2 rounded-full border-2 text-sm font-medium transition-all duration-150 whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        selected
          ? 'border-primary-500 bg-primary-500 text-white'
          : 'border-gray-200 bg-white text-gray-600 hover:border-primary-300 hover:text-primary-600'
      )}
    >
      {selected && <Check className="w-3 h-3 inline mr-1.5" strokeWidth={3} />}
      {store.name}
    </button>
  )
}

// ─── Inline new-store form (shown beneath the chips row) ──────────────────────
function NewStoreInline({ onSave, onCancel, saving }) {
  const [name, setName] = useState('')
  const inputRef = useRef(null)

  const handleSave = () => {
    if (!name.trim()) return
    onSave(name.trim())
  }

  return (
    <div className="flex items-center gap-2 mt-2 animate-in slide-in-from-top-1 duration-150">
      <div className="relative flex-1">
        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          autoFocus
          placeholder="Nombre de la tienda"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') onCancel()
          }}
          maxLength={60}
          className="input-field pl-9 py-2 text-sm"
        />
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="btn-primary px-3.5 py-2 text-sm flex items-center gap-1.5 disabled:opacity-40"
      >
        {saving
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Check className="w-3.5 h-3.5" strokeWidth={3} />
        }
        Agregar
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Cancelar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      {children}
      {error && (
        <p role="alert" className="text-xs text-red-500 flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-100 text-red-500 font-bold text-[9px] flex items-center justify-center shrink-0">!</span>
          {error}
        </p>
      )}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CreateNewList() {
  const { createList, saving } = useCreateList()
  const { stores, loading: storesLoading, refetch } = useStores()
  const { createStore, saving: storeSaving } = useStoreMutations(refetch)

  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [selectedStore,    setSelectedStore]    = useState(null) // { id, name }
  const [showNewStore,     setShowNewStore]     = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: { name: '', budget: '' } })

  const budgetValue = watch('budget')

  // ── Apply template ──────────────────────────────────────────────────────────
  const applyTemplate = (tpl) => {
    const isSame = selectedTemplate?.id === tpl.id
    if (isSame) {
      setSelectedTemplate(null)
      setValue('name', '')
      setValue('budget', '')
    } else {
      setSelectedTemplate(tpl)
      setValue('name', tpl.name, { shouldValidate: true })
      setValue('budget', tpl.budget)
    }
  }

  // ── Toggle store chip ───────────────────────────────────────────────────────
  const toggleStore = (store) => {
    setSelectedStore((prev) => (prev?.id === store.id ? null : store))
  }

  // ── Create store inline ─────────────────────────────────────────────────────
  const handleNewStore = async (name) => {
    const created = await createStore({ name })
    if (created) {
      setSelectedStore(created)
      setShowNewStore(false)
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const onSubmit = ({ name, budget }) => {
    createList({
      name,
      budget:  budget !== '' ? Number(budget) : null,
      storeId: selectedStore?.id ?? null,
    })
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <PageHeader back title="Nueva Lista" />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex-1 flex flex-col">
        <div className="flex-1 px-4 py-5 space-y-6 overflow-y-auto pb-32">

          {/* ── Plantillas ─────────────────────────────────────────────────── */}
          <Field label="Empezá desde una plantilla">
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {TEMPLATES.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  tpl={tpl}
                  selected={selectedTemplate?.id === tpl.id}
                  onSelect={applyTemplate}
                />
              ))}
            </div>
          </Field>

          {/* ── Nombre ─────────────────────────────────────────────────────── */}
          <Field label="Nombre de la lista" error={errors.name?.message}>
            <div className="relative">
              <input
                id="list-name"
                type="text"
                placeholder="Ej: Compras del fin de semana"
                autoComplete="off"
                autoFocus={!selectedTemplate}
                className={cn(
                  'input-field',
                  errors.name && 'border-red-400 focus:ring-red-500/30 focus:border-red-400'
                )}
                {...register('name', {
                  required:  'El nombre es obligatorio.',
                  minLength: { value: 2, message: 'Mínimo 2 caracteres.' },
                  maxLength: { value: 60, message: 'Máximo 60 caracteres.' },
                })}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 pointer-events-none">
                {watch('name')?.length ?? 0}/60
              </span>
            </div>
          </Field>

          {/* ── Tienda ─────────────────────────────────────────────────────── */}
          <Field
            label="Tienda"
            hint="Opcional — para registrar precios por supermercado"
          >
            {storesLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando tiendas…
              </div>
            ) : (
              <>
                {stores.length === 0 && !showNewStore ? (
                  /* Empty state — nudge user to add first store */
                  <button
                    type="button"
                    onClick={() => setShowNewStore(true)}
                    className="flex items-center gap-2 text-sm text-primary-500 font-semibold hover:text-primary-600 pt-1"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar tu primer supermercado
                  </button>
                ) : (
                  <div className="space-y-2">
                    {/* Chips row */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1 pt-1 items-center">
                      {stores.map((store) => (
                        <StoreChip
                          key={store.id}
                          store={store}
                          selected={selectedStore?.id === store.id}
                          onToggle={toggleStore}
                        />
                      ))}

                      {/* Add new store button (inline) */}
                      {!showNewStore && (
                        <button
                          type="button"
                          onClick={() => setShowNewStore(true)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-2 rounded-full border-2 border-dashed',
                            'text-sm font-medium whitespace-nowrap transition-colors',
                            'border-gray-200 text-gray-400 hover:border-primary-300 hover:text-primary-500'
                          )}
                          aria-label="Agregar tienda"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Nueva
                        </button>
                      )}
                    </div>

                    {/* Inline new-store form */}
                    {showNewStore && (
                      <NewStoreInline
                        onSave={handleNewStore}
                        onCancel={() => setShowNewStore(false)}
                        saving={storeSaving}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </Field>

          {/* ── Presupuesto ─────────────────────────────────────────────────── */}
          <Field
            label="Presupuesto estimado"
            hint={
              budgetValue > 0
                ? `Presupuesto: ${formatPrice(Number(budgetValue))}`
                : 'Opcional — te avisamos si te pasás'
            }
            error={errors.budget?.message}
          >
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold pointer-events-none select-none">
                $
              </span>
              <input
                id="budget"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                className={cn(
                  'input-field pl-8',
                  errors.budget && 'border-red-400 focus:ring-red-500/30 focus:border-red-400'
                )}
                {...register('budget', {
                  min:      { value: 0, message: 'El presupuesto no puede ser negativo.' },
                  validate: (v) =>
                    v === '' || v === undefined || !isNaN(Number(v)) || 'Ingresá un número válido.',
                })}
              />
            </div>
          </Field>

        </div>

        {/* ── Sticky footer ─────────────────────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-3 pb-6 safe-bottom">
          {/* Summary pill */}
          {(selectedStore || budgetValue > 0) && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {selectedStore && (
                <span className="flex items-center gap-1 text-xs bg-primary-50 text-primary-600 font-medium px-2.5 py-1 rounded-full">
                  <Store className="w-3 h-3" />
                  {selectedStore.name}
                  <button
                    type="button"
                    onClick={() => setSelectedStore(null)}
                    className="ml-1 text-primary-400 hover:text-primary-600"
                    aria-label="Quitar tienda"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )}
              {budgetValue > 0 && (
                <span className="text-xs bg-secondary-50 text-secondary-600 font-medium px-2.5 py-1 rounded-full">
                  {formatPrice(Number(budgetValue))}
                </span>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base min-h-[52px]"
          >
            {saving
              ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Crear Lista'
            }
          </button>
        </div>
      </form>
    </div>
  )
}
