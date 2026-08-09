import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Award, X, Plus, Trash2 } from 'lucide-react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import EmptyState from '../ui/EmptyState'
import { supabase } from '../../lib/supabase'
import {
  getSkillChecklists,
  createSkillChecklist,
  getSkillChecks,
  toggleSkillCheck,
  type SkillChecklistRow,
  type SkillCheckRow,
} from '../../lib/repositories/training.repository'
import { getActiveUsers, type UserRow } from '../../lib/repositories/user.repository'
import { hapticSuccess, hapticLight } from '../../lib/haptic'

interface Props {
  areas: string[]
}

export default function SkillsTab({ areas }: Props) {
  const [checklists, setChecklists] = useState<SkillChecklistRow[]>([])
  const [employees, setEmployees] = useState<UserRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [verifying, setVerifying] = useState<SkillChecklistRow | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [checks, setChecks] = useState<SkillCheckRow[]>([])

  // Form
  const [title, setTitle] = useState('')
  const [area, setArea] = useState('')
  const [itemsText, setItemsText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    getSkillChecklists().then(setChecklists).catch(console.error)
  }, [])

  useEffect(() => {
    load()
    getActiveUsers().then((us) => setEmployees(us.filter((u) => u.role === 'employee'))).catch(console.error)
  }, [load])

  const loadChecks = useCallback(async (checklist: SkillChecklistRow, employeeId: string) => {
    if (!employeeId) { setChecks([]); return }
    setChecks(await getSkillChecks(checklist.items.map((i) => i.id), employeeId))
  }, [])

  const handleCreate = async () => {
    const items = itemsText.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!title || !area || items.length === 0) {
      setError('Titulo, area y al menos un punto son requeridos')
      return
    }
    setError(null)
    try {
      await createSkillChecklist(area, title, items)
      hapticSuccess()
      setShowForm(false)
      setTitle(''); setArea(''); setItemsText('')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear')
    }
  }

  const handleToggle = async (itemId: string) => {
    if (!verifying || !selectedEmployee) return
    hapticLight()
    const isChecked = checks.some((c) => c.item_id === itemId)
    await toggleSkillCheck(itemId, selectedEmployee, isChecked)
    await loadChecks(verifying, selectedEmployee)
  }

  const areaOptions = areas.map((a) => ({ value: a, label: a }))
  const employeeOptions = [
    { value: '', label: 'Elegir empleado...' },
    ...employees.map((e) => ({ value: e.id, label: e.name })),
  ]

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Nueva checklist
        </Button>
      </div>

      {checklists.length === 0 && (
        <EmptyState
          icon="checklist"
          title="Sin checklists de conocimiento"
          subtitle='Define que debe saber cada puesto ("sabe hacer arqueo", "conoce el protocolo...") y marca lo verificado en persona'
        />
      )}

      <div className="space-y-2">
        {checklists.map((cl, i) => (
          <motion.div
            key={cl.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Card
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-blanco/5"
              onClick={() => { setVerifying(cl); setSelectedEmployee(''); setChecks([]) }}
            >
              <div className="w-9 h-9 rounded-xl bg-rosa/15 flex items-center justify-center flex-shrink-0">
                <Award size={17} className="text-rosa" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-blanco font-medium truncate">{cl.title}</p>
                <p className="text-[11px] text-blanco/40">{cl.area} · {cl.items.length} punto(s)</p>
              </div>
              <button
                onClick={async (e) => {
                  e.stopPropagation()
                  await supabase.from('skill_checklists').delete().eq('id', cl.id)
                  load()
                }}
                className="text-blanco/25 hover:text-rojo p-2"
                title="Eliminar"
              >
                <Trash2 size={15} />
              </button>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Crear checklist */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              className="bg-oscuro border border-blanco/10 rounded-2xl p-6 w-full max-w-md"
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blanco">Checklist de conocimiento</h3>
                <button onClick={() => setShowForm(false)} className="text-blanco/40 hover:text-blanco">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <Input id="sk-title" label="Titulo / puesto" placeholder="Cajero: lo que debe dominar" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Select id="sk-area" label="Area" options={areaOptions} placeholder="Seleccionar area" value={area} onChange={(e) => setArea(e.target.value)} />
                <div>
                  <label className="block text-sm font-medium text-blanco/80 mb-1">Puntos a verificar (uno por linea)</label>
                  <textarea
                    rows={5}
                    placeholder={'Sabe hacer arqueo de caja\nConoce el protocolo de devoluciones\nManeja la terminal bancaria'}
                    value={itemsText}
                    onChange={(e) => setItemsText(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-blanco/10 border border-blanco/20 text-blanco placeholder-blanco/40 focus:outline-none focus:border-amarillo focus:ring-1 focus:ring-amarillo transition-colors resize-none text-sm"
                  />
                </div>

                {error && (
                  <div className="bg-rojo/20 border border-rojo/40 rounded-xl px-4 py-3">
                    <p className="text-rojo text-sm text-center">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" className="flex-1" onClick={handleCreate}>
                    Crear
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verificar conocimiento en persona */}
      <AnimatePresence>
        {verifying && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setVerifying(null)}
          >
            <motion.div
              className="bg-oscuro border border-blanco/10 rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto"
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-semibold text-blanco">Verificar conocimiento</h3>
                <button onClick={() => setVerifying(null)} className="text-blanco/40 hover:text-blanco">
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs text-blanco/40 mb-4 truncate">{verifying.title} · {verifying.area}</p>

              <div className="space-y-3">
                <Select
                  options={employeeOptions}
                  value={selectedEmployee}
                  onChange={async (e) => {
                    setSelectedEmployee(e.target.value)
                    await loadChecks(verifying, e.target.value)
                  }}
                />

                {selectedEmployee && (
                  <div className="space-y-1">
                    {verifying.items.map((item) => {
                      const check = checks.find((c) => c.item_id === item.id)
                      return (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-blanco/5 cursor-pointer min-h-[44px]"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(check)}
                            onChange={() => handleToggle(item.id)}
                            className="w-5 h-5 rounded border-blanco/30 bg-blanco/10 text-amarillo focus:ring-amarillo focus:ring-offset-0 focus:ring-1"
                          />
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm ${check ? 'text-blanco' : 'text-blanco/60'}`}>{item.title}</span>
                            {check && (
                              <p className="text-[10px] text-blanco/30">
                                Verificado por {check.verified_by_name ?? 'manager'} · {check.verified_at.slice(0, 10)}
                              </p>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
                {!selectedEmployee && (
                  <p className="text-xs text-blanco/30 text-center py-4">
                    Elige a la persona que estas evaluando en persona
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
