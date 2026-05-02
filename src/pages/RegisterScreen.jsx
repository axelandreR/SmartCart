import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  Eye, EyeOff, ShoppingCart, Mail, Lock, User,
  CheckCircle, Zap, Crown, Check,
} from 'lucide-react'
import { useAuth } from '@/hooks/useSupabase'
import { cn } from '@/utils/cn'

// ─── Plan definitions ─────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'free',
    label: 'Gratis',
    sublabel: 'Para empezar',
    price: '$0',
    Icon: Zap,
    recommended: false,
    features: [
      '3 listas activas',
      'Escaneo de productos',
      'Historial 30 días',
    ],
  },
  {
    id: 'premium',
    label: 'Premium',
    sublabel: 'Sin límites',
    price: '$1.499/mes',
    Icon: Crown,
    recommended: true,
    features: [
      'Listas ilimitadas',
      'Historial completo',
      'Alertas de precio',
      'Exportar a Sheets',
      'Analítica avanzada',
    ],
  },
]

// ─── Plan card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, selected, onSelect }) {
  const { Icon } = plan
  return (
    <button
      type="button"
      onClick={() => onSelect(plan.id)}
      aria-pressed={selected}
      className={cn(
        'relative flex flex-col gap-2.5 p-3.5 rounded-2xl border-2 text-left',
        'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        selected && plan.recommended
          ? 'border-primary-500 bg-primary-50/70 shadow-card'
          : selected
          ? 'border-primary-400 bg-primary-50/40'
          : plan.recommended
          ? 'border-primary-200 bg-white hover:border-primary-300 hover:bg-primary-50/20'
          : 'border-gray-200 bg-white hover:border-gray-300'
      )}
    >
      {/* "Recomendado" badge */}
      {plan.recommended && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
          Recomendado
        </span>
      )}

      {/* Icon + name */}
      <div className="flex items-center gap-2 mt-1">
        <div className={cn(
          'w-7 h-7 rounded-xl flex items-center justify-center shrink-0',
          plan.recommended ? 'bg-primary-500' : 'bg-gray-100'
        )}>
          <Icon className={cn('w-3.5 h-3.5', plan.recommended ? 'text-white' : 'text-gray-500')} />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 leading-none">{plan.label}</p>
          <p className="text-[10px] text-gray-400 mt-0.5 leading-none">{plan.sublabel}</p>
        </div>
      </div>

      {/* Price */}
      <p className={cn(
        'text-base font-extrabold leading-none',
        plan.recommended ? 'text-primary-600' : 'text-gray-700'
      )}>
        {plan.price}
      </p>

      {/* Features */}
      <ul className="flex flex-col gap-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-[10px] text-gray-500 leading-snug">
            <Check className={cn(
              'w-2.5 h-2.5 shrink-0 mt-0.5',
              plan.recommended ? 'text-primary-500' : 'text-gray-400'
            )} />
            {f}
          </li>
        ))}
      </ul>

      {/* Selected checkmark */}
      {selected && (
        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </div>
      )}
    </button>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ id, label, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-red-500 flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-500 font-bold text-[9px]">
            !
          </span>
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Success screen ───────────────────────────────────────────────────────────
function SuccessView({ plan }) {
  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-secondary-50 flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-secondary-500" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900">¡Cuenta creada!</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-[260px] mx-auto leading-relaxed">
          Revisá tu email para confirmar tu cuenta. Después podés iniciar sesión.
        </p>
      </div>

      {plan === 'premium' && (
        <div className="w-full bg-accent-50 border border-accent-200 rounded-xl px-4 py-3 text-sm text-accent-700 text-left">
          <p className="font-semibold mb-0.5">Prueba Premium</p>
          <p className="text-xs text-accent-600">
            Tu período de prueba de <strong>7 días gratis</strong> empieza al confirmar el email.
          </p>
        </div>
      )}

      <Link
        to="/login"
        className="btn-primary w-full flex items-center justify-center py-3 text-base"
      >
        Iniciar Sesión
      </Link>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const { signUp, session, loading } = useAuth()
  const [showPw, setShowPw] = useState(false)
  const [plan, setPlan] = useState('premium')
  const [submitting, setSubmitting] = useState(false)
  const [registeredPlan, setRegisteredPlan] = useState(null)

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm()

  // Already authenticated → go home
  if (!loading && session) return <Navigate to="/" replace />

  const onSubmit = async ({ fullName, email, password, terms }) => {
    // Belt-and-suspenders guard (also caught by validation)
    if (!terms) {
      setError('terms', { message: 'Debés aceptar los términos.' })
      return
    }
    setSubmitting(true)
    const { error } = await signUp(email, password, { fullName, plan })
    setSubmitting(false)
    if (error) {
      setError('root', { message: error })
    } else {
      setRegisteredPlan(plan)
    }
  }

  // ── Success state ───────────────────────────────────────────────────────────
  if (registeredPlan !== null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30 flex flex-col">
        <div className="h-1 bg-gradient-to-r from-primary-500 via-accent-500 to-secondary-500" />
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">
            <div className="bg-white rounded-3xl shadow-card p-6">
              <SuccessView plan={registeredPlan} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Register form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30 flex flex-col">
      {/* Top accent band */}
      <div className="h-1 bg-gradient-to-r from-primary-500 via-accent-500 to-secondary-500" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm flex flex-col gap-6">

          {/* Logo + heading */}
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-primary-500/20 blur-xl scale-125" />
              <div className="relative w-16 h-16 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
                <ShoppingCart className="w-8 h-8 text-white" strokeWidth={1.8} />
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-500 border-2 border-white flex items-center justify-center">
                  <span className="text-white text-[7px] font-bold">$</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
              <p className="text-sm text-gray-500 mt-0.5">Empezá a ahorrar en cada compra</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-card p-6 animate-slide-up">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>

              {/* Global error banner */}
              {errors.root && (
                <div
                  role="alert"
                  className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 animate-fade-in"
                >
                  {errors.root.message}
                </div>
              )}

              {/* ── Nombre completo ── */}
              <Field id="fullName" label="Nombre completo" error={errors.fullName?.message}>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="fullName"
                    type="text"
                    placeholder="María García"
                    autoComplete="name"
                    className={cn(
                      'input-field pl-9',
                      errors.fullName && 'border-red-400 focus:ring-red-500/30 focus:border-red-400'
                    )}
                    {...register('fullName', {
                      required: 'El nombre es obligatorio.',
                      minLength: { value: 2, message: 'Mínimo 2 caracteres.' },
                      maxLength: { value: 80, message: 'Máximo 80 caracteres.' },
                      pattern: {
                        value: /^[a-zA-ZÀ-ÿ\s'-]+$/,
                        message: 'Solo se permiten letras y espacios.',
                      },
                    })}
                  />
                </div>
              </Field>

              {/* ── Email ── */}
              <Field id="email" label="Email" error={errors.email?.message}>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    autoComplete="email"
                    className={cn(
                      'input-field pl-9',
                      errors.email && 'border-red-400 focus:ring-red-500/30 focus:border-red-400'
                    )}
                    {...register('email', {
                      required: 'El email es obligatorio.',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Ingresá un email válido.',
                      },
                    })}
                  />
                </div>
              </Field>

              {/* ── Contraseña ── */}
              <Field id="password" label="Contraseña" error={errors.password?.message}>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                    aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>

              {/* ── Confirmar contraseña ── */}
              <Field id="confirm" label="Confirmar contraseña" error={errors.confirm?.message}>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="confirm"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Repetí la contraseña"
                    autoComplete="new-password"
                    className={cn(
                      'input-field pl-9',
                      errors.confirm && 'border-red-400 focus:ring-red-500/30 focus:border-red-400'
                    )}
                    {...register('confirm', {
                      required: 'Confirmá tu contraseña.',
                      validate: (val) =>
                        val === watch('password') || 'Las contraseñas no coinciden.',
                    })}
                  />
                </div>
              </Field>

              {/* ── Selección de plan ── */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-700">Elegí tu plan</p>
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  {PLANS.map((p) => (
                    <PlanCard
                      key={p.id}
                      plan={p}
                      selected={plan === p.id}
                      onSelect={setPlan}
                    />
                  ))}
                </div>
                {plan === 'premium' && (
                  <p className="text-[11px] text-primary-500 font-medium text-center animate-fade-in">
                    7 días de prueba gratis. Cancelá cuando quieras.
                  </p>
                )}
              </div>

              {/* ── Términos y condiciones ── */}
              <div className="flex flex-col gap-1">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5 shrink-0">
                    <input
                      id="terms"
                      type="checkbox"
                      className="sr-only"
                      {...register('terms', {
                        required: 'Debés aceptar los términos para continuar.',
                      })}
                    />
                    {/* Custom checkbox visual */}
                    <div className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors',
                      watch('terms')
                        ? 'bg-primary-500 border-primary-500'
                        : errors.terms
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-300 group-hover:border-primary-400'
                    )}>
                      {watch('terms') && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 leading-snug">
                    Acepto los{' '}
                    <span className="text-primary-500 font-medium hover:underline cursor-pointer">
                      Términos de uso
                    </span>{' '}
                    y la{' '}
                    <span className="text-primary-500 font-medium hover:underline cursor-pointer">
                      Política de privacidad
                    </span>
                  </span>
                </label>
                {errors.terms && (
                  <p role="alert" className="text-xs text-red-500 pl-8">
                    {errors.terms.message}
                  </p>
                )}
              </div>

              {/* ── Submit ── */}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-1 text-base min-h-[48px]"
              >
                {submitting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Crear cuenta'
                )}
              </button>

              {/* ── Link to login ── */}
              <p className="text-center text-sm text-gray-500">
                ¿Ya tenés cuenta?{' '}
                <Link
                  to="/login"
                  className="text-primary-500 font-semibold hover:text-primary-700 transition-colors"
                >
                  Iniciá sesión
                </Link>
              </p>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400">
            SmartCart — Tus datos están seguros con nosotros
          </p>
        </div>
      </div>
    </div>
  )
}
