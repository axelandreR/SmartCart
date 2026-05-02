/**
 * Route guard components for SmartCart.
 *
 * Usage in App.jsx (React Router v6 layout-route pattern):
 *
 *   // Standard auth gate
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *   </Route>
 *
 *   // Premium gate (also checks auth first)
 *   <Route element={<PremiumRoute />}>
 *     <Route path="/export-data" element={<ExportData />} />
 *   </Route>
 *
 * Both components render <Outlet /> on success, so they compose with
 * any layout route (AppLayout, etc.) without prop drilling.
 */

import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import { Crown, Lock, ShoppingCart } from 'lucide-react'
import { useAuth } from '@/hooks/useSupabase'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isDemoMode() {
  return localStorage.getItem('smartcart_demo_mode') === 'true'
}

// ─── Splash loader (shown while session resolves) ─────────────────────────────
export function SplashLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
      <div className="relative">
        <div className="absolute inset-0 rounded-3xl bg-primary-500/20 blur-xl scale-125" />
        <div className="relative w-14 h-14 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
          <ShoppingCart className="w-7 h-7 text-white" strokeWidth={1.8} />
        </div>
      </div>
      <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
    </div>
  )
}

// ─── Premium gate (shown to free-plan users on premium routes) ────────────────
function PremiumGate() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col min-h-full items-center justify-center px-6 py-16 bg-gray-50">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">

        {/* Icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-card">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-white shadow flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>

        {/* Text */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">Función Premium</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Esta sección es exclusiva del plan Premium. Actualizá tu cuenta para
            desbloquear exportaciones, notificaciones avanzadas y mucho más.
          </p>
        </div>

        {/* Benefits list */}
        <ul className="w-full text-left space-y-2">
          {[
            'Listas ilimitadas',
            'Historial de precios completo',
            'Alertas de precio personalizadas',
            'Exportar datos a Google Sheets',
            'Analítica avanzada de gastos',
          ].map((benefit) => (
            <li key={benefit} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-4 h-4 rounded-full bg-accent-100 text-accent-600 flex items-center justify-center shrink-0 text-[10px] font-bold">
                ✓
              </span>
              {benefit}
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <div className="w-full flex flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="btn-accent w-full py-3 text-base"
          >
            Ver planes
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-ghost w-full py-2.5 text-sm"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
/**
 * Renders <Outlet /> when the user has a valid session or demo mode is active.
 * Redirects to /login otherwise. Shows SplashLoader while auth resolves.
 */
export function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) return <SplashLoader />
  if (!session && !isDemoMode()) return <Navigate to="/login" replace />

  return <Outlet />
}

// ─── PremiumRoute ─────────────────────────────────────────────────────────────
/**
 * Extends ProtectedRoute: also verifies the user's plan is 'premium'.
 * `plan` is read from the `profiles` DB table (source of truth) via useAuth,
 * so upgrading a user's plan is reflected immediately — no JWT refresh needed.
 * Demo mode gets full access so stakeholders can preview all features.
 */
export function PremiumRoute() {
  const { session, plan, loading } = useAuth()

  if (loading) return <SplashLoader />
  if (!session && !isDemoMode()) return <Navigate to="/login" replace />
  if (plan !== 'premium' && !isDemoMode()) return <PremiumGate />

  return <Outlet />
}
