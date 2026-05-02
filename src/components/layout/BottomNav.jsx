import { NavLink } from 'react-router-dom'
import { Home, List, CameraOff, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/utils/cn'
import { SCANNER_DISABLED } from '@/utils/constants'

const NAV_ITEMS = [
  { to: '/dashboard', icon: Home,      label: 'Inicio'   },
  { to: '/lists',     icon: List,      label: 'Listas'   },
  { to: '/scanner',   icon: CameraOff, label: 'Escáner', disabled: SCANNER_DISABLED },
  { to: '/analytics', icon: BarChart2, label: 'Análisis' },
  { to: '/settings',  icon: Settings,  label: 'Ajustes'  },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav h-16">
      {NAV_ITEMS.map(({ to, icon: Icon, label, disabled }) => {
        if (disabled) {
          return (
            // Temporalmente deshabilitado - testing en laptop
            <button
              key={to}
              type="button"
              title="Disponible solo en dispositivos móviles"
              aria-disabled="true"
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs font-medium text-gray-300 cursor-not-allowed opacity-60"
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          )
        }

        return (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs font-medium transition-colors',
                isActive ? 'text-primary-500' : 'text-gray-400 hover:text-gray-600'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('w-5 h-5 transition-transform', isActive && 'scale-110')} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
