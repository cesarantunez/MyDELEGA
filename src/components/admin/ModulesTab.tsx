import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, X, Plus, UserPlus, Trash2, CheckCircle2, Clock } from 'lucide-react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import EmptyState from '../ui/EmptyState'
import {
  getModules,
  createModule,
  deleteModule,
  assignModule,
  getModuleProgress,
  type TrainingModuleRow,
  type TrainingProgressRow,
} from '../../lib/repositories/training.repository'
import { getDocuments, type DocumentRow } from '../../lib/repositories/document.repository'
import { getActiveUsers, type UserRow } from '../../lib/repositories/user.repository'
import { hapticSuccess } from '../../lib/haptic'

interface Props {
  areas: string[]
}

export default function ModulesTab({ areas }: Props) {
  const [modules, setModules] = useState<TrainingModuleRow[]>([])
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [employees, setEmployees] = useState<UserRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [assigning, setAssigning] = useState<TrainingModuleRow | null>(null)
  const [progressFor, setProgressFor] = useState<TrainingModuleRow | null>(null)
  const [progress, setProgress] = useState<TrainingProgressRow[]>([])

  // Form crear módulo
  const [title, setTitle] = useState('')
  const [area, setArea] = useState('')
  const [content, setContent] = useState('')
  const [linksText, setLinksText] = useState('')
  const [selectedDocs, setSelectedDocs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form asignar
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')

  const load = useCallback(() => {
    getModules().then(setModules).catch(console.error)
  }, [])

  useEffect(() => {
    load()
    getDocuments().then(setDocuments).catch(console.error)
    getActiveUsers().then((us) => setEmployees(us.filter((u) => u.role === 'employee'))).catch(console.error)
  }, [load])

  const handleCreate = async () => {
    if (!title || !area) { setError('Titulo y area son requeridos'); return }
    setError(null)
    setSaving(true)
    try {
      const links = linksText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((url) => ({ label: url.replace(/^https?:\/\//, '').slice(0, 40), url }))
      await createModule({ area, title, content, links, document_ids: selectedDocs })
      hapticSuccess()
      setShowForm(false)
      setTitle(''); setArea(''); setContent(''); setLinksText(''); setSelectedDocs([])
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear')
    } finally {
      setSaving(false)
    }
  }

  const handleAssign = async () => {
    if (!assigning || selectedEmployees.length === 0) return
    await assignModule(assigning.id, assigning.title, selectedEmployees, dueDate || null)
    hapticSuccess()
    setAssigning(null)
    setSelectedEmployees([])
    setDueDate('')
    load()
  }

  const openProgress = async (mod: TrainingModuleRow) => {
    setProgressFor(mod)
    setProgress(await getModuleProgress(mod.id))
  }

  const areaOptions = areas.map((a) => ({ value: a, label: a }))

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Nuevo modulo
        </Button>
      </div>

      {modules.length === 0 && (
        <EmptyState
          icon="tasks"
          title="Sin modulos de capacitacion"
          subtitle="Crea material por area y asignalo a tu personal"
        />
      )}

      <div className="space-y-2">
        {modules.map((mod, i) => (
          <motion.div
            key={mod.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Card className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amarillo/15 flex items-center justify-center flex-shrink-0">
                  <GraduationCap size={17} className="text-amarillo" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-blanco font-medium truncate">{mod.title}</p>
                  <p className="text-[11px] text-blanco/40">
                    {mod.area} · {mod.completed_count}/{mod.assigned_count} completado(s)
                  </p>
                </div>
                <button
                  onClick={() => { setAssigning(mod); setSelectedEmployees([]) }}
                  className="text-amarillo/80 hover:text-amarillo p-2"
                  title="Asignar"
                >
                  <UserPlus size={15} />
                </button>
                <button
                  onClick={async () => { await deleteModule(mod.id); load() }}
                  className="text-blanco/25 hover:text-rojo p-2"
                  title="Eliminar"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              {(mod.assigned_count ?? 0) > 0 && (
                <button
                  onClick={() => openProgress(mod)}
                  className="mt-2 w-full h-2 bg-blanco/10 rounded-full overflow-hidden"
                  title="Ver progreso"
                >
                  <div
                    className="h-full bg-amarillo rounded-full transition-all"
                    style={{ width: `${((mod.completed_count ?? 0) / (mod.assigned_count ?? 1)) * 100}%` }}
                  />
                </button>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Crear módulo */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              className="bg-oscuro border border-blanco/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blanco">Nuevo modulo</h3>
                <button onClick={() => setShowForm(false)} className="text-blanco/40 hover:text-blanco">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <Input id="mod-title" label="Titulo" placeholder="Protocolo de cuarto frio" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Select id="mod-area" label="Area" options={areaOptions} placeholder="Seleccionar area" value={area} onChange={(e) => setArea(e.target.value)} />
                <div>
                  <label className="block text-sm font-medium text-blanco/80 mb-1">Contenido / instrucciones</label>
                  <textarea
                    rows={5}
                    placeholder="Explica el procedimiento paso a paso..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-blanco/10 border border-blanco/20 text-blanco placeholder-blanco/40 focus:outline-none focus:border-amarillo focus:ring-1 focus:ring-amarillo transition-colors resize-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blanco/80 mb-1">Links (uno por linea, opcional)</label>
                  <textarea
                    rows={2}
                    placeholder="https://youtube.com/..."
                    value={linksText}
                    onChange={(e) => setLinksText(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-blanco/10 border border-blanco/20 text-blanco placeholder-blanco/40 focus:outline-none focus:border-amarillo focus:ring-1 focus:ring-amarillo transition-colors resize-none text-sm"
                  />
                </div>
                {documents.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-blanco/80 mb-1">Adjuntar documentos</label>
                    <div className="max-h-32 overflow-y-auto space-y-1 border border-blanco/10 rounded-xl p-2">
                      {documents.map((doc) => (
                        <label key={doc.id} className="flex items-center gap-2 py-1 px-1 rounded-lg hover:bg-blanco/5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedDocs.includes(doc.id)}
                            onChange={(e) =>
                              setSelectedDocs((prev) =>
                                e.target.checked ? [...prev, doc.id] : prev.filter((id) => id !== doc.id)
                              )
                            }
                            className="w-4 h-4 rounded border-blanco/30 bg-blanco/10 text-amarillo"
                          />
                          <span className="text-xs text-blanco/70 truncate">{doc.title} <span className="text-blanco/30">({doc.area})</span></span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-rojo/20 border border-rojo/40 rounded-xl px-4 py-3">
                    <p className="text-rojo text-sm text-center">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" className="flex-1" onClick={handleCreate} disabled={saving}>
                    {saving ? 'Creando...' : 'Crear modulo'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Asignar módulo */}
      <AnimatePresence>
        {assigning && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAssigning(null)}
          >
            <motion.div
              className="bg-oscuro border border-blanco/10 rounded-2xl p-6 w-full max-w-md"
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-semibold text-blanco">Asignar capacitacion</h3>
                <button onClick={() => setAssigning(null)} className="text-blanco/40 hover:text-blanco">
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs text-blanco/40 mb-4 truncate">{assigning.title}</p>

              <div className="space-y-3">
                <div className="max-h-44 overflow-y-auto space-y-1 border border-blanco/10 rounded-xl p-2">
                  {employees.map((emp) => (
                    <label key={emp.id} className="flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-blanco/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={(e) =>
                          setSelectedEmployees((prev) =>
                            e.target.checked ? [...prev, emp.id] : prev.filter((id) => id !== emp.id)
                          )
                        }
                        className="w-4 h-4 rounded border-blanco/30 bg-blanco/10 text-amarillo"
                      />
                      <span className="text-sm text-blanco/80">{emp.name}</span>
                    </label>
                  ))}
                  {employees.length === 0 && (
                    <p className="text-xs text-blanco/30 text-center py-3">Sin empleados activos</p>
                  )}
                </div>
                <Input id="due" label="Fecha limite (opcional)" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setAssigning(null)}>
                    Cancelar
                  </Button>
                  <Button type="button" className="flex-1" onClick={handleAssign} disabled={selectedEmployees.length === 0}>
                    Asignar ({selectedEmployees.length})
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progreso del módulo */}
      <AnimatePresence>
        {progressFor && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setProgressFor(null)}
          >
            <motion.div
              className="bg-oscuro border border-blanco/10 rounded-2xl p-6 w-full max-w-md"
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-semibold text-blanco">Progreso</h3>
                <button onClick={() => setProgressFor(null)} className="text-blanco/40 hover:text-blanco">
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs text-blanco/40 mb-4 truncate">{progressFor.title}</p>

              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {progress.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 py-1.5">
                    {p.status === 'completed' ? (
                      <CheckCircle2 size={15} className="text-amarillo flex-shrink-0" />
                    ) : (
                      <Clock size={15} className="text-blanco/30 flex-shrink-0" />
                    )}
                    <span className="text-sm text-blanco/80 flex-1 truncate">{p.profile_name}</span>
                    <span className="text-[10px] text-blanco/40">
                      {p.status === 'completed'
                        ? `Completado ${p.completed_at?.slice(0, 10) ?? ''}`
                        : p.due_date ? `Limite ${p.due_date}` : 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
