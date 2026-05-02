import { useMemo } from 'react'
import { format, subMonths, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { useQuery } from '@/hooks/useSupabase'
import { listItemsService, listsService } from '@/services/shoppingLists'
import { productsService } from '@/services/products'

// ─── Demo-mode fixture data ───────────────────────────────────────────────────
const DEMO_ITEMS = (() => {
  const items = []
  const categories = ['lacteos', 'carnes', 'frutas-verduras', 'bebidas', 'limpieza']
  const catWeights  = [0.25,    0.30,    0.20,              0.15,      0.10]
  const baseSpend   = [3200, 4100, 2800, 3600, 3900, 2500]

  for (let m = 5; m >= 0; m--) {
    const monthDate = subMonths(new Date(), m)
    const monthTotal = baseSpend[5 - m]
    const itemCount  = 8 + Math.floor(Math.random() * 6)

    for (let i = 0; i < itemCount; i++) {
      const catIndex = weightedRandom(catWeights)
      const price    = (monthTotal * catWeights[catIndex]) / itemCount * (0.8 + Math.random() * 0.4)
      items.push({
        price:      Math.round(price * 100) / 100,
        quantity:   1,
        checked_at: new Date(monthDate.getFullYear(), monthDate.getMonth(), 10 + i).toISOString(),
        products:   { category: categories[catIndex] },
      })
    }
  }
  return items
})()

const DEMO_PRODUCT_COUNT   = 18
const DEMO_COMPLETED_COUNT = 9
const DEMO_PRICE_MOVERS = [
  { id: '1', name: 'Leche Gloria entera 1L',  category: 'lacteos',         last_price: 4.80, prev_price: 4.20 },
  { id: '2', name: 'Aceite vegetal 1L',        category: 'condimentos',     last_price: 8.50, prev_price: 7.20 },
  { id: '3', name: 'Pan de molde',             category: 'panaderia',       last_price: 5.20, prev_price: 4.90 },
  { id: '4', name: 'Detergente 500ml',         category: 'limpieza',        last_price: 6.30, prev_price: 7.10 },
  { id: '5', name: 'Arroz extra 1kg',          category: 'otros',           last_price: 3.90, prev_price: 4.20 },
]

function weightedRandom(weights) {
  const r = Math.random()
  let acc = 0
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i]
    if (r < acc) return i
  }
  return weights.length - 1
}

// ─── Category labels ──────────────────────────────────────────────────────────
const CATEGORY_LABELS = {
  'frutas-verduras': 'Frutas y verduras',
  'carnes':          'Carnes',
  'lacteos':         'Lácteos',
  'panaderia':       'Panadería',
  'bebidas':         'Bebidas',
  'limpieza':        'Limpieza',
  'higiene':         'Higiene',
  'congelados':      'Congelados',
  'snacks':          'Snacks',
  'condimentos':     'Condimentos',
  'otros':           'Otros',
}

function categoryLabel(raw) {
  if (!raw) return 'Sin categoría'
  const key = raw.replace(/^[a-z]{2}:/, '').toLowerCase()
  return CATEGORY_LABELS[key] ?? raw
}

// ─── Data processors ──────────────────────────────────────────────────────────

/**
 * Build a 6-month bar-chart series from raw checked items.
 * Always returns exactly 6 entries (filling 0 for months with no data).
 */
function buildMonthlyData(items) {
  const map = {}
  for (let i = 5; i >= 0; i--) {
    const d     = subMonths(new Date(), i)
    const key   = format(startOfMonth(d), 'yyyy-MM')
    const label = format(d, 'MMM', { locale: es })
    map[key]    = { month: label.charAt(0).toUpperCase() + label.slice(1), total: 0, key }
  }

  for (const item of items) {
    const key = item.checked_at.slice(0, 7)   // 'YYYY-MM'
    if (map[key]) {
      map[key].total += (item.price ?? 0) * (item.quantity ?? 1)
    }
  }

  return Object.values(map).map((entry) => ({
    month: entry.month,
    total: Math.round(entry.total * 100) / 100,
  }))
}

/**
 * Build a donut-chart series: top-5 categories by total spend + "Otros".
 */
function buildCategoryData(items) {
  const totals = {}
  for (const item of items) {
    const cat = item.products?.category ?? null
    const key = cat ? cat.replace(/^[a-z]{2}:/, '').toLowerCase() : '__none__'
    totals[key] = (totals[key] ?? 0) + (item.price ?? 0) * (item.quantity ?? 1)
  }

  const sorted = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      name:  key === '__none__' ? 'Sin categoría' : categoryLabel(key),
      value: Math.round(value * 100) / 100,
    }))

  if (sorted.length <= 6) return sorted

  const top5  = sorted.slice(0, 5)
  const others = sorted.slice(5).reduce((acc, c) => acc + c.value, 0)
  return [...top5, { name: 'Otros', value: Math.round(others * 100) / 100 }]
}

/**
 * Build price-movers list (sorted by % change, biggest first).
 * Returns max 5 entries.
 */
function buildPriceMovers(products) {
  return products
    .filter((p) => p.prev_price > 0)
    .map((p) => {
      const pct = ((p.last_price - p.prev_price) / p.prev_price) * 100
      return { ...p, pct: Math.round(pct * 10) / 10 }
    })
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 5)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * Aggregates all data required by the Analytics page.
 * Returns processed, chart-ready data.
 */
export function useAnalytics() {
  const isDemo = localStorage.getItem('smartcart_demo_mode') === 'true'

  const { data: rawItems,        loading: l1 } = useQuery(
    () => isDemo
      ? Promise.resolve(DEMO_ITEMS)
      : listItemsService.getCheckedItemsForAnalytics(6)
  )
  const { data: productCount,    loading: l2 } = useQuery(
    () => isDemo ? Promise.resolve(DEMO_PRODUCT_COUNT)   : productsService.getCount()
  )
  const { data: completedCount,  loading: l3 } = useQuery(
    () => isDemo ? Promise.resolve(DEMO_COMPLETED_COUNT) : listsService.getCompletedCount()
  )
  const { data: rawMovers,       loading: l4 } = useQuery(
    () => isDemo ? Promise.resolve(DEMO_PRICE_MOVERS) : productsService.getPriceMovers()
  )

  // ── Derived / memoised ────────────────────────────────────────────────────
  const monthlyData  = useMemo(() => buildMonthlyData(rawItems  ?? []), [rawItems])
  const categoryData = useMemo(() => buildCategoryData(rawItems ?? []), [rawItems])
  const priceMovers  = useMemo(() => buildPriceMovers(rawMovers ?? []), [rawMovers])

  const thisMonth  = monthlyData[monthlyData.length - 1]?.total ?? 0
  const lastMonth  = monthlyData[monthlyData.length - 2]?.total ?? 0
  const monthDelta = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null

  const totalSpend = monthlyData.reduce((s, m) => s + m.total, 0)
  const hasData    = (rawItems?.length ?? 0) > 0

  return {
    loading: l1 || l2 || l3 || l4,
    hasData,
    // Stats
    thisMonth,
    monthDelta,
    productCount:   productCount   ?? 0,
    completedCount: completedCount ?? 0,
    totalSpend,
    // Charts
    monthlyData,
    categoryData,
    priceMovers,
  }
}
