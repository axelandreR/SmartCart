import { useState, useEffect } from 'react'
import { storage } from '@/utils/storage'

const BUDGET_KEY = 'smartcart_budget'

export function useBudget() {
  const [budget, setBudgetState] = useState(() => storage.get(BUDGET_KEY, {
    monthly: 0,
    categories: {},
    currency: 'ARS',
  }))

  useEffect(() => {
    storage.set(BUDGET_KEY, budget)
  }, [budget])

  const setMonthlyBudget = (amount) => {
    setBudgetState((prev) => ({ ...prev, monthly: Number(amount) }))
  }

  const setCategoryBudget = (categoryId, amount) => {
    setBudgetState((prev) => ({
      ...prev,
      categories: { ...prev.categories, [categoryId]: Number(amount) },
    }))
  }

  const getRemainingBudget = (spent) => {
    return Math.max(0, budget.monthly - spent)
  }

  const getBudgetUsagePercent = (spent) => {
    if (!budget.monthly) return 0
    return Math.min(100, (spent / budget.monthly) * 100)
  }

  return { budget, setMonthlyBudget, setCategoryBudget, getRemainingBudget, getBudgetUsagePercent }
}
