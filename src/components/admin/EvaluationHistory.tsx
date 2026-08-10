import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { X, TrendingUp } from 'lucide-react'
import { Card } from '../ui/card'
import { DIMENSION_LABELS, scoreColor } from '../../lib/evaluations/dimensions'
import {
  getEvaluationsFor,
  getEvaluationDetail,
  type EvaluationRow,
  type EvaluationDetail,
} from '../../lib/repositories/evaluation.repository'
import type { UserRow } from '../../lib/repositories/user.repository'

interface Props {
  employee: UserRow
  onClose: () => void
}

export default function EvaluationHistory({ employee, onClose }: Props) {
  const [history, setHistory] = useState<EvaluationRow[]>([])
  const [detail, setDetail] = useState<EvaluationDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getEvaluationsFor(employee.id)
      .then(async (rows) => {
        setHistory(rows)
        if (rows.length > 0) {
          setDetail(await getEvaluationDetail(rows[0].id))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [employee.id])

  const radarData = detail
    ? detail.scores.map((s) => ({
        dimension: DIMENSION_LABELS[s.dimension] ?? s.dimension,
        valor: s.score,
      }))
    : []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="bg-oscuro border border-blanco/10 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-blanco/10 sticky top-0 bg-oscuro z-10">
          <div>
            <h3 className="text-base font-bold text-blanco">Desempeño</h3>
            <p className="text-xs text-blanco/40">{employee.name}</p>
          </div>
          <button onClick={onClose} className="text-blanco/40 hover:text-blanco min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {loading && <p className="text-blanco/30 text-sm text-center py-8">Cargando...</p>}

          {!loading && history.length === 0 && (
            <p className="text-blanco/30 text-sm text-center py-8">
              Aun no hay evaluaciones. Crea la primera con el boton Evaluar.
            </p>
          )}

          {/* Radar de la última evaluación */}
          {detail && (
            <Card className="p-3">
              <p className="text-sm font-semibold text-blanco mb-1">
                Ultima evaluacion · {detail.period}
                <span className="text-amarillo font-bold ml-2">{Number(detail.average).toFixed(2)}</span>
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="#ffffff15" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fill: '#ffffff80', fontSize: 9 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 5]} tickCount={6} tick={{ fill: '#ffffff40', fontSize: 8 }} />
                    <Radar dataKey="valor" stroke="#FFE000" fill="#FFE000" fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip
                      contentStyle={{ background: '#2D2D2D', border: 'none', borderRadius: 12, fontSize: 12 }}
                      itemStyle={{ color: '#FFFFFF' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {/* Detalle por dimensión con comentarios */}
              <div className="space-y-1 mt-2">
                {detail.scores.map((s) => (
                  <div key={s.dimension} className="flex items-start gap-2 text-xs py-0.5">
                    <span className={`font-bold w-4 text-center flex-shrink-0 ${scoreColor(s.score)}`}>{s.score}</span>
                    <span className="text-blanco/70 flex-shrink-0">{DIMENSION_LABELS[s.dimension] ?? s.dimension}</span>
                    {s.comment && <span className="text-blanco/40 italic truncate">— {s.comment}</span>}
                  </div>
                ))}
              </div>
              {detail.notes && (
                <p className="text-xs text-blanco/50 mt-2 pt-2 border-t border-blanco/10 whitespace-pre-wrap">{detail.notes}</p>
              )}
            </Card>
          )}

          {/* Tendencia */}
          {history.length > 1 && (
            <Card className="p-3">
              <p className="text-sm font-semibold text-blanco mb-2 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-amarillo" /> Evolucion
              </p>
              <div className="flex items-end gap-2 h-24">
                {[...history].reverse().map((ev) => {
                  const avg = Number(ev.average)
                  return (
                    <button
                      key={ev.id}
                      onClick={async () => setDetail(await getEvaluationDetail(ev.id))}
                      className="flex-1 flex flex-col items-center gap-1"
                      title={`${ev.period}: ${avg.toFixed(2)}`}
                    >
                      <span className={`text-[10px] font-bold ${scoreColor(avg)}`}>{avg.toFixed(1)}</span>
                      <div className="w-full bg-blanco/10 rounded-t-md relative" style={{ height: '60px' }}>
                        <div
                          className={`absolute bottom-0 left-0 right-0 rounded-t-md ${avg >= 4 ? 'bg-amarillo' : avg >= 3 ? 'bg-azul' : 'bg-rojo'}`}
                          style={{ height: `${(avg / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-blanco/40">{ev.period}</span>
                    </button>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
