import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Sparkles, Send } from 'lucide-react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { DIMENSIONS } from '../../lib/evaluations/dimensions'
import {
  computePrefill,
  createEvaluation,
  currentPeriod,
  type PrefillData,
} from '../../lib/repositories/evaluation.repository'
import type { UserRow } from '../../lib/repositories/user.repository'
import { hapticSuccess } from '../../lib/haptic'

interface Props {
  employee: UserRow
  onClose: () => void
  onSaved: () => void
}

export default function EvaluationForm({ employee, onClose, onSaved }: Props) {
  const [prefill, setPrefill] = useState<PrefillData | null>(null)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    computePrefill(employee.id)
      .then((p) => {
        setPrefill(p)
        // Aplicar sugerencias como punto de partida (el evaluador ajusta)
        setScores((prev) => {
          const next = { ...prev }
          if (p.productividad.score !== null) next.productividad = p.productividad.score
          if (p.conocimiento.score !== null) next.conocimiento = p.conocimiento.score
          return next
        })
      })
      .catch(() => setPrefill(null))
  }, [employee.id])

  const missing = DIMENSIONS.filter((d) => !scores[d.key])
  const extremesWithoutComment = DIMENSIONS.filter((d) => {
    const s = scores[d.key]
    return (s === 1 || s === 5) && !comments[d.key]?.trim()
  })

  const average = DIMENSIONS.every((d) => scores[d.key])
    ? (DIMENSIONS.reduce((sum, d) => sum + scores[d.key], 0) / DIMENSIONS.length).toFixed(2)
    : null

  const handleSubmit = async () => {
    setError(null)
    if (missing.length > 0) {
      setError(`Falta calificar: ${missing.map((d) => d.label).join(', ')}`)
      return
    }
    if (extremesWithoutComment.length > 0) {
      setError(`Las notas de 1 o 5 requieren comentario: ${extremesWithoutComment.map((d) => d.label).join(', ')}`)
      return
    }
    setSaving(true)
    try {
      await createEvaluation({
        profile_id: employee.id,
        period: currentPeriod(),
        notes,
        scores: DIMENSIONS.map((d) => ({
          dimension: d.key,
          score: scores[d.key],
          comment: comments[d.key],
          prefill_score:
            d.key === 'productividad' ? prefill?.productividad.score ?? null
            : d.key === 'conocimiento' ? prefill?.conocimiento.score ?? null
            : null,
        })),
      })
      hapticSuccess()
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
      setSaving(false)
    }
  }

  const suggestionFor = (key: string) =>
    key === 'productividad' ? prefill?.productividad
    : key === 'conocimiento' ? prefill?.conocimiento
    : undefined

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
        className="bg-oscuro border border-blanco/10 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-blanco/10 sticky top-0 bg-oscuro z-10">
          <div>
            <h3 className="text-base font-bold text-blanco">Evaluar desempeño</h3>
            <p className="text-xs text-blanco/40">
              {employee.name} · {currentPeriod()}
              {average && <span className="text-amarillo font-bold"> · promedio {average}</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-blanco/40 hover:text-blanco min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {DIMENSIONS.map((dim) => {
            const suggestion = suggestionFor(dim.key)
            const value = scores[dim.key]
            const needsComment = value === 1 || value === 5

            return (
              <Card key={dim.key} className="p-3 space-y-2">
                <div>
                  <p className="text-sm font-semibold text-blanco">{dim.label}</p>
                  <p className="text-[11px] text-blanco/40 leading-tight">{dim.description}</p>
                  {suggestion && (
                    <p className="text-[11px] mt-1 flex items-center gap-1">
                      <Sparkles size={11} className="text-amarillo flex-shrink-0" />
                      {suggestion.score !== null ? (
                        <span className="text-amarillo">
                          Sugerido: {suggestion.score} — {suggestion.detail}
                        </span>
                      ) : (
                        <span className="text-blanco/30">{suggestion.detail}</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Escala 1-5 */}
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setScores((prev) => ({ ...prev, [dim.key]: n }))}
                      className={`py-2 rounded-lg text-sm font-bold transition-all ${
                        value === n
                          ? n >= 4 ? 'bg-amarillo text-oscuro'
                            : n === 3 ? 'bg-azul text-blanco'
                            : 'bg-rojo text-blanco'
                          : 'bg-blanco/5 text-blanco/40 hover:bg-blanco/10'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                {(needsComment || comments[dim.key]) && (
                  <input
                    type="text"
                    placeholder={needsComment ? 'Comentario obligatorio para 1 o 5' : 'Comentario (opcional)'}
                    value={comments[dim.key] ?? ''}
                    onChange={(e) => setComments((prev) => ({ ...prev, [dim.key]: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg bg-blanco/10 border text-blanco text-xs placeholder-blanco/40 focus:outline-none focus:border-amarillo ${
                      needsComment && !comments[dim.key]?.trim() ? 'border-rojo/60' : 'border-blanco/20'
                    }`}
                  />
                )}
              </Card>
            )
          })}

          {/* Notas generales */}
          <div>
            <label className="block text-sm font-medium text-blanco/80 mb-1">Notas generales (opcional)</label>
            <textarea
              rows={3}
              placeholder="Contexto, acuerdos, plan de mejora..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-blanco/10 border border-blanco/20 text-blanco placeholder-blanco/40 focus:outline-none focus:border-amarillo focus:ring-1 focus:ring-amarillo transition-colors resize-none text-sm"
            />
          </div>

          {error && (
            <div className="bg-rojo/20 border border-rojo/40 rounded-xl px-4 py-3">
              <p className="text-rojo text-sm text-center">{error}</p>
            </div>
          )}

          <p className="text-[10px] text-blanco/30 text-center">
            La evaluacion queda sellada al guardar: no se puede editar ni borrar (bitacora de auditoria).
          </p>

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            <Send size={15} className="mr-1" />
            {saving ? 'Guardando...' : 'Guardar evaluacion'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
