import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, X, Link2, FileText, CheckCircle2, Award, Clock } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import EmptyState from '../../components/ui/EmptyState'
import { HoneycombGrid, type HexItem, type HexState } from '../../components/ui/HoneycombGrid'
import { useAuthStore } from '../../stores/auth.store'
import {
  getMyTraining,
  completeMyModule,
  getSkillChecklists,
  getSkillChecks,
  type MyTrainingItem,
  type SkillChecklistRow,
  type SkillCheckRow,
} from '../../lib/repositories/training.repository'
import { getDocuments, getDocumentUrl, type DocumentRow } from '../../lib/repositories/document.repository'
import { hapticSuccess } from '../../lib/haptic'

function trainingState(item: MyTrainingItem): HexState {
  if (item.status === 'completed') return 'completed'
  if (item.due_date && new Date(item.due_date + 'T23:59:59') < new Date()) return 'overdue'
  return 'pending'
}

export default function LearnPage() {
  const user = useAuthStore((s) => s.user)
  const [items, setItems] = useState<MyTrainingItem[]>([])
  const [selected, setSelected] = useState<MyTrainingItem | null>(null)
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [mySkills, setMySkills] = useState<{ checklist: SkillChecklistRow; checks: SkillCheckRow[] }[]>([])
  const [completing, setCompleting] = useState(false)

  const load = useCallback(() => {
    if (!user) return
    getMyTraining(user.id).then(setItems).catch(console.error)
    // Conocimientos validados en persona
    getSkillChecklists()
      .then(async (cls) => {
        const withChecks = await Promise.all(
          cls.map(async (checklist) => ({
            checklist,
            checks: await getSkillChecks(checklist.items.map((i) => i.id), user.id),
          }))
        )
        setMySkills(withChecks.filter((s) => s.checks.length > 0))
      })
      .catch(console.error)
  }, [user])

  useEffect(() => { load() }, [load])

  // Documentos adjuntos del módulo abierto
  useEffect(() => {
    if (!selected || selected.module.document_ids.length === 0) { setDocs([]); return }
    getDocuments()
      .then((all) => setDocs(all.filter((d) => selected.module.document_ids.includes(d.id))))
      .catch(() => setDocs([]))
  }, [selected])

  const handleComplete = async () => {
    if (!selected) return
    setCompleting(true)
    await completeMyModule(selected.progress_id)
    hapticSuccess()
    setCompleting(false)
    setSelected(null)
    load()
  }

  const completedCount = items.filter((i) => i.status === 'completed').length
  const pct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0

  const hexItems: HexItem[] = items.map((item) => ({
    id: item.progress_id,
    title: item.module.title,
    subtitle: item.due_date ? `limite ${item.due_date}` : item.module.area,
    state: trainingState(item),
    icon: item.status === 'completed' ? <CheckCircle2 size={16} /> : <GraduationCap size={16} />,
    onClick: () => setSelected(item),
  }))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-blanco">Aprender</h2>
        <p className="text-blanco/50 text-sm">
          {items.length} capacitacion(es) · {pct}% de miel
        </p>
      </div>

      {items.length === 0 && (
        <EmptyState
          icon="tasks"
          title="Sin capacitaciones asignadas"
          subtitle="Cuando te asignen material de tu area, aparecera volando aqui"
        />
      )}

      {items.length > 0 && <HoneycombGrid items={hexItems} />}

      {/* Conocimientos validados */}
      {mySkills.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-blanco mb-2 flex items-center gap-2">
            <Award size={15} className="text-rosa" /> Conocimiento validado
          </p>
          <div className="space-y-2">
            {mySkills.map(({ checklist, checks }) => (
              <Card key={checklist.id} className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm text-blanco font-medium truncate">{checklist.title}</p>
                  <span className="text-[10px] text-rosa font-bold">
                    {checks.length}/{checklist.items.length}
                  </span>
                </div>
                <div className="h-1.5 bg-blanco/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rosa rounded-full"
                    style={{ width: `${(checks.length / Math.max(checklist.items.length, 1)) * 100}%` }}
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Detalle del módulo */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-oscuro border border-blanco/10 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-blanco/10 sticky top-0 bg-oscuro z-10">
                <h3 className="text-base font-bold text-blanco">Capacitacion</h3>
                <button onClick={() => setSelected(null)} className="text-blanco/40 hover:text-blanco min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-blanco">{selected.module.title}</h4>
                  <p className="text-xs text-blanco/40 mt-0.5 flex items-center gap-2">
                    {selected.module.area}
                    {selected.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> limite {selected.due_date}
                      </span>
                    )}
                  </p>
                </div>

                {selected.module.content && (
                  <Card className="bg-blanco/5 border-transparent p-3">
                    <p className="text-sm text-blanco/80 whitespace-pre-wrap leading-relaxed">
                      {selected.module.content}
                    </p>
                  </Card>
                )}

                {selected.module.links.length > 0 && (
                  <div className="space-y-1.5">
                    {selected.module.links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-azul hover:underline"
                      >
                        <Link2 size={14} className="flex-shrink-0" />
                        <span className="truncate">{link.label}</span>
                      </a>
                    ))}
                  </div>
                )}

                {docs.length > 0 && (
                  <div className="space-y-1.5">
                    {docs.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={async () => {
                          const url = await getDocumentUrl(doc.storage_path)
                          if (url) window.open(url, '_blank', 'noopener')
                        }}
                        className="w-full flex items-center gap-2 text-sm text-blanco/70 hover:text-blanco bg-blanco/5 rounded-xl px-3 py-2.5"
                      >
                        <FileText size={14} className="text-azul flex-shrink-0" />
                        <span className="truncate">{doc.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                {selected.status === 'completed' ? (
                  <div className="flex items-center justify-center gap-2 bg-amarillo/10 border border-amarillo/30 rounded-xl py-3">
                    <CheckCircle2 size={16} className="text-amarillo" />
                    <p className="text-sm text-amarillo font-medium">
                      Completada {selected.completed_at?.slice(0, 10) ?? ''}
                    </p>
                  </div>
                ) : (
                  <Button onClick={handleComplete} disabled={completing} className="w-full">
                    <CheckCircle2 size={16} className="mr-1" />
                    {completing ? 'Guardando...' : 'Ya estudie este material'}
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
