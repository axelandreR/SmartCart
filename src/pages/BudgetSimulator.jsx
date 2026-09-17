import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, Store, TrendingDown, Calendar,
  Clock, ShoppingCart, Info, Loader2, ListChecks,
} from 'lucide-react'
import PageHeader    from '@/components/layout/PageHeader'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useBudgetSimulator } from '@/hooks/useBudgetSimulator'
import { listsService, listItemsService } from '@/services/shoppingLists'
import { formatPrice } from '@/utils/formatters'
import { cn }        from '@/utils/cn'
import toast         from 'react-hot-toast'

// ─── Static data ──────────────────────────────────────────────────────────────
const STORES = ['Wong', 'Plaza Vea', 'Tottus', 'Metro']

const SHOP_TYPES = [
  { id: 'rapida',   label: 'Rápida',   emoji: '⚡', desc: '≤5 productos' },
  { id: 'semanal',  label: 'Semanal',  emoji: '📅', desc: '6–15 productos' },
  { id: 'familiar', label: 'Familiar', emoji: '👨‍👩‍👧', desc: '16–25 productos' },
  { id: 'mensual',  label: 'Mensual',  emoji: '🗓️', desc: '+25 productos' },
]

// ─── Probability bar color ────────────────────────────────────────────────────
function probColor(p) {
  if (p >= 0.80) return { bar: 'bg-secondary-500', text: 'text-secondary-700', bg: 'bg-secondary-50' }
  if (p >= 0.60) return { bar: 'bg-yellow-400',    text: 'text-yellow-700',    bg: 'bg-yellow-50'   }
  if (p >= 0.40) return { bar: 'bg-accent-500',    text: 'text-accent-700',    bg: 'bg-accent-50'   }
  return               { bar: 'bg-red-400',        text: 'text-red-600',       bg: 'bg-red-50'      }
}

// ─── SVG confidence ring ──────────────────────────────────────────────────────
function ConfidenceRing({ value, size = 72 }) {
  const r   = (size - 10) / 2
  const c   = r * 2 * Math.PI
  const off = c - (value / 100) * c

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={7} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="white" strokeWidth={7}
        strokeDasharray={c} strokeDashoffset={off}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  )
}

