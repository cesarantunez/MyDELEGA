import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-blanco/80 mb-1">
            {label}
          </label>
        )}
        <select
          id={id}
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 rounded-xl border border-blanco/20 text-blanco',
            'focus:outline-none focus:border-amarillo focus:ring-1 focus:ring-amarillo transition-colors',
            'appearance-none',
            error && 'border-rojo focus:border-rojo focus:ring-rojo',
            className
          )}
          style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMS41TDYgNi41TDExIDEuNSIgc3Ryb2tlPSIjZmZmZmZmODAiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=")',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center',
          }}
          {...props}
        >
          {placeholder && (
            <option value="" className="bg-oscuro text-blanco/40">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-oscuro text-blanco">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-rojo text-xs mt-1">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
