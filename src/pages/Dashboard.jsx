import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, ScanLine, Clock, BarChart2,
  ShoppingCart, Bell, ChevronRight, TrendingUp,
  CameraOff, Search, Smartphone, X,
} from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { formatPrice, formatRelative } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import { SCANNER_DISABLED } from '@/utils/constants'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'Buenos días'
  if (h >= 12 && h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const LIST_STATUS = {
  active:    { label: 'Activa',     classes: 'bg-secondary-50 text-secondary-600' },
  completed: { label: 'Completada', classes: 'bg-gray-100 text-gray-500'          },
  archived:  { label: 'Archivada',  classes: 'bg-gray-100 text-gray-400'          },
}

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────
function Shimmer({ className }) {
  return (
    <div className={cn('animate-pulse bg-gray-100 rounded-xl', className)} />
  )
}

// ─── Stats card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, loading }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-4 flex flex-col gap-1 flex-1 min-w-0">
      {loading ? (
        <>
          <Shimmer className="h-7 w-16 mb-1" />
          <Shimmer className="h-3.5 w-20" />
        </>
      ) : (
        <>
          <span className={cn('text-2xl font-extrabold leading-none', color)}>{value}</span>
          <span className="text-xs text-gray-500 leading-snug">{label}</span>
          {sub && <span className="text-[10px] text-gray-400 leading-none">{sub}</span>}
        </>
      )}
    </div>
  )
}

// ─── Action button ────────────────────────────────────────────────────────────
function ActionBtn({ icon: Icon, label, onClick, variant = 'outline', color, disabled = false, tooltip }) {
  const base = 'flex flex-col items-center justify-center gap-2 rounded-2xl min-h-[88px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'

  const variants = {
    primary:   'bg-primary-500 hover:bg-primary-600 text-white shadow-card active:scale-95',
    secondary: 'bg-secondary-500 hover:bg-secondary-600 text-white shadow-card active:scale-95',
    outline:   `bg-white border-2 ${color ?? 'border-gray-100'} hover:bg-gray-50 text-gray-700 shadow-card active:scale-95`,
    disabled:  'bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed opacity-60',
  }

  const activeVariant = disabled ? 'disabled' : variant

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      title={tooltip}
      aria-disabled={disabled}
      className={cn(base, variants[activeVariant])}
    >
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center',
        !disabled && variant === 'primary'   && 'bg-white/20',
        !disabled && variant === 'secondary' && 'bg-white/20',
        !disabled && variant === 'outline'   && (color ? 'bg-primary-50' : 'bg-gray-100'),
        disabled && 'bg-gray-200',
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-semibold leading-tight text-center px-1">{label}</span>
    </button>
  )
}

