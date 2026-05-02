import { cn } from '@/utils/cn'

export default function LoadingSpinner({ size = 'md', className }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className={cn('border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin', sizes[size])} />
    </div>
  )
}
