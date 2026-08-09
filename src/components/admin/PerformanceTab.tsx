import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardCheck, BarChart3 } from 'lucide-react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import EmptyState from '../ui/EmptyState'
import { getActiveUsers, type UserRow } from '../../lib/repositories/user.repository'
import { getLatestEvaluations, type EvaluationRow } from '../../lib/repositories/evaluation.repository'
import { scoreColor } from '../../lib/evaluations/dimensions'
import EvaluationForm from './EvaluationForm'
import EvaluationHistory from './EvaluationHistory'

export default function PerformanceTab() {
  const [employees, setEmployees] = useState<UserRow[]>([])
  const [latest, setLatest] = useState<Map<string, EvaluationRow>>(new Map())
  const [evaluating, setEvaluating] = useState<UserRow | null>(null)
  const [viewing, setViewing] = useState<UserRow | null>(null)

  const load = useCallback(() => {
    getActiveUsers()
      .then((us) => setEmployees(us.filter((u) => u.role === 'employee')))
      .catch(console.error)
    getLatestEvaluations().then(setLatest).catch(console.error)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-3">
      {employees.length === 0 && (
        <EmptyState
          icon="tasks"
          title="Sin empleados activos"
          subtitle="Invita a tu equipo para poder evaluarlo"
        />
      )}

      <div className="space-y-2">
        {employees.map((emp, i) => {
          const ev = latest.get(emp.id)
          const avg = ev ? Number(ev.average) : null
          return (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 rounded-xl bg-blanco/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {emp.avatar_url ? (
                    <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-blanco/50 font-bold text-sm">{emp.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-blanco font-medium truncate">{emp.name}</p>
                  <p className="text-[11px] text-blanco/40">
                    {ev
                      ? <>Ultima: {ev.period} · <span className={`font-bold ${scoreColor(avg!)}`}>{avg!.toFixed(2)}</span>/5</>
                      : 'Sin evaluaciones aun'}
                  </p>
                </div>
                {ev && (
                  <button
                    onClick={() => setViewing(emp)}
                    className="text-azul hover:bg-azul/10 rounded-lg p-2"
                    title="Historial y radar"
                  >
                    <BarChart3 size={16} />
                  </button>
                )}
                <Button size="sm" onClick={() => setEvaluating(emp)}>
                  <ClipboardCheck size={14} className="mr-1" /> Evaluar
                </Button>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {evaluating && (
          <EvaluationForm
            employee={evaluating}
            onClose={() => setEvaluating(null)}
            onSaved={() => { setEvaluating(null); load() }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewing && (
          <EvaluationHistory employee={viewing} onClose={() => setViewing(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