// ─── Recent list row ──────────────────────────────────────────────────────────
function ListRow({ list, onClick }) {
  const status = LIST_STATUS[list.status] ?? LIST_STATUS.active
  const itemCount = list.shopping_list_items?.[0]?.count ?? 0

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 px-1 text-left hover:bg-gray-50 rounded-xl transition-colors active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
        <ShoppingCart className="w-4.5 h-4.5 text-primary-500" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{list.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', status.classes)}>
            {status.label}
          </span>
          <span className="text-[10px] text-gray-400">
            {formatRelative(list.updated_at)}
          </span>
        </div>
      </div>

      {/* Item count + chevron */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-gray-400 font-medium">{itemCount} ítem{itemCount !== 1 ? 's' : ''}</span>
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>
    </button>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const { loading, displayName, initials, plan, activeLists, recentLists, monthlySpending } = useDashboard()
  const greeting = getGreeting()

  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    navigate(`/products${q ? `?q=${encodeURIComponent(q)}` : ''}`)
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">

          {/* Greeting */}
          <div>
            <p className="text-xs text-gray-400 font-medium">{greeting},</p>
            {loading ? (
              <Shimmer className="h-7 w-32 mt-1" />
            ) : (
              <h1 className="text-xl font-extrabold text-gray-900 leading-tight">
                {displayName}
              </h1>
            )}
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Notificaciones"
            >
              <Bell className="w-4.5 h-4.5 text-gray-500" />
            </button>

            {/* Avatar */}
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              style={{
                background: plan === 'premium'
                  ? 'linear-gradient(135deg, #534AB7, #2D286A)'
                  : 'linear-gradient(135deg, #6b7280, #4b5563)',
              }}
              aria-label="Perfil"
            >
              {loading ? '?' : initials}
            </button>
          </div>
        </div>

        {/* Premium badge */}
        {!loading && plan === 'premium' && (
          <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
            ✦ Premium
          </span>
        )}
      </div>

      {/* ── Scrollable content ───────────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-4 pb-28 space-y-5 overflow-y-auto">

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <StatCard
            loading={loading}
            value={activeLists.length}
            label="Listas activas"
            color="text-primary-600"
          />
          <StatCard
            loading={loading}
            value={monthlySpending > 0 ? formatPrice(monthlySpending) : '$ —'}
            label="Gasto del mes"
            sub={monthlySpending > 0 ? undefined : 'Sin compras registradas'}
            color="text-secondary-600"
          />
        </div>

        {/* ── Quick actions grid ────────────────────────────────────────────── */}
        <section aria-label="Acciones rápidas">
          <div className="grid grid-cols-2 gap-3">
            <ActionBtn
              icon={Plus}
              label="Nueva Lista"
              variant="primary"
              onClick={() => navigate('/lists/new')}
            />
            {/* Temporalmente deshabilitado - testing en laptop */}
            <ActionBtn
              icon={SCANNER_DISABLED ? CameraOff : ScanLine}
              label="Escanear"
              variant="secondary"
              disabled={SCANNER_DISABLED}
              tooltip="Disponible solo en dispositivos móviles"
              onClick={() => navigate('/scanner')}
            />
            <ActionBtn
              icon={Clock}
              label="Historial"
              variant="outline"
              color="border-primary-100"
              onClick={() => navigate('/history')}
            />
            <ActionBtn
              icon={BarChart2}
              label="Reportes"
              variant="outline"
              color="border-accent-100"
              onClick={() => navigate('/analytics')}
            />
          </div>

          {/* Mobile scanner badge + search alternative */}
          {SCANNER_DISABLED && (
            <div className="mt-3 space-y-2">
              {/* Badge informativo */}
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="text-xs text-amber-700 font-medium">
                    Scanner disponible en versión móvil
                  </span>
                </div>
                <a
                  href={`http://${window.location.hostname}:5173/barcode-scanner`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-amber-600 font-semibold hover:underline whitespace-nowrap ml-2"
                >
                  Probar →
                </a>
              </div>

              {/* Buscar Producto alternativo */}
              {!showSearch ? (
                <button
                  type="button"
                  onClick={() => setShowSearch(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white border-2 border-primary-100 text-primary-600 text-sm font-semibold hover:bg-primary-50 transition-colors shadow-card"
                >
                  <Search className="w-4 h-4" />
                  Buscar producto
                </button>
              ) : (
                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ingresa código de barras o nombre del producto"
                    autoFocus
                    className="flex-1 px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
                  >
                    Ir
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowSearch(false); setSearchQuery('') }}
                    className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                    aria-label="Cerrar búsqueda"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </section>

        {/* ── Recent lists ──────────────────────────────────────────────────── */}
        <section aria-label="Listas recientes">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-primary-500" />
              Recientes
            </h2>
            <button
              type="button"
              onClick={() => navigate('/lists')}
              className="text-xs text-primary-500 font-semibold hover:text-primary-700 transition-colors focus-visible:outline-none focus-visible:rounded"
            >
              Ver todas
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-card divide-y divide-gray-50 px-3">
            {loading ? (
              /* Skeleton rows */
              [0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <Shimmer className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Shimmer className="h-3.5 w-32" />
                    <Shimmer className="h-3 w-20" />
                  </div>
                  <Shimmer className="h-3 w-10" />
                </div>
              ))
            ) : recentLists.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <ShoppingCart className="w-8 h-8 text-gray-200" />
                <p className="text-sm text-gray-400">Todavía no tenés listas</p>
                <button
                  type="button"
                  onClick={() => navigate('/lists/new')}
                  className="text-xs text-primary-500 font-semibold hover:underline"
                >
                  Crear la primera
                </button>
              </div>
            ) : (
              recentLists.map((list) => (
                <ListRow
                  key={list.id}
                  list={list}
                  onClick={() => {
                    if (list.id.startsWith('demo-')) { navigate('/lists'); return }
                    navigate(list.status === 'active' ? `/shopping/${list.id}` : `/lists/${list.id}`)
                  }}
                />
              ))
            )}
          </div>
        </section>

        {/* ── Savings tip ───────────────────────────────────────────────────── */}
        {!loading && (
          <button
            type="button"
            onClick={() => navigate('/analytics')}
            className="w-full bg-gradient-to-br from-secondary-500 to-secondary-700 rounded-2xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-400"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Analizá tus gastos</p>
                <p className="text-xs text-secondary-100 mt-0.5 leading-snug">
                  Descubrí en qué categorías gastás más y dónde podés ahorrar.
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-secondary-200 shrink-0" />
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
