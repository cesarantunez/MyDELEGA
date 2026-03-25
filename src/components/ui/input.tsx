import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-blanco/80 mb-1">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 rounded-xl bg-blanco/10 border border-blanco/20 text-blanco placeholder-blanco/40',
            'focus:outline-none focus:border-amarillo focus:ring-1 focus:ring-amarillo transition-colors',
            error && 'border-rojo focus:border-rojo focus:ring-rojo',
            className
          )}
          {...props}
        />
        {error && <p className="text-rojo text-xs mt-1">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
