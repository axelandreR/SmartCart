import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/utils/cn'

export default function PageHeader({ title, subtitle, back = false, actions, className }) {
  const navigate = useNavigate()

  return (
    <header className={cn('page-header flex items-center gap-3', className)}>
      {back && (
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1.5 rounded-xl hover:bg-gray-100 transition-colors"
          aria-label="Volver"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  )
}
