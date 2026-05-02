import { cn } from '@/utils/cn'

const variants = {
  primary:   'bg-primary-100 text-primary-700',
  secondary: 'bg-secondary-100 text-secondary-700',
  accent:    'bg-accent-100 text-accent-700',
  success:   'bg-green-100 text-green-700',
  warning:   'bg-yellow-100 text-yellow-700',
  danger:    'bg-red-100 text-red-700',
  gray:      'bg-gray-100 text-gray-600',
}

export default function Badge({ variant = 'gray', className, children }) {
  return (
    <span className={cn('badge', variants[variant], className)}>
      {children}
    </span>
  )
}
