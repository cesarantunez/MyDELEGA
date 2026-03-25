import { cn } from '../../lib/utils'

const priorityStyles = {
  low: 'bg-azul/20 text-azul border-azul/30',
  medium: 'bg-amarillo/20 text-amarillo border-amarillo/30',
  high: 'bg-rosa/20 text-rosa border-rosa/30',
  urgent: 'bg-rojo/20 text-rojo border-rojo/30',
} as const

const statusStyles = {
  pending: 'bg-amarillo/20 text-amarillo',
  in_progress: 'bg-azul/20 text-azul',
  completed: 'bg-rosa/20 text-rosa',
  cancelled: 'bg-blanco/10 text-blanco/50',
  overdue: 'bg-rojo/20 text-rojo',
} as const

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'priority' | 'status' | 'default'
  value?: string
}

export function Badge({ variant = 'default', value, className, children, ...props }: BadgeProps) {
  let style = 'bg-blanco/10 text-blanco/70'

  if (variant === 'priority' && value && value in priorityStyles) {
    style = priorityStyles[value as keyof typeof priorityStyles]
  } else if (variant === 'status' && value && value in statusStyles) {
    style = statusStyles[value as keyof typeof statusStyles]
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-transparent',
        style,
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export const priorityLabels: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}

export const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  overdue: 'Vencida',
}
