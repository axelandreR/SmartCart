// Temporalmente deshabilitado - testing en laptop
export const SCANNER_DISABLED = true

export const CATEGORIES = [
  { id: 'frutas-verduras', label: 'Frutas y Verduras', emoji: '🥦' },
  { id: 'carnes', label: 'Carnes', emoji: '🥩' },
  { id: 'lacteos', label: 'Lácteos', emoji: '🥛' },
  { id: 'panaderia', label: 'Panadería', emoji: '🍞' },
  { id: 'bebidas', label: 'Bebidas', emoji: '🥤' },
  { id: 'limpieza', label: 'Limpieza', emoji: '🧹' },
  { id: 'higiene', label: 'Higiene Personal', emoji: '🧴' },
  { id: 'congelados', label: 'Congelados', emoji: '🧊' },
  { id: 'snacks', label: 'Snacks', emoji: '🍿' },
  { id: 'condimentos', label: 'Condimentos', emoji: '🫙' },
  { id: 'otros', label: 'Otros', emoji: '📦' },
]

export const LIST_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
}

// Default locale — used as fallback before the user's profile loads.
// Aligns with the primary target market (Peru).
// Components should prefer useLocale() for locale-aware formatting.
export const DEFAULT_LOCALE = {
  COUNTRY:  'PE',
  CURRENCY: 'PEN',
  LOCALE:   'es-PE',
  SYMBOL:   'S/',
}

export const ROUTES = {
  // Root (smart redirect)
  ROOT: '/',

  // Public
  LOGIN:    '/login',
  REGISTER: '/register',

  // Core (authenticated)
  DASHBOARD: '/dashboard',
  PROFILE:   '/profile',
  SCANNER:   '/scanner',
  SETTINGS:  '/settings',
  ANALYTICS: '/analytics',
  HISTORY:   '/history',
  STORES:    '/stores',
  CATEGORIES: '/categories',

  // Shopping lists — canonical new paths
  LISTS:       '/lists',
  CREATE_LIST: '/create-list',
  LIST_DETAIL: (id) => `/lists/${id}`,
  SHOPPING:    (id) => `/shopping/${id}`,  // alias → /lists/:id

  // Products — canonical new paths
  PRODUCTS:      '/products',
  PRODUCT_DETAIL: (id) => `/products/${id}`,
  PRODUCT:        (id) => `/product/${id}`,  // alias → /products/:id
  PRICE_HISTORY:  '/price-history',

  // Budget
  BUDGET:           '/budget',
  BUDGET_SIMULATOR: '/budget-simulator',

  // Premium
  NOTIFICATIONS: '/notifications',
  EXPORT_DATA:   '/export-data',

  // Legacy (kept for backward compatibility)
  HOME:     '/home',
  NEW_LIST: '/lists/new',
}

export const QUERY_KEYS = {
  LISTS: 'shopping_lists',
  LIST: (id) => ['shopping_lists', id],
  PRODUCTS: 'products',
  PRODUCT: (id) => ['products', id],
  PRICE_HISTORY: (id) => ['price_history', id],
  STORES: 'stores',
  CATEGORIES: 'categories',
  BUDGET: 'budget',
}
