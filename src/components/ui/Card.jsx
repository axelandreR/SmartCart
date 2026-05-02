import { cn } from '@/utils/cn'

export default function Card({ className, children, onClick, ...props }) {
  const isClickable = !!onClick
  return (
    <div
      className={cn(
        'card',
        isClickable && 'cursor-pointer hover:shadow-card-hover active:scale-[0.99] transition-all duration-150',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}
