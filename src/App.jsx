import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from '@/hooks/useSupabase'
import { ProtectedRoute, PremiumRoute, SplashLoader } from '@/components/ProtectedRoute'
import BottomNav from '@/components/layout/BottomNav'

// ── Auth pages (public) ───────────────────────────────────────────────────────
import LoginScreen    from '@/pages/LoginScreen'
import RegisterScreen from '@/pages/RegisterScreen'

// ── App pages ─────────────────────────────────────────────────────────────────
import Dashboard     from '@/pages/Dashboard'
import Home          from '@/pages/Home'           // legacy shell at /home
import ShoppingLists from '@/pages/ShoppingLists'
import ListDetail    from '@/pages/ListDetail'
import CreateNewList      from '@/pages/CreateNewList'
import ActiveShoppingList from '@/pages/ActiveShoppingList'
import Scanner             from '@/pages/Scanner'
import BarcodeScanner      from '@/pages/BarcodeScanner'
import ManualProductSearch from '@/pages/ManualProductSearch'
import Products      from '@/pages/Products'
import ProductDetail from '@/pages/ProductDetail'
import PriceHistory  from '@/pages/PriceHistory'
import Stores        from '@/pages/Stores'
import Categories    from '@/pages/Categories'
import History       from '@/pages/History'
import Budget           from '@/pages/Budget'
import BudgetSimulator  from '@/pages/BudgetSimulator'
import Analytics     from '@/pages/Analytics'
import Settings      from '@/pages/Settings'
import Profile       from '@/pages/Profile'

// ── Premium pages ─────────────────────────────────────────────────────────────
import Notifications from '@/pages/Notifications'
import ExportData    from '@/pages/ExportData'

// ─── Routes that hide the bottom nav (full-screen experience) ─────────────────
const FULLSCREEN_PATHS = ['/scanner', '/barcode-scanner', '/login', '/register', '/create-list', '/lists/new']

// ─── AppLayout ────────────────────────────────────────────────────────────────
// Layout route component: renders <Outlet /> + conditionally shows BottomNav.
// Uses useLocation (reactive) instead of window.location (stale on navigation).
function AppLayout() {
  const { pathname } = useLocation()
  const isFullscreen = FULLSCREEN_PATHS.some((p) => pathname.startsWith(p))

  return (
    <>
      <Outlet />
      {!isFullscreen && <BottomNav />}
    </>
  )
}

// ─── Redirect wrappers for new canonical paths ────────────────────────────────
// /product/:productId → /products/:productId  (ProductDetail reads param "id")
function ProductRedirect() {
  const { productId } = useParams()
  return <Navigate to={`/products/${productId}`} replace />
}

// ─── Root smart redirect ──────────────────────────────────────────────────────
// / → /dashboard when authenticated or in demo mode, /login otherwise.
function RootRedirect() {
  const { session, loading } = useAuth()
  const isDemo = localStorage.getItem('smartcart_demo_mode') === 'true'

  if (loading) return <SplashLoader />
  if (session || isDemo) return <Navigate to="/dashboard" replace />
  return <Navigate to="/login" replace />
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '12px', fontFamily: 'Inter, sans-serif', fontSize: '14px' },
        }}
      />

      <Routes>

        {/* ── Root redirect ──────────────────────────────────────────────────── */}
        <Route path="/" element={<RootRedirect />} />

        {/* ── Public routes (no auth required) ───────────────────────────────── */}
        <Route path="/login"    element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />

        {/* ── Standard protected routes ───────────────────────────────────────── */}
        {/* Auth check → AppLayout (BottomNav) → page */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>

            {/* Dashboard — canonical home */}
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/home"       element={<Home />} />       {/* legacy shell */}

            {/* Profile */}
            <Route path="/profile"    element={<Profile />} />

            {/* Shopping lists */}
            <Route path="/lists"                element={<ShoppingLists />} />
            <Route path="/lists/new"            element={<CreateNewList />} />
            <Route path="/create-list"          element={<CreateNewList />} /> {/* canonical */}
            <Route path="/lists/:id"            element={<ListDetail />} />
            <Route path="/shopping/:listId"     element={<ActiveShoppingList />} />

            {/* Scanner — full-screen (BottomNav hidden via FULLSCREEN_PATHS) */}
            <Route path="/scanner"              element={<Scanner />} />
            <Route path="/barcode-scanner"      element={<BarcodeScanner />} />
            <Route path="/product-search"       element={<ManualProductSearch />} />

            {/* Products */}
            <Route path="/products"             element={<Products />} />
            <Route path="/products/:id"         element={<ProductDetail />} />
            <Route path="/product/:productId"   element={<ProductRedirect />} />  {/* canonical → alias */}
            <Route path="/products/:id/prices"  element={<PriceHistory />} />
            <Route path="/price-history"        element={<PriceHistory />} />     {/* standalone */}

            {/* Budget */}
            <Route path="/budget"               element={<Budget />} />
            <Route path="/budget-simulator"     element={<BudgetSimulator />} />  {/* canonical */}

            {/* Other sections */}
            <Route path="/stores"               element={<Stores />} />
            <Route path="/categories"           element={<Categories />} />
            <Route path="/history"              element={<History />} />
            <Route path="/analytics"            element={<Analytics />} />
            <Route path="/settings"             element={<Settings />} />

          </Route>
        </Route>

        {/* ── Premium-only routes ─────────────────────────────────────────────── */}
        {/* Auth check + plan check → AppLayout → page */}
        <Route element={<PremiumRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/export-data"   element={<ExportData />} />
          </Route>
        </Route>

        {/* ── 404 fallback ────────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </BrowserRouter>
  )
}
