// ══════════════════════════════════════════════════════════════
// Las 10 dimensiones de evaluación de desempeño (SPEC V2 §M6).
// 'productividad' y 'conocimiento' se pre-llenan con datos
// reales del sistema; el evaluador ajusta, no inventa.
// Pesos por vertical = fase futura (evaluation_templates).
// ══════════════════════════════════════════════════════════════

export interface Dimension {
  key: string
  label: string
  description: string
  /** true si el sistema sugiere un valor a partir de datos reales */
  prefilled: boolean
}

export const DIMENSIONS: Dimension[] = [
  {
    key: 'productividad',
    label: 'Productividad',
    description: 'Cumplimiento de tareas asignadas en tiempo (se sugiere solo con los datos del sistema)',
    prefilled: true,
  },
  {
    key: 'calidad',
    label: 'Calidad del trabajo',
    description: 'Bien hecho a la primera, sin retrabajos',
    prefilled: false,
  },
  {
    key: 'conocimiento',
    label: 'Conocimiento del puesto',
    description: 'Domina su area (se sugiere con capacitaciones completadas y conocimiento verificado)',
    prefilled: true,
  },
  {
    key: 'confiabilidad',
    label: 'Confiabilidad',
    description: 'Asistencia, puntualidad y cumplimiento de turnos',
    prefilled: false,
  },
  {
    key: 'integridad',
    label: 'Integridad y honestidad',
    description: 'Manejo de dinero e inventario, reportes veraces',
    prefilled: false,
  },
  {
    key: 'iniciativa',
    label: 'Iniciativa y creatividad',
    description: 'Propone mejoras y resuelve sin esperar orden',
    prefilled: false,
  },
  {
    key: 'equipo',
    label: 'Trabajo en equipo',
    description: 'Colaboracion y comunicacion con el resto del personal',
    prefilled: false,
  },
  {
    key: 'servicio',
    label: 'Servicio al cliente',
    description: 'Trato al cliente y resolucion de sus necesidades',
    prefilled: false,
  },
  {
    key: 'seguridad',
    label: 'Seguridad e higiene',
    description: 'Cumple protocolos y usa el equipo correctamente',
    prefilled: false,
  },
  {
    key: 'recursos',
    label: 'Cuidado de recursos',
    description: 'Cuida equipo e insumos, minimiza merma y desperdicio',
    prefilled: false,
  },
]

export const DIMENSION_LABELS: Record<string, string> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.key, d.label])
)

export function scoreColor(score: number): string {
  if (score >= 4) return 'text-amarillo'
  if (score >= 3) return 'text-azul'
  return 'text-rojo'
}
