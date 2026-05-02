import { cn } from '@/utils/cn'

const variants = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  ghost:     'btn-ghost',
  accent:    'btn-accent',
  danger:    'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed select-none',
}

const sizes = {
  sm: 'text-sm px-3 py-1.5',
  md: '',
  lg: 'text-base px-6 py-3',
  icon: 'p-2.5',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  loading = false,
  children,
  ...props
}) {
  return (
    <button
      className={cn(variants[variant], sizes[size], 'relative', className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </span>
      )}
      <span className={cn(loading && 'invisible')}>{children}</span>
    </button>
  )
}
