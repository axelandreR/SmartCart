import { useState } from 'react'
import { Wallet, Edit2, Check } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useBudget } from '@/hooks/useBudget'
import { formatPrice } from '@/utils/formatters'
import { CATEGORIES } from '@/utils/constants'
import { cn } from '@/utils/cn'

export default function Budget() {
  const { budget, setMonthlyBudget, setCategoryBudget, getBudgetUsagePercent } = useBudget()
  const [editingMonthly, setEditingMonthly] = useState(false)
  const [tempBudget, setTempBudget] = useState(String(budget.monthly))

  // Placeholder: in a real app, spent would come from completed lists this month
  const spent = 0
  const usagePercent = getBudgetUsagePercent(spent)

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader back title="Presupuesto" />

      <div className="flex-1 px-4 py-4 pb-24 space-y-4">
        {/* Monthly budget card */}
        <Card className="bg-gradient-to-br from-primary-500 to-primary-700 text-white">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-primary-200">Presupuesto mensual</p>
              {editingMonthly ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={tempBudget}
                    onChange={(e) => setTempBudget(e.target.value)}
                    className="w-32 bg-white/20 text-white placeholder-white/60 border border-white/30 rounded-lg px-2 py-1 text-xl font-bold focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => { setMonthlyBudget(tempBudget); setEditingMonthly(false) }}
                    className="p-1.5 bg-white/20 rounded-lg"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <p className="text-3xl font-bold mt-1">{formatPrice(budget.monthly)}</p>
              )}
            </div>
            {!editingMonthly && (
              <button onClick={() => { setTempBudget(String(budget.monthly)); setEditingMonthly(true) }}
                className="p-2 bg-white/20 rounded-xl">
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Usage bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-primary-200">
              <span>Gastado: {formatPrice(spent)}</span>
              <span>Restante: {formatPrice(Math.max(0, budget.monthly - spent))}</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', usagePercent > 90 ? 'bg-red-400' : 'bg-white')}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Category budgets */}
        <div>
          <h2 className="font-semibold text-gray-800 mb-3">Por categoría</h2>
          <div className="space-y-3">
            {CATEGORIES.slice(0, 6).map((cat) => {
              const catBudget = budget.categories[cat.id] ?? 0
              return (
                <Card key={cat.id} className="flex items-center gap-3">
                  <span className="text-2xl">{cat.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{cat.label}</p>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-primary-400 rounded-full" style={{ width: '0%' }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-sm font-semibold text-gray-700">{formatPrice(catBudget)}</span>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
