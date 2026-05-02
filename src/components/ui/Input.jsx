import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

const Input = forwardRef(function Input(
  { label, error, hint, className, containerClassName, ...props },
  ref
) {
  return (
    <div className={cn('flex flex-col gap-1', containerClassName)}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          'input-field',
          error && 'border-red-400 focus:ring-red-500/30 focus:border-red-400',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
})

export default Input
