import { useAuth, useQuery } from '@/hooks/useSupabase'
import { listsService, listItemsService } from '@/services/shoppingLists'

// ─── Demo-mode fixture data ───────────────────────────────────────────────────
const DEMO_LISTS = [
  {
    id: 'demo-1',
    name: 'Compra Semanal',
    status: 'active',
    budget: 8000,
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    shopping_list_items: [{ count: 7 }],
  },
  {
    id: 'demo-2',
    name: 'Almacén',
    status: 'active',
    budget: null,
    updated_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    shopping_list_items: [{ count: 3 }],
  },
  {
    id: 'demo-3',
    name: 'Ferretería',
    status: 'completed',
    budget: null,
    updated_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    shopping_list_items: [{ count: 5 }],
  },
]

const DEMO_SPENDING = 12450.75

// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Derives a short display name from the auth user object.
 * Priority: full_name metadata → email prefix → 'Vos'
 * @param {object|null} user - Supabase auth user
 * @returns {string}
 */
function getDisplayName(user) {
  const fullName = user?.user_metadata?.full_name
  if (fullName) return fullName.split(' ')[0]
  const email = user?.email
  if (email) return email.split('@')[0]
  return 'Vos'
}

/**
 * Derives up-to-2-character initials from a display name.
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * Aggregates all data required by the Dashboard page.
 *
 * In demo mode (localStorage flag), returns fixture data so the dashboard
 * is fully functional without a Supabase session.
 *
 * @returns {{
 *   loading: boolean,
 *   displayName: string,
 *   initials: string,
 *   plan: 'free'|'premium',
 *   activeLists: object[],
 *   recentLists: object[],
 *   monthlySpending: number,
 * }}
 */
export function useDashboard() {
  const { session, plan } = useAuth()
  const isDemoMode = localStorage.getItem('smartcart_demo_mode') === 'true'

  const { data: lists, loading: listsLoading } = useQuery(
    () => isDemoMode ? Promise.resolve(DEMO_LISTS) : listsService.getAll()
  )

  const { data: spending, loading: spendingLoading } = useQuery(
    () => isDemoMode ? Promise.resolve(DEMO_SPENDING) : listItemsService.getMonthlySpending()
  )

  const user = session?.user ?? null
  const displayName = isDemoMode ? 'Demo' : getDisplayName(user)

  const activeLists = lists?.filter((l) => l.status === 'active') ?? []
  const recentLists = lists?.slice(0, 3) ?? []

  return {
    loading: listsLoading || spendingLoading,
    displayName,
    initials: getInitials(displayName),
    plan,   // sourced from profiles table via useAuth — always up to date
    activeLists,
    recentLists,
    monthlySpending: spending ?? 0,
  }
}
