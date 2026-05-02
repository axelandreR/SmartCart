import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Store, Tag, History, Wallet, FileSpreadsheet, Bell,
  ChevronRight, Globe, Shield, Info, Check, Loader2,
  User, LogOut,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import { useAuth } from '@/hooks/useSupabase'
import { useLocale } from '@/hooks/useLocale'
import { getLocaleReference } from '@/services/localeReference'
import { profilesService } from '@/services/profiles'

// ─── Navigation-only sections ─────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    title: 'Datos',
    items: [
      { icon: Store,         label: 'Tiendas',              to: '/stores'        },
      { icon: Tag,           label: 'Categorías',           to: '/categories'    },
      { icon: History,       label: 'Historial de compras', to: '/history'       },
      { icon: Wallet,        label: 'Presupuesto',          to: '/budget'        },
    ],
  },
  {
    title: 'Integraciones',
    items: [
      { icon: FileSpreadsheet, label: 'Google Sheets',      to: '/settings/sheets' },
      { icon: Bell,            label: 'Notificaciones',     to: '/notifications'   },
    ],
  },
  {
    title: 'App',
    items: [
      { icon: Shield, label: 'Privacidad',          to: '/settings/privacy' },
      { icon: Info,   label: 'Acerca de SmartCart', to: '/settings/about'   },
    ],
  },
]

// ─── Region section ───────────────────────────────────────────────────────────
function RegionSettings() {
  const { profile, upgradePlan: _u } = useAuth()        // to refresh profile after save
  const { country: currentCountry, currency: currentCurrency } = useLocale()

  const [ref,      setRef]      = useState(null)        // LocaleReference
  const [country,  setCountry]  = useState(currentCountry)
  const [currency, setCurrency] = useState(currentCurrency)
  const [saving,   setSaving]   = useState(false)
  const [dirty,    setDirty]    = useState(false)

  // Load reference tables once
  useEffect(() => {
    getLocaleReference()
      .then(setRef)
      .catch(() => toast.error('No se pudieron cargar los países'))
  }, [])

  // Sync state when profile loads
  useEffect(() => {
    if (profile) {
      setCountry(profile.country   ?? 'PE')
      setCurrency(profile.currency ?? 'PEN')
      setDirty(false)
    }
  }, [profile])

  // When country changes, auto-set to its default currency
  const handleCountryChange = (code) => {
    setCountry(code)
    const defaultCurrency = ref?.countryMap?.[code]?.default_currency
    if (defaultCurrency) setCurrency(defaultCurrency)
    setDirty(true)
  }

  const handleCurrencyChange = (code) => {
    setCurrency(code)
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await profilesService.update({ country, currency })
      setDirty(false)
      toast.success('Región actualizada')
    } catch (err) {
      console.error('[Settings] save locale', err)
      toast.error('No se pudo guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  const availableCurrencies = ref ? ref.currenciesForCountry(country) : []
  const selectedCountry     = ref?.countryMap?.[country]
  const selectedCurrency    = ref?.currencyMap?.[currency]

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
        Región
      </p>
      <Card className="space-y-4">

        {/* Country picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500">País</label>
          {!ref ? (
            <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-gray-50">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <span className="text-sm text-gray-400">Cargando países…</span>
            </div>
          ) : (
            <div className="relative">
              <select
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 pr-8 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                {ref.countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag_emoji} {c.name}
                  </option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Currency picker — filtered by selected country */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500">Moneda</label>
          {!ref ? (
            <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-gray-50">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <span className="text-sm text-gray-400">Cargando monedas…</span>
            </div>
          ) : (
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 pr-8 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                {availableCurrencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
            </div>
          )}
          {selectedCurrency && (
            <p className="text-[11px] text-gray-400 px-1">
              Los precios se mostrarán como: <strong className="text-gray-600">
                {new Intl.NumberFormat(selectedCurrency.locale, {
                  style: 'currency', currency: selectedCurrency.code, minimumFractionDigits: 2,
                }).format(1250)}
              </strong>
            </p>
          )}
        </div>

        {/* Save button — only shown when there are unsaved changes */}
        {dirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
              : <><Check className="w-4 h-4" /> Guardar región</>
            }
          </button>
        )}

        {/* Current config summary (no unsaved changes) */}
        {!dirty && selectedCountry && selectedCurrency && (
          <div className="flex items-center gap-2 text-xs text-gray-400 pt-1 border-t border-gray-50">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>
              {selectedCountry.flag_emoji} {selectedCountry.name} ·{' '}
              {selectedCurrency.code} ({selectedCurrency.symbol})
            </span>
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Account section ─────────────────────────────────────────────────────────
function AccountSection() {
  const { user, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
      // onAuthStateChange will redirect — but reset state as safety net
    } catch {
      toast.error('No se pudo cerrar sesión')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
        Cuenta
      </p>
      <Card className="p-0 overflow-hidden divide-y divide-gray-50">
        {/* User info row */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-primary-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {user?.user_metadata?.full_name ?? 'Usuario'}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Sign out row */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 transition-colors text-left disabled:opacity-60"
        >
          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            {signingOut
              ? <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
              : <LogOut className="w-4 h-4 text-red-400" />
            }
          </div>
          <span className="flex-1 text-sm font-medium text-red-500">
            {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </span>
        </button>
      </Card>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Settings() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader title="Ajustes" />

      <div className="flex-1 px-4 py-4 pb-24 space-y-5">

        {/* Región — inline, not a navigation link */}
        <RegionSettings />

        {/* Navigation sections */}
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
              {section.title}
            </p>
            <Card className="p-0 overflow-hidden divide-y divide-gray-50">
              {section.items.map((item) => (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-primary-500" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-800">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </Card>
          </div>
        ))}

        {/* Cuenta + cerrar sesión */}
        <AccountSection />

        <p className="text-center text-xs text-gray-400 pb-2">SmartCart v0.1.0</p>
      </div>
    </div>
  )
}
