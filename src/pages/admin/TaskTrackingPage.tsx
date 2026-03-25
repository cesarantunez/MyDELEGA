import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { LayoutGrid, List, Filter } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { Badge, priorityLabels, statusLabels } from '../../components/ui/badge'
import { Select } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import EmptyState from '../../components/ui/EmptyState'
import {
  getFilteredTasks,
  getAllAreas,
  type TaskRow,
  type TaskFilters,
} from '../../lib/repositories/task.repository'
import { getActiveUsers, type UserRow } from '../../lib/repositories/user.repository'

type ViewMode = 'kanban' | 'list'

const KANBAN_COLUMNS = [
  { key: 'pending', label: 'Pendiente', color: 'border-amarillo/40' },
  { key: 'in_progress', label: 'En progreso', color: 'border-azul/40' },
  { key: 'completed', label: 'Completada', color: 'border-rosa/40' },
  { key: 'overdue', label: 'Vencida', color: 'border-rojo/40' },
] as const

function isOverdue(task: TaskRow): boolean {
  if (task.status === 'completed' || task.status === 'cancelled') return false
  if (!task.due_date) return false
  return new Date(task.due_date) < new Date()
}

function TaskCard({ task }: { task: TaskRow }) {
  const overdue = isOverdue(task)
  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-blanco leading-tight">{task.title}</p>
        <Badge variant="priority" value={task.priority} className="flex-shrink-0">
          {priorityLabels[task.priority]}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-blanco/50">{task.assigned_to_name}</span>
        {task.due_date && (
          <span className={`text-xs ${overdue ? 'text-rojo' : 'text-blanco/40'}`}>
            {format(new Date(task.due_date), 'dd MMM HH:mm', { locale: es })}
          </span>
        )}
      </div>
    </Card>
  )
}

export default function TaskTrackingPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [view, setView] = useState<ViewMode>('kanban')
  const [showFilters, setShowFilters] = useState(false)
  const [areas, setAreas] = useState<string[]>([])
  const [employees, setEmployees] = useState<UserRow[]>([])
  const [filters, setFilters] = useState<TaskFilters>({})

  useEffect(() => {
    setAreas(getAllAreas())
    setEmployees(getActiveUsers())
  }, [])

  useEffect(() => {
    setTasks(getFilteredTasks(filters))
  }, [filters])

  const kanbanData = useMemo(() => {
    const columns: Record<string, TaskRow[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      overdue: [],
    }
    for (const task of tasks) {
      if (isOverdue(task)) {
        columns.overdue.push(task)
      } else {
        const col = columns[task.status]
        if (col) col.push(task)
      }
    }
    return columns
  }, [tasks])

  const areaOptions = [{ value: '', label: 'Todas las areas' }, ...areas.map((a) => ({ value: a, label: a }))]
  const employeeOptions = [{ value: '', label: 'Todos' }, ...employees.map((e) => ({ value: String(e.id), label: e.name }))]
  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'in_progress', label: 'En progreso' },
    { value: 'completed', label: 'Completada' },
    { value: 'overdue', label: 'Vencida' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-blanco">Seguimiento</h2>
          <p className="text-blanco/50 text-sm">{tasks.length} tarea(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'text-amarillo' : ''}
          >
            <Filter size={16} />
          </Button>
          <div className="flex bg-blanco/10 rounded-lg p-0.5">
            <button
              onClick={() => setView('kanban')}
              className={`p-1.5 rounded-md transition-colors ${view === 'kanban' ? 'bg-amarillo text-oscuro' : 'text-blanco/50'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-amarillo text-oscuro' : 'text-blanco/50'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          <Select
            options={areaOptions}
            placeholder="Area"
            value={filters.area ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value || undefined }))}
          />
          <Select
            options={employeeOptions}
            placeholder="Empleado"
            value={filters.assigned_to ? String(filters.assigned_to) : ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                assigned_to: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
          />
          <Select
            options={statusOptions}
            placeholder="Estado"
            value={filters.status ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
          />
        </motion.div>
      )}

      {/* Empty state */}
      {tasks.length === 0 && (
        <EmptyState
          icon="tasks"
          title="No hay tareas"
          subtitle="Crea una tarea desde el dashboard"
        />
      )}

      {/* Kanban view */}
      {view === 'kanban' && tasks.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {KANBAN_COLUMNS.map((col) => (
            <div key={col.key}>
              <div className={`text-xs font-semibold text-blanco/60 mb-2 pb-1 border-b-2 ${col.color}`}>
                {col.label}
                <span className="ml-1 text-blanco/30">({kanbanData[col.key].length})</span>
              </div>
              <div className="space-y-2">
                {kanbanData[col.key].map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <TaskCard task={task} />
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {view === 'list' && tasks.length > 0 && (
        <div className="space-y-2">
          {tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="flex items-center gap-3 p-3">
                <Badge variant="status" value={isOverdue(task) ? 'overdue' : task.status} className="flex-shrink-0">
                  {isOverdue(task) ? 'Vencida' : statusLabels[task.status]}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-blanco font-medium truncate">{task.title}</p>
                  <p className="text-xs text-blanco/40">{task.assigned_to_name} · {task.area}</p>
                </div>
                <Badge variant="priority" value={task.priority}>
                  {priorityLabels[task.priority]}
                </Badge>
                {task.due_date && (
                  <span className={`text-xs flex-shrink-0 ${isOverdue(task) ? 'text-rojo' : 'text-blanco/40'}`}>
                    {format(new Date(task.due_date), 'dd/MM', { locale: es })}
                  </span>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
