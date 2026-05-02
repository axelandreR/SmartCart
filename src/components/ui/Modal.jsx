import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

export default function Modal({ open, onClose, title, children, className }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className={cn(
        'relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl',
        'shadow-xl animate-slide-up px-4 pt-4 pb-8',
        className
      )}>
        {/* Drag handle (mobile) */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
