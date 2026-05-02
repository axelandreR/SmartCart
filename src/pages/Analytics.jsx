import {
  BarChart2, TrendingDown, TrendingUp, ShoppingCart,
  Package, TrendingUp as Trend, ListChecks, Inbox,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import PageHeader    from '@/components/layout/PageHeader'
import Card          from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAnalytics } from '@/hooks/useAnalytics'
import { formatPrice, formatPercent } from '@/utils/formatters'
import { cn } from '@/utils/cn'

// ─── Brand palette ────────────────────────────────────────────────────────────
const COLORS = ['#534AB7', '#0F6E56', '#854F0B', '#0EA5E9', '#F59E0B', '#EF4444']

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────
function Shimmer({ className }) {
  return <div className={cn('animate-pulse bg-gray-100 rounded-xl', className)} />
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, subUp, bg, color, loading }) {
  return (
    <Card>
      {loading ? (
        <>
          <Shimmer className="w-9 h-9 mb-2" />
          <Shimmer className="h-6 w-20 mb-1" />
          <Shimmer className="h-3 w-24" />
        </>
      ) : (
        <>
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-2', bg)}>
            <Icon className={cn('w-5 h-5', color)} />
          </div>
          <p className={cn('text-xl font-bold leading-tight', color)}>{value}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{label}</p>
          {sub !== undefined && (
            <p className={cn(
              'text-[11px] font-medium mt-1 flex items-center gap-0.5',
              subUp ? 'text-red-500' : 'text-secondary-600'
            )}>
              {subUp
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />
              }
              {sub}
            </p>
          )}
        </>
      )}
    </Card>
  )
}

// ─── Custom tooltip for bar chart ─────────────────────────────────────────────
function MonthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2">
      <p className="text-xs font-semibold text-gray-700">{label}</p>
      <p className="text-sm font-bold text-primary-600">{formatPrice(payload[0].value)}</p>
    </div>
  )
}

// ─── Price mover row ──────────────────────────────────────────────────────────
function MoverRow({ product, rank }) {
  const increased = product.pct > 0
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-[10px] font-bold flex items-center justify-center shrink-0">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
        <p className="text-[11px] text-gray-400">
          {formatPrice(product.prev_price)} → {formatPrice(product.last_price)}
        </p>
      </div>
      <span className={cn(
        'flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full shrink-0',
        increased
          ? 'bg-red-50 text-red-600'
          : 'bg-secondary-50 text-secondary-700'
      )}>
        {increased
          ? <TrendingUp className="w-3 h-3" />
          : <TrendingDown className="w-3 h-3" />
        }
        {formatPercent(product.pct)}
      </span>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyAnalytics() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-4">
      <div className="w-16 h-16 rounded-3xl bg-primary-50 flex items-center justify-center">
        <Inbox className="w-8 h-8 text-primary-300" />
      </div>
      <div>
        <p className="font-semibold text-gray-700">Todavía no hay datos</p>
        <p className="text-sm text-gray-400 mt-1 leading-relaxed max-w-[260px]">
          Empezá a registrar precios en tus listas para ver el análisis de gastos aquí.
        </p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Analytics() {
  const {
    loading,
    hasData,
    thisMonth,
    monthDelta,
    productCount,
    completedCount,
    totalSpend,
    monthlyData,
    categoryData,
    priceMovers,
  } = useAnalytics()

  // Derive delta label
  const deltaLabel = monthDelta !== null
    ? `${formatPercent(monthDelta)} vs mes anterior`
    : undefined

  const stats = [
    {
      icon:    ShoppingCart,
      label:   'Gasto este mes',
      value:   formatPrice(thisMonth),
      sub:     deltaLabel,
      subUp:   (monthDelta ?? 0) > 0,
      bg:      'bg-primary-50',
      color:   'text-primary-600',
    },
    {
      icon:    BarChart2,
      label:   'Gasto últimos 6 meses',
      value:   formatPrice(totalSpend),
      bg:      'bg-accent-50',
      color:   'text-accent-600',
    },
    {
      icon:    Package,
      label:   'Productos registrados',
      value:   String(productCount),
      bg:      'bg-secondary-50',
      color:   'text-secondary-600',
    },
    {
      icon:    ListChecks,
      label:   'Listas completadas',
      value:   String(completedCount),
      bg:      'bg-gray-100',
      color:   'text-gray-600',
    },
  ]

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader title="Análisis" />

      <div className="flex-1 px-4 py-4 pb-24 space-y-5">

        {/* ── Stat grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} loading={loading} />
          ))}
        </div>

        {/* ── Empty state (no data yet) ───────────────────────────────────── */}
        {!loading && !hasData && <EmptyAnalytics />}

        {/* ── Monthly spending chart ──────────────────────────────────────── */}
        {(loading || hasData) && (
          <Card>
            <h3 className="font-semibold text-gray-800 mb-3">Gasto mensual</h3>
            {loading ? (
              <Shimmer className="h-40 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={monthlyData} barSize={28} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    width={36}
                    tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<MonthTooltip />} cursor={{ fill: '#534AB710' }} />
                  <Bar dataKey="total" fill="#534AB7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        )}

        {/* ── Category breakdown ──────────────────────────────────────────── */}
        {(loading || hasData) && (
          <Card>
            <h3 className="font-semibold text-gray-800 mb-3">Por categoría</h3>
            {loading ? (
              <div className="flex gap-4 items-center">
                <Shimmer className="w-[120px] h-[120px] rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  {[1, 2, 3].map((i) => <Shimmer key={i} className="h-4 w-full" />)}
                </div>
              </div>
            ) : categoryData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin datos de categorías aún.</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%" cy="50%"
                      innerRadius={34} outerRadius={54}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex-1 space-y-1.5 min-w-0">
                  {categoryData.map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-xs text-gray-600 truncate flex-1">{cat.name}</span>
                      <span className="text-xs font-semibold text-gray-700 shrink-0">
                        {formatPrice(cat.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ── Price movers ────────────────────────────────────────────────── */}
        {(loading || hasData) && (
          <Card>
            <h3 className="font-semibold text-gray-800 mb-1">Variación de precios</h3>
            <p className="text-xs text-gray-400 mb-3">
              Productos con mayor cambio de precio registrado
            </p>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Shimmer key={i} className="h-10 w-full" />)}
              </div>
            ) : priceMovers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Registrá precios dos veces para ver variaciones.
              </p>
            ) : (
              <div>
                {priceMovers.map((p, i) => (
                  <MoverRow key={p.id} product={p} rank={i + 1} />
                ))}
              </div>
            )}
          </Card>
        )}

      </div>
    </div>
  )
}