// ─── Product row with probability bar ────────────────────────────────────────
function ProductRow({ product }) {
  const pct    = Math.round(product.probability * 100)
  const colors = probColor(product.probability)

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-800 truncate pr-2">
            {product.name}
          </span>
          <span className={cn('text-xs font-bold shrink-0', colors.text)}>
            {pct}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700', colors.bar)}
            style={{ width: `${pct}%` }}
          />
        </div>
        {product.avgPrice != null && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            Precio promedio: {formatPrice(product.avgPrice)}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Insight card ─────────────────────────────────────────────────────────────
function InsightCard({ icon: Icon, label, value, color = 'text-primary-600', bg = 'bg-primary-50' }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-4 flex flex-col gap-2">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', bg)}>
        <Icon className={cn('w-4.5 h-4.5', color)} />
      </div>
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{label}</p>
        <p className="text-sm font-bold text-gray-800 leading-snug mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// ─── Empty / insufficient data state ─────────────────────────────────────────
function InsufficientData({ completedCount }) {
  const navigate = useNavigate()
  const needed   = Math.max(0, 3 - completedCount)

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
      <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-primary-400" />
      </div>
      <div>
        <h3 className="text-base font-bold text-gray-800">
          {completedCount === 0
            ? 'Sin historial de compras'
            : `Necesitás ${needed} compra${needed !== 1 ? 's' : ''} más`}
        </h3>
        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
          {completedCount === 0
            ? 'Completá tu primera lista de compras para activar las predicciones personalizadas.'
            : `Tenés ${completedCount} lista${completedCount !== 1 ? 's' : ''} completada${completedCount !== 1 ? 's' : ''}. Con 3 ya podemos predecir tu próximo presupuesto.`}
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate('/lists/new')}
        className="btn-primary px-6 py-2.5 flex items-center gap-2 text-sm"
      >
        <ShoppingCart className="w-4 h-4" />
        Crear lista de compras
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BudgetSimulator() {
  const navigate = useNavigate()

  // ── Controls state ──────────────────────────────────────────────────────────
  const [selectedStore, setSelectedStore] = useState(null)
  const [shoppingType,  setShoppingType]  = useState(null)
  const [targetBudget,  setTargetBudget]  = useState(0)
  const [creating,      setCreating]      = useState(false)

  // ── Data ────────────────────────────────────────────────────────────────────
  const { loading, hasEnoughData, completedCount, analysis, insights } = useBudgetSimulator({
    selectedStore,
    shoppingType,
  })

  // Sync slider default when estimate arrives
  const estimated = analysis?.avgTotal ?? 0
  const sliderMax = useMemo(() => Math.max(estimated * 2, 30000), [estimated])

  // ── Budget sufficiency indicator ────────────────────────────────────────────
  const budgetPct  = targetBudget > 0 && estimated > 0
    ? Math.min(1, targetBudget / estimated) : null
  const budgetOver = targetBudget > 0 && targetBudget >= estimated

  // Products the user can "afford" within targetBudget
  const affordableCount = useMemo(() => {
    if (!analysis?.topProducts || !targetBudget) return null
    let acc = 0
    let count = 0
    for (const p of analysis.topProducts) {
      if (p.avgPrice && acc + p.avgPrice > targetBudget) break
      if (!p.avgPrice) { count++; continue }
      acc   += p.avgPrice
      count++
    }
    return count
  }, [analysis?.topProducts, targetBudget])

  // ── Create list from prediction ─────────────────────────────────────────────
  const handleCreateList = useCallback(async () => {
    if (!analysis?.topProducts?.length) return
    setCreating(true)
    try {
      const typeLabel = SHOP_TYPES.find((t) => t.id === shoppingType)?.label
      const listName  = typeLabel
        ? `${typeLabel} (predicha)`
        : 'Lista Predicha'

      const budget = targetBudget > 0 ? targetBudget : estimated

      const list = await listsService.create({
        name:       listName,
        status:     'active',
        budget:     budget > 0 ? Math.round(budget) : null,
        store_name: selectedStore || null,
      })

      const toAdd = analysis.topProducts.filter((p) => p.probability >= 0.5)
      await Promise.all(
        toAdd.map((p) =>
          listItemsService.addItem(list.id, {
            name:     p.name,
            price:    p.avgPrice ? Math.round(p.avgPrice) : null,
            quantity: 1,
            unit:     'unid',
          })
        )
      )

      toast.success(`Lista creada con ${toAdd.length} productos predichos`)
      navigate(`/shopping/${list.id}`)
    } catch (err) {
      console.error('[BudgetSimulator] createList:', err)
      toast.error('No se pudo crear la lista')
    } finally {
      setCreating(false)
    }
  }, [analysis, shoppingType, selectedStore, targetBudget, estimated, navigate])

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return <LoadingSpinner className="min-h-screen" />

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <PageHeader back title="Simulador de Presupuesto" />

      <div className="flex-1 px-4 py-4 pb-32 space-y-5 overflow-y-auto">

        {/* ── Insufficient data state ────────────────────────────────────────── */}
        {!hasEnoughData && (
          <InsufficientData completedCount={completedCount} />
        )}

        {/* ── Hero prediction card ─────────────────────────────────────────────*/}
        {hasEnoughData && analysis && (
          <div
            className="rounded-3xl p-5 text-white"
            style={{ background: 'linear-gradient(135deg, #534AB7 0%, #2D286A 100%)' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-primary-200 text-sm font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Presupuesto estimado
                </p>
                <p className="text-4xl font-extrabold mt-1 leading-none">
                  {formatPrice(estimated)}
                </p>
                <p className="text-primary-200 text-xs mt-2">
                  Basado en {analysis.basedOnLists} compra{analysis.basedOnLists !== 1 ? 's' : ''} completada{analysis.basedOnLists !== 1 ? 's' : ''}
                </p>
                {analysis.usedFallback && (
                  <p className="text-yellow-300 text-[10px] mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3 shrink-0" />
                    Sin datos exactos para este filtro — mostrando historial completo
                  </p>
                )}
              </div>

              {/* Confidence ring */}
              <div className="flex flex-col items-center gap-1 shrink-0 ml-4">
                <div className="relative">
                  <ConfidenceRing value={analysis.confidence} />
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold">
                    {analysis.confidence}%
                  </span>
                </div>
                <span className="text-[10px] text-primary-200 font-medium">confianza</span>
              </div>
            </div>

            {/* Budget vs target indicator */}
            {budgetPct !== null && (
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-primary-200">Tu presupuesto</span>
                  <span className={cn('font-bold', budgetOver ? 'text-green-300' : 'text-yellow-300')}>
                    {formatPrice(targetBudget)}
                    {budgetOver ? ' ✓' : ` (−${formatPrice(estimated - targetBudget)})`}
                  </span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      budgetOver ? 'bg-green-400' : 'bg-yellow-400'
                    )}
                    style={{ width: `${Math.min(100, budgetPct * 100)}%` }}
                  />
                </div>
                {affordableCount !== null && (
                  <p className="text-[10px] text-primary-200">
                    Alcanza para ~{affordableCount} de {analysis.topProducts.length} productos predichos
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Controls ─────────────────────────────────────────────────────────*/}
        {hasEnoughData && (
          <div className="bg-white rounded-2xl shadow-card p-4 space-y-4">
            <h3 className="text-sm font-bold text-gray-700">Personalizar predicción</h3>

            {/* Store selector */}
            <div>
              <p className="text-xs text-gray-400 font-medium mb-2">Tienda</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStore(null)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors',
                    !selectedStore
                      ? 'border-primary-500 bg-primary-500 text-white'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  Cualquiera
                </button>
                {STORES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedStore(selectedStore === s ? null : s)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors',
                      selectedStore === s
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-gray-200 text-gray-500 hover:border-primary-200 hover:text-primary-600'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Shopping type chips */}
            <div>
              <p className="text-xs text-gray-400 font-medium mb-2">Tipo de compra</p>
              <div className="grid grid-cols-2 gap-2">
                {SHOP_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setShoppingType(shoppingType === t.id ? null : t.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm transition-colors text-left',
                      shoppingType === t.id
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
                    )}
                  >
                    <span className="text-base">{t.emoji}</span>
                    <div>
                      <p className="font-semibold leading-tight">{t.label}</p>
                      <p className="text-[10px] text-gray-400 leading-tight">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Budget slider */}
            {estimated > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-400 font-medium">Tu presupuesto disponible</p>
                  <span className="text-sm font-bold text-primary-600">
                    {targetBudget > 0 ? formatPrice(targetBudget) : 'Sin límite'}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={sliderMax}
                  step={Math.round(sliderMax / 60 / 100) * 100 || 100}
                  value={targetBudget}
                  onChange={(e) => setTargetBudget(Number(e.target.value))}
                  className="w-full accent-primary-500 h-2 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>Sin límite</span>
                  <span className="text-primary-400 font-medium">
                    Estimado: {formatPrice(estimated)}
                  </span>
                  <span>{formatPrice(sliderMax)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Predicted products ────────────────────────────────────────────── */}
        {hasEnoughData && analysis?.topProducts?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-card px-4 py-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-primary-500" />
                Productos que comprarías
              </h3>
              <span className="text-[10px] text-gray-400">
                % probabilidad
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mb-3">
              Frecuencia real en tus listas completadas
            </p>
            <div className="divide-y divide-gray-50">
              {analysis.topProducts.map((p) => (
                <ProductRow key={p.name} product={p} />
              ))}
            </div>
          </div>
        )}

        {/* ── Insights ──────────────────────────────────────────────────────── */}
        {insights?.hasData && (
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-accent-500" />
              Insights de ahorro
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {insights.bestDay && (
                <InsightCard
                  icon={Calendar}
                  label="Mejor día para comprar"
                  value={`${insights.bestDay.name}${insights.bestDay.pct > 0 ? ` · ${insights.bestDay.pct}% más barato en promedio` : ''}`}
                  color="text-secondary-600"
                  bg="bg-secondary-50"
                />
              )}
              {insights.bestStore && (
                <InsightCard
                  icon={Store}
                  label="Mejor tienda para tu lista"
                  value={`${insights.bestStore.name} · precio promedio más bajo`}
                  color="text-primary-600"
                  bg="bg-primary-50"
                />
              )}
              {insights.bestTime && (
                <InsightCard
                  icon={Clock}
                  label="Horario con mejores precios"
                  value={`Registros más baratos entre ${insights.bestTime}`}
                  color="text-accent-600"
                  bg="bg-accent-50"
                />
              )}
              {!insights.bestDay && !insights.bestStore && (
                <div className="bg-white rounded-2xl shadow-card p-4 text-center">
                  <TrendingDown className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">
                    Registrá precios en más compras para ver tus insights de ahorro
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── Sticky CTA ───────────────────────────────────────────────────────── */}
      {hasEnoughData && analysis?.topProducts?.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-3 pb-6 safe-bottom">
          <button
            type="button"
            onClick={handleCreateList}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-base transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #534AB7 0%, #0F6E56 100%)' }}
          >
            {creating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                Crear lista basada en predicción
              </>
            )}
          </button>
          {analysis && (
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Se agregarán {analysis.topProducts.filter((p) => p.probability >= 0.5).length} productos con probabilidad ≥50%
            </p>
          )}
        </div>
      )}
    </div>
  )
}
