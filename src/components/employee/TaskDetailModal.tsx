import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { X, Camera, Image, CheckCircle2, Play, AlertTriangle } from 'lucide-react'
import { Card } from '../ui/card'
import { Badge, statusLabels, priorityLabels } from '../ui/badge'
import { Button } from '../ui/button'
import type { TaskRow } from '../../lib/repositories/task.repository'
import {
  completeMyTask,
  startMyTask,
  getMyTaskById,
} from '../../lib/repositories/employee-task.repository'
import { hapticMedium, hapticSuccess } from '../../lib/haptic'

interface TaskDetailModalProps {
  task: TaskRow
  userId: number
  onClose: () => void
  onTaskUpdated: () => void
}

type ModalStep = 'detail' | 'confirm' | 'evidence'

export default function TaskDetailModal({ task: initialTask, userId, onClose, onTaskUpdated }: TaskDetailModalProps) {
  const [task, setTask] = useState(initialTask)
  const [step, setStep] = useState<ModalStep>('detail')
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isOverdue = (() => {
    if (task.status === 'completed' || task.status === 'cancelled') return false
    if (!task.due_date) return false
    return new Date(task.due_date).getTime() < Date.now()
  })()

  const canComplete = task.status === 'pending' || task.status === 'in_progress'
  const canStart = task.status === 'pending'

  // Determine if task template requires evidence (tasks with checklist = evidence required)
  const requiresEvidence = task.template_id !== null

  const handleStart = async () => {
    hapticMedium()
    setIsSubmitting(true)
    await startMyTask(userId, task.id)
    const updated = getMyTaskById(userId, task.id)
    if (updated) setTask(updated)
    setIsSubmitting(false)
  }

  const handleCompleteClick = () => {
    if (requiresEvidence) {
      setStep('evidence')
    } else {
      setStep('confirm')
    }
  }

  const handleConfirmComplete = async () => {
    hapticSuccess()
    setIsSubmitting(true)
    await completeMyTask(userId, task.id)
    setIsSubmitting(false)
    onTaskUpdated()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setEvidencePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmitWithEvidence = async () => {
    if (!evidencePreview) return
    hapticSuccess()
    setIsSubmitting(true)
    await completeMyTask(userId, task.id, evidencePreview)
    setIsSubmitting(false)
    onTaskUpdated()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="bg-oscuro border border-blanco/10 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-blanco/10 sticky top-0 bg-oscuro z-10">
          <h3 className="text-base font-bold text-blanco">
            {step === 'detail' && 'Detalle de tarea'}
            {step === 'confirm' && 'Confirmar'}
            {step === 'evidence' && 'Evidencia'}
          </h3>
          <button onClick={onClose} className="text-blanco/40 hover:text-blanco min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* ── DETAIL STEP ── */}
          {step === 'detail' && (
            <>
              {/* Title + badges */}
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-blanco">{task.title}</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="status" value={isOverdue ? 'overdue' : task.status}>
                    {isOverdue ? 'Vencida' : statusLabels[task.status]}
                  </Badge>
                  <Badge variant="priority" value={task.priority}>
                    {priorityLabels[task.priority]}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              {task.description && (
                <Card className="bg-blanco/5 border-transparent p-3">
                  <p className="text-sm text-blanco/70 whitespace-pre-wrap">{task.description}</p>
                </Card>
              )}

              {/* Meta info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-blanco/40 text-xs">Area</p>
                  <p className="text-blanco">{task.area}</p>
                </div>
                <div>
                  <p className="text-blanco/40 text-xs">Asignada por</p>
                  <p className="text-blanco">{task.assigned_by_name}</p>
                </div>
                <div>
                  <p className="text-blanco/40 text-xs">Creada</p>
                  <p className="text-blanco">{format(new Date(task.created_at), 'dd MMM yyyy HH:mm', { locale: es })}</p>
                </div>
                {task.due_date && (
                  <div>
                    <p className="text-blanco/40 text-xs">Fecha limite</p>
                    <p className={isOverdue ? 'text-rojo font-semibold' : 'text-blanco'}>
                      {format(new Date(task.due_date), 'dd MMM yyyy HH:mm', { locale: es })}
                    </p>
                  </div>
                )}
              </div>

              {/* Overdue warning */}
              {isOverdue && (
                <div className="flex items-center gap-2 bg-rojo/10 border border-rojo/20 rounded-xl p-3">
                  <AlertTriangle size={16} className="text-rojo flex-shrink-0" />
                  <p className="text-xs text-rojo">Esta tarea ya vencio. Completala lo antes posible.</p>
                </div>
              )}

              {/* Evidence preview if already completed with evidence */}
              {task.evidence_base64 && task.status === 'completed' && (
                <div>
                  <p className="text-xs text-blanco/40 mb-2">Evidencia adjunta</p>
                  <img
                    src={task.evidence_base64}
                    alt="Evidencia"
                    className="w-full rounded-xl border border-blanco/10"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {canStart && (
                  <Button
                    onClick={handleStart}
                    disabled={isSubmitting}
                    className="flex-1 bg-azul hover:bg-azul/80"
                  >
                    <Play size={16} className="mr-1" /> Iniciar
                  </Button>
                )}
                {canComplete && (
                  <Button
                    onClick={handleCompleteClick}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    <CheckCircle2 size={16} className="mr-1" /> Completar
                  </Button>
                )}
              </div>

              {requiresEvidence && canComplete && (
                <p className="text-[10px] text-blanco/30 text-center">
                  Esta tarea requiere evidencia fotografica
                </p>
              )}
            </>
          )}

          {/* ── CONFIRM STEP (no evidence) ── */}
          {step === 'confirm' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-amarillo/10 mx-auto flex items-center justify-center">
                <CheckCircle2 size={32} className="text-amarillo" />
              </div>
              <div>
                <p className="text-blanco font-semibold">Marcar como completada?</p>
                <p className="text-blanco/40 text-sm mt-1">{task.title}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep('detail')} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleConfirmComplete} disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? 'Guardando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          )}

          {/* ── EVIDENCE STEP ── */}
          {step === 'evidence' && (
            <div className="space-y-4">
              <p className="text-sm text-blanco/70 text-center">
                Toma o selecciona una foto como evidencia
              </p>

              {!evidencePreview ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'image/*'
                        fileInputRef.current.capture = 'environment'
                        fileInputRef.current.click()
                      }
                    }}
                    className="bg-azul/10 border border-azul/20 rounded-xl p-6 text-center hover:bg-azul/20 transition-colors"
                  >
                    <Camera size={28} className="text-azul mx-auto mb-2" />
                    <p className="text-xs text-blanco/70">Camara</p>
                  </button>
                  <button
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'image/*'
                        fileInputRef.current.removeAttribute('capture')
                        fileInputRef.current.click()
                      }
                    }}
                    className="bg-rosa/10 border border-rosa/20 rounded-xl p-6 text-center hover:bg-rosa/20 transition-colors"
                  >
                    <Image size={28} className="text-rosa mx-auto mb-2" />
                    <p className="text-xs text-blanco/70">Galeria</p>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <img
                    src={evidencePreview}
                    alt="Preview"
                    className="w-full rounded-xl border border-blanco/10"
                  />
                  <button
                    onClick={() => setEvidencePreview(null)}
                    className="text-xs text-blanco/40 hover:text-blanco underline w-full text-center"
                  >
                    Cambiar foto
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep('detail')} className="flex-1">
                  Volver
                </Button>
                <Button
                  onClick={handleSubmitWithEvidence}
                  disabled={!evidencePreview || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Guardando...' : 'Enviar evidencia'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
