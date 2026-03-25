import { cn } from '../../lib/utils'

const variants = {
  primary: 'bg-amarillo text-oscuro hover:bg-amarillo/90',
  secondary: 'bg-blanco/10 text-blanco hover:bg-blanco/20',
  danger: 'bg-rojo/20 text-rojo hover:bg-rojo/30',
  ghost: 'text-blanco/60 hover:text-blanco hover:bg-blanco/10',
} as const

const sizes = {
  sm: 'px-3 py-2 text-sm min-h-[44px]',
  md: 'px-4 py-2.5 text-sm min-h-[44px]',
  lg: 'px-6 py-3 text-base min-h-[48px]',
} as const

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all active:scale-[0.98]',
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
