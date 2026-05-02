import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, ShoppingCart, Mail, Lock, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useSupabase'
import { cn } from '@/utils/cn'

// ─── Sub-views ────────────────────────────────────────────────────────────────
const VIEWS = { LOGIN: 'login', FORGOT: 'forgot' }

// ─── SmartCart Logo ───────────────────────────────────────────────────────────
function Logo() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-3xl bg-primary-500/20 blur-xl scale-125" />
        <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
          <ShoppingCart className="w-10 h-10 text-white" strokeWidth={1.8} />
          {/* Accent dot */}
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent-500 border-2 border-white flex items-center justify-center">
            <span className="text-white text-[8px] font-bold">$</span>
          </div>
        </div>
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">SmartCart</h1>
        <p className="text-sm text-gray-500 mt-0.5 max-w-[220px] leading-snug">
          Convierte cada compra en inteligencia
        </p>
      </div>
    </div>
  )
}

// ─── Shared field wrapper ─────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-500 font-bold text-[9px]">!</span>
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Login view ───────────────────────────────────────────────────────────────
function LoginView({ onForgot, onDemo }) {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, setError, formState: { errors } } = useForm()

  const onSubmit = async ({ email, password }) => {
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setError('root', { message: error })
    } else {
      localStorage.removeItem('smartcart_demo_mode')
      navigate('/', { replace: true })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {/* Global error */}
      {errors.root && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 animate-fade-in">
          {errors.root.message}
        </div>
      )}

      <Field label="Email" error={errors.email?.message}>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            placeholder="tu@email.com"
            autoComplete="email"
            className={cn(
              'input-field pl-9',
              errors.email && 'border-red-400 focus:ring-red-500/30 focus:border-red-400'
            )}
            {...register('email', {
              required: 'El email es obligatorio.',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Ingresá un email válido.' },
            })}
          />
        </div>
      </Field>

      <Field label="Contraseña" error={errors.password?.message}>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPw ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            className={cn(
              'input-field pl-9 pr-10',
              errors.password && 'border-red-400 focus:ring-red-500/30 focus:border-red-400'
            )}
            {...register('password', {
              required: 'La contraseña es obligatoria.',
              minLength: { value: 6, message: 'Mínimo 6 caracteres.' },
            })}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </Field>

      {/* Forgot password */}
      <div className="flex justify-end -mt-2">
        <button
          type="button"
          onClick={onForgot}
          className="text-xs text-primary-500 hover:text-primary-700 font-medium transition-colors"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      {/* Primary CTA */}
      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-1 text-base"
      >
        {submitting ? (
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          'Iniciar Sesión'
        )}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">o</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Demo mode */}
      <button
        type="button"
        onClick={onDemo}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-secondary-500 text-secondary-600 font-semibold text-sm hover:bg-secondary-50 active:bg-secondary-100 transition-colors"
      >
        <ShoppingCart className="w-4 h-4" />
        Modo Demo
      </button>

      {/* Register link */}
      <p className="text-center text-sm text-gray-500">
        ¿No tenés cuenta?{' '}
        <Link
          to="/register"
          className="text-primary-500 font-semibold hover:text-primary-700 transition-colors"
        >
          Registrarse
        </Link>
      </p>
    </form>
  )
}

// ─── Forgot password view ─────────────────────────────────────────────────────
function ForgotView({ onBack }) {
  const { resetPassword } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const { register, handleSubmit, setError, formState: { errors } } = useForm()

  const onSubmit = async ({ email }) => {
    setSubmitting(true)
    const { error } = await resetPassword(email)
    setSubmitting(false)
    if (error) {
      setError('root', { message: error })
    } else {
      setDone(true)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 -mb-1 self-start"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <div>
        <h2 className="text-lg font-bold text-gray-900">Recuperar contraseña</h2>
        <p className="text-sm text-gray-500">Te enviamos un link a tu email.</p>
      </div>

      {done ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-secondary-50 flex items-center justify-center">
            <Mail className="w-7 h-7 text-secondary-500" />
          </div>
          <p className="text-sm text-gray-600">
            Si el email existe, recibirás el link en minutos. Revisá también la carpeta de spam.
          </p>
          <button type="button" onClick={onBack} className="text-primary-500 font-semibold text-sm">
            Volver al inicio
          </button>
        </div>
      ) : (
        <>
          {errors.root && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {errors.root.message}
            </div>
          )}

          <Field label="Email de tu cuenta" error={errors.email?.message}>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                placeholder="tu@email.com"
                autoFocus
                className={cn('input-field pl-9', errors.email && 'border-red-400')}
                {...register('email', {
                  required: 'Ingresá tu email.',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email no válido.' },
                })}
              />
            </div>
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
          >
            {submitting
              ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Enviar link'
            }
          </button>
        </>
      )}
    </form>
  )
}

// ─── Main LoginScreen ─────────────────────────────────────────────────────────
export default function LoginScreen() {
  const navigate = useNavigate()
  const [view, setView] = useState(VIEWS.LOGIN)
  const { session, loading } = useAuth()

  // Already authenticated → skip login
  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  const handleDemo = () => {
    localStorage.setItem('smartcart_demo_mode', 'true')
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30 flex flex-col">
      {/* Top decorative band */}
      <div className="h-1 bg-gradient-to-r from-primary-500 via-accent-500 to-secondary-500" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm flex flex-col gap-8">

          {/* Logo — only visible on login view */}
          {view === VIEWS.LOGIN && (
            <div className="animate-fade-in">
              <Logo />
            </div>
          )}

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-card p-6 animate-slide-up">
            {view === VIEWS.LOGIN && (
              <LoginView
                onForgot={() => setView(VIEWS.FORGOT)}
                onDemo={handleDemo}
              />
            )}
            {view === VIEWS.FORGOT && (
              <ForgotView onBack={() => setView(VIEWS.LOGIN)} />
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400">
            Al continuar aceptás los{' '}
            <span className="text-primary-500 cursor-pointer hover:underline">Términos de uso</span>
            {' '}y la{' '}
            <span className="text-primary-500 cursor-pointer hover:underline">Política de privacidad</span>
          </p>
        </div>
      </div>
    </div>
  )
}
