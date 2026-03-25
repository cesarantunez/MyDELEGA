import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Card } from '../../components/ui/card'
import { Badge, priorityLabels } from '../../components/ui/badge'
import { useAuthStore } from '../../stores/auth.store'
import { getActiveUsers, type UserRow } from '../../lib/repositories/user.repository'
import {
  createTask,
  getAllAreas,
  getTemplatesByArea,
  type TaskTemplateRow,
} from '../../lib/repositories/task.repository'
import { hapticSuccess } from '../../lib/haptic'

const taskSchema = z.object({
  title: z.string().min(3, 'Minimo 3 caracteres'),
  description: z.string().optional(),
  area: z.string().min(1, 'Selecciona un area'),
  assigned_to: z.string().min(1, 'Selecciona un empleado'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  due_date: z.string().optional(),
})

type TaskForm = z.infer<typeof taskSchema>

export default function CreateTaskPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [areas, setAreas] = useState<string[]>([])
  const [employees, setEmployees] = useState<UserRow[]>([])
  const [templates, setTemplates] = useState<TaskTemplateRow[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplateRow | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: 'medium' },
  })

  const watchedArea = watch('area')

  useEffect(() => {
    setAreas(getAllAreas())
    setEmployees(getActiveUsers().filter((u) => u.role === 'employee'))
  }, [])

  // Load templates when area changes
  useEffect(() => {
    if (watchedArea) {
      const tpls = getTemplatesByArea(watchedArea)
      setTemplates(tpls)
      setSelectedTemplate(null)
    } else {
      setTemplates([])
    }
  }, [watchedArea])

  const applyTemplate = (tpl: TaskTemplateRow) => {
    setSelectedTemplate(tpl)
    setValue('title', tpl.title)
    setValue('description', tpl.description ?? '')
    setValue('priority', tpl.default_priority as TaskForm['priority'])
  }

  const onSubmit = async (data: TaskForm) => {
    if (!user) return

    const checklistItems = selectedTemplate?.default_checklist
      ? JSON.parse(selectedTemplate.default_checklist) as string[]
      : undefined

    await createTask({
      template_id: selectedTemplate?.id ?? null,
      assigned_to: Number(data.assigned_to),
      assigned_by: user.id,
      area: data.area,
      title: data.title,
      description: data.description,
      priority: data.priority,
      due_date: data.due_date || null,
      checklist_items: checklistItems,
    })

    hapticSuccess()
    navigate('/admin/tasks')
  }

  const areaOptions = areas.map((a) => ({ value: a, label: a }))
  const employeeOptions = employees.map((e) => ({ value: String(e.id), label: e.name }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-blanco/40 hover:text-blanco min-w-[44px] min-h-[44px] flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-blanco">Nueva tarea</h2>
          <p className="text-blanco/50 text-sm">Asigna una tarea a un empleado</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Area + templates */}
        <Select
          id="area"
          label="Area"
          options={areaOptions}
          placeholder="Seleccionar area"
          error={errors.area?.message}
          {...register('area')}
        />

        {/* Template suggestions */}
        {templates.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <p className="text-xs text-blanco/50 mb-2 flex items-center gap-1">
              <Sparkles size={12} className="text-amarillo" />
              Plantillas disponibles
            </p>
            <div className="flex flex-wrap gap-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    selectedTemplate?.id === tpl.id
                      ? 'bg-amarillo/20 text-amarillo border border-amarillo/40'
                      : 'bg-blanco/5 text-blanco/60 border border-blanco/10 hover:bg-blanco/10'
                  }`}
                >
                  {tpl.title}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <Input id="title" label="Titulo" placeholder="Nombre de la tarea" error={errors.title?.message} {...register('title')} />

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-blanco/80 mb-1">
            Descripcion
          </label>
          <textarea
            id="description"
            rows={3}
            placeholder="Detalles de la tarea..."
            {...register('description')}
            className="w-full px-4 py-2.5 rounded-xl bg-blanco/10 border border-blanco/20 text-blanco placeholder-blanco/40 focus:outline-none focus:border-amarillo focus:ring-1 focus:ring-amarillo transition-colors resize-none"
          />
        </div>

        <Select
          id="assigned_to"
          label="Asignar a"
          options={employeeOptions}
          placeholder="Seleccionar empleado"
          error={errors.assigned_to?.message}
          {...register('assigned_to')}
        />

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-blanco/80 mb-2">Prioridad</label>
          <div className="grid grid-cols-4 gap-2">
            {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
              <label key={p} className="cursor-pointer">
                <input type="radio" value={p} {...register('priority')} className="sr-only peer" />
                <div className="peer-checked:ring-2 peer-checked:ring-amarillo rounded-xl p-2 text-center transition-all">
                  <Badge variant="priority" value={p} className="text-xs">
                    {priorityLabels[p]}
                  </Badge>
                </div>
              </label>
            ))}
          </div>
        </div>

        <Input
          id="due_date"
          label="Fecha limite"
          type="datetime-local"
          {...register('due_date')}
        />

        {/* Selected template checklist preview */}
        {selectedTemplate?.default_checklist && (
          <Card className="bg-blanco/5">
            <p className="text-xs font-medium text-blanco/60 mb-2">Checklist incluido:</p>
            <ul className="space-y-1">
              {(JSON.parse(selectedTemplate.default_checklist) as string[]).map((item, i) => (
                <li key={i} className="text-xs text-blanco/50 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amarillo/50" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creando...' : 'Crear tarea'}
        </Button>
      </form>
    </div>
  )
}
