import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

// ══════════════════════════════════════════════════════════════
// El Panal — UX firmada en SPEC-V2 §M5.1.
// Celdas hexagonales que "entran volando" al panal (enjambre) y
// se llenan de miel al completarse. Reutilizable para tareas,
// capacitacion y quizzes.
// ══════════════════════════════════════════════════════════════

export type HexState = 'pending' | 'in_progress' | 'completed' | 'overdue'

export interface HexItem {
  id: string
  title: string
  subtitle?: string
  state: HexState
  icon?: ReactNode
  onClick?: () => void
}

const STATE_STYLES: Record<HexState, { cell: string; text: string; sub: string }> = {
  // Pendiente: panal vacio delineado de miel
  pending: { cell: 'bg-amarillo/15', text: 'text-amarillo', sub: 'text-blanco/50' },
  // En curso: celda azul
  in_progress: { cell: 'bg-azul/80', text: 'text-blanco', sub: 'text-blanco/70' },
  // Completada: celda llena de miel
  completed: { cell: 'bg-amarillo', text: 'text-oscuro', sub: 'text-oscuro/60' },
  // Vencida: alerta
  overdue: { cell: 'bg-rojo/85', text: 'text-blanco', sub: 'text-blanco/70' },
}

const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'

export function HexCard({ item, index }: { item: HexItem; index: number }) {
  const style = STATE_STYLES[item.state]

  // Enjambre: cada celda entra volando desde una direccion distinta
  const fromX = (index % 3 === 0 ? -1 : index % 3 === 1 ? 1 : 0) * 120
  const fromY = -90 - (index % 4) * 30

  return (
    <motion.button
      type="button"
      onClick={item.onClick}
      initial={{ opacity: 0, x: fromX, y: fromY, scale: 0.4, rotate: index % 2 === 0 ? -12 : 12 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 260, damping: 20 }}
      whileTap={{ scale: 0.94 }}
      className={`relative ${style.cell} flex flex-col items-center justify-center text-center px-3`}
      style={{
        clipPath: HEX_CLIP,
        width: '110px',
        height: '124px',
      }}
    >
      {item.icon && <span className={`mb-1 ${style.text}`}>{item.icon}</span>}
      <span className={`text-[11px] font-semibold leading-tight line-clamp-2 ${style.text}`}>
        {item.title}
      </span>
      {item.subtitle && (
        <span className={`text-[9px] leading-tight mt-0.5 line-clamp-1 ${style.sub}`}>
          {item.subtitle}
        </span>
      )}
    </motion.button>
  )
}

/**
 * Panal: filas alternadas 3-2-3-2 que se entrelazan como celdas de colmena.
 */
export function HoneycombGrid({ items }: { items: HexItem[] }) {
  // Partir en filas alternas de 3 y 2
  const rows: HexItem[][] = []
  let i = 0
  let rowSize = 3
  while (i < items.length) {
    rows.push(items.slice(i, i + rowSize))
    i += rowSize
    rowSize = rowSize === 3 ? 2 : 3
  }

  let counter = 0

  return (
    <div className="flex flex-col items-center">
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="flex justify-center gap-1.5"
          style={{ marginTop: rowIndex === 0 ? 0 : '-28px' }}
        >
          {row.map((item) => {
            const index = counter++
            return <HexCard key={item.id} item={item} index={index} />
          })}
        </div>
      ))}
    </div>
  )
}
