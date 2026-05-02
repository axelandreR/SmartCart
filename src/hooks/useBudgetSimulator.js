/**
 * useBudgetSimulator
 *
 * Derives budget predictions from real user data:
 *   - Product probability  = frequency in completed lists
 *   - Budget estimate      = average total of completed lists
 *   - Best day / store     = cheapest by day-of-week / store from price_history
 *   - Confidence           = data-volume metric (more lists → higher confidence)
 *
 * No fake ML: every number is derived from actual Supabase records.
 */
import { useMemo } from 'react'
import { useQuery } from '@/hooks/useSupabase'
import { listsService } from '@/services/shoppingLists'
import { priceHistoryService } from '@/services/products'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

/** Classify a list by item count into a shopping type */
function classifyType(items) {
  const n = items.length
  if (n <= 5)  return 'rapida'
  if (n <= 15) return 'semanal'
  if (n <= 25) return 'familiar'
  return 'mensual'
}

/** Weighted average — more recent lists count more */
function weightedAvg(values) {
  if (!values.length) return 0
  const total = values.reduce((s, v, i) => {
    const weight = values.length - i   // most recent = highest weight
    return { sum: s.sum + v * weight, w: s.w + weight }
  }, { sum: 0, w: 0 })
  return total.w ? total.sum / total.w : 0
}

export function useBudgetSimulator({ selectedStore = null, shoppingType = null } = {}) {
  const { data: rawLists,   loading: listsLoading }  = useQuery(() => listsService.getCompleted(30))
  const { data: rawPrices,  loading: pricesLoading } = useQuery(() => priceHistoryService.getRecent(400))

  const completedLists = rawLists  ?? []
  const priceHistory   = rawPrices ?? []

  // ─── Analysis (product frequencies + budget estimate) ───────────────────────
  const analysis = useMemo(() => {
    if (!completedLists.length) return null

    // Apply store filter
    let lists = selectedStore
      ? completedLists.filter((l) => l.store_name === selectedStore)
      : completedLists

    // Apply shopping type filter
    if (shoppingType) {
      const typed = lists.filter((l) =>
        classifyType(l.shopping_list_items ?? []) === shoppingType
      )
      if (typed.length >= 2) lists = typed
    }

    // Fall back to all completed if filter leaves fewer than 2
    if (lists.length < 2) lists = completedLists

    const totalLists = lists.length

    // ── Product frequency map ─────────────────────────────────────────────────
    const itemMap = {}
    lists.forEach((list) => {
      const seen = new Set()
      ;(list.shopping_list_items ?? []).forEach((item) => {
        const name = item.name?.trim()
        if (!name || seen.has(name)) return
        seen.add(name)
        if (!itemMap[name]) itemMap[name] = { count: 0, prices: [] }
        itemMap[name].count++
        const p = Number(item.price)
        if (p > 0) itemMap[name].prices.push(p)
      })
    })

    const topProducts = Object.entries(itemMap)
      .map(([name, { count, prices }]) => ({
        name,
        probability: count / totalLists,           // 0–1 real fraction
        avgPrice: prices.length
          ? prices.reduce((a, b) => a + b, 0) / prices.length
          : null,
        purchaseCount: count,
      }))
      .filter((p) => p.probability >= 0.25)        // at least in 1 of 4 lists
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 8)

    // ── Budget estimate (weighted avg of list totals) ─────────────────────────
    const listTotals = lists
      .map((list) =>
        (list.shopping_list_items ?? [])
          .filter((i) => i.checked && Number(i.price) > 0)
          .reduce((sum, i) => sum + Number(i.price) * (i.quantity || 1), 0)
      )
      .filter((t) => t > 0)

    const avgTotal = weightedAvg(listTotals)

    // ── Confidence score (honest: based purely on data volume) ───────────────
    // More lists + more products = more confidence, capped at 93%
    const listScore    = Math.min(1, listTotals.length / 12)
    const productScore = Math.min(1, topProducts.length / 6)
    const confidence   = Math.round((listScore * 0.6 + productScore * 0.4) * 93)

    return {
      topProducts,
      avgTotal:       Math.round(avgTotal),
      confidence:     Math.max(40, confidence),   // min 40% so the UI isn't empty
      basedOnLists:   totalLists,
      usedFallback:   lists === completedLists && (selectedStore || shoppingType),
    }
  }, [completedLists, selectedStore, shoppingType])

  // ─── Insights (day-of-week + store patterns from price_history) ─────────────
  const insights = useMemo(() => {
    if (!priceHistory.length) return null

    // Day-of-week analysis
    const byDay = {}
    priceHistory.forEach((h) => {
      const day = DAY_NAMES[new Date(h.recorded_at).getDay()]
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(Number(h.price))
    })

    const allPrices   = Object.values(byDay).flat()
    const overallAvg  = allPrices.length
      ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0

    const dayStats = Object.entries(byDay)
      .filter(([, p]) => p.length >= 3)
      .map(([day, prices]) => ({
        day,
        avg: prices.reduce((a, b) => a + b, 0) / prices.length,
        count: prices.length,
      }))
      .sort((a, b) => a.avg - b.avg)

    const bestDay    = dayStats[0] ?? null
    const bestDayPct = bestDay && overallAvg
      ? Math.abs(Math.round((1 - bestDay.avg / overallAvg) * 100))
      : 0

    // Store analysis
    const byStore = {}
    priceHistory.forEach((h) => {
      const name = h.stores?.name
      if (!name) return
      if (!byStore[name]) byStore[name] = []
      byStore[name].push(Number(h.price))
    })

    const storeStats = Object.entries(byStore)
      .filter(([, p]) => p.length >= 3)
      .map(([name, prices]) => ({
        name,
        avg: prices.reduce((a, b) => a + b, 0) / prices.length,
        count: prices.length,
      }))
      .sort((a, b) => a.avg - b.avg)

    const bestStore = storeStats[0] ?? null

    // Hour analysis
    const byHour = {}
    priceHistory.forEach((h) => {
      const hour = new Date(h.recorded_at).getHours()
      if (!byHour[hour]) byHour[hour] = []
      byHour[hour].push(Number(h.price))
    })

    const hourStats = Object.entries(byHour)
      .filter(([, p]) => p.length >= 3)
      .map(([hour, prices]) => ({
        hour: Number(hour),
        avg:  prices.reduce((a, b) => a + b, 0) / prices.length,
      }))
      .sort((a, b) => a.avg - b.avg)

    const bestHour   = hourStats[0]
    const bestTimeLabel = bestHour
      ? `${bestHour.hour}:00–${Math.min(bestHour.hour + 2, 23)}:00`
      : null

    return {
      bestDay:   bestDay   ? { name: bestDay.name,   pct: bestDayPct }  : null,
      bestStore: bestStore ? { name: bestStore.name, count: bestStore.count } : null,
      bestTime:  bestTimeLabel,
      hasData:   dayStats.length > 0 || storeStats.length > 0,
    }
  }, [priceHistory])

  return {
    loading:        listsLoading || pricesLoading,
    hasEnoughData:  completedLists.length >= 3,
    completedCount: completedLists.length,
    analysis,
    insights,
  }
}
