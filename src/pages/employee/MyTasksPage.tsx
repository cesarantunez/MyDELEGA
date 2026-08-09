import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Filter, RefreshCw, Hexagon, List, Clock, Play, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { Badge, statusLabels, priorityLabels } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Select } from '../../components/ui/select'
import EmptyState from '../../components/ui/EmptyState'
import { HoneycombGrid, type HexItem, type HexState } from '../../components/ui/HoneycombGrid'
import { useAuthStore } from '../../stores/auth.store'
import { supabase } from '../../lib/supabase'
import { getMyTasks, type MyTaskFilters } from '../../lib/repositories/employee-task.repository'
import type { TaskRow } from '../../lib/repositories/task.repository'
import TaskDetailModal from '../../components/employee/TaskDetailModal'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import { hapticLight } from '../../lib/haptic'

function Countdown({ dueDate }: { dueDate: string }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const diff = new Date(dueDate).getTime() - now
  if (diff <= 0) return <span className="text-xs text-rojo font-bold animate-pulse">VENCIDA</span>

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return (
    <span className="text-xs text-rojo font-mono font-bold animate-pulse">
      {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </span>
  )
}

function isUrgent(task: TaskRow): boolean {
  if (task.status === 'completed' || task.status === 'cancelled') return false
  if (!task.due_date) return false
  const diff = new Date(task.due_date).getTime() - Date.now()
  return diff > 0 && diff < 24 * 60 * 60 * 1000
}

function isOverdue(task: TaskRow): boolean {
  if (task.status === 'completed' || task.status === 'cancelled') return false
  if (!task.due_date) return false
  return new Date(task.due_date).getTime() < Date.now()
}

function hexState(task: TaskRow): HexState {
  if (isOverdue(task)) return 'overdue'
  if (task.status === 'completed') return 'completed'
  if (task.status === 'in_progress') return 'in_progress'
  return 'pending'
}

const HEX_ICONS: Record<HexState, React.ReactNode> = {
  pending: <Clock size={16} />,
  in_progress: <Play size={16} />,
  completed: <CheckCircle2 size={16} />,
  overdue: <AlertTriangle size={16} />,
}

type ViewMode = 'panal' | 'list'

export default function MyTasksPage() {
  const user = useAuthStore((s) => s.user)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [view, setView] = useState<ViewMode>('panal')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<MyTaskFilters>({})
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null)

  const loadTasks = useCallback(() => {
    if (!user) return
    getMyTasks(user.id, filters).then(setTasks).catch(console.error)
  }, [user, filters])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // Realtime: cuando el admin asigna una tarea, la celda vuela al panal al instante
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`tasks-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `assigned_to=eq.${user.id}` },
        () => {
          hapticLight()
          loadTasks()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, loadTasks])

  const handleTaskUpdated = () => {
    loadTasks()
    setSelectedTask(null)
  }

  const { containerRef, pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      hapticLight()
      loadTasks()
    },
  })

  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'in_progress', label: 'En progreso' },
    { value: 'completed', label: 'Completada' },
    { value: 'overdue', label: 'Vencida' },
  ]

  const completedCount = tasks.filter((t) => t.status === 'completed').length
  const honeyPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

  const hexItems: HexItem[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    subtitle: task.due_date
      ? format(new Date(task.due_date), 'dd MMM HH:mm', { locale: es })
      : task.area,
    state: hexState(task),
    icon: HEX_ICONS[hexState(task)],
    onClick: () => setSelectedTask(task),
  }))

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div className="flex justify-center -mt-2 mb-2">
          <motion.div animate={{ rotate: isRefreshing ? 360 : 0 }} transition={{ duration: 0.8, repeat: isRefreshing ? Infinity : 0, ease: 'linear' }}>
            <RefreshCw size={20} className="text-amarillo" />
          </motion.div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-blanco">Mi panal</h2>
          <p className="text-blanco/50 text-sm">
            {tasks.length} tarea(s) · {honeyPct}% de miel
          </p>
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
              onClick={() => setView('panal')}
              className={`p-1.5 rounded-md transition-colors ${view === 'panal' ? 'bg-amarillo text-oscuro' : 'text-blanco/50'}`}
              title="Vista panal"
            >
              <Hexagon size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-amarillo text-oscuro' : 'text-blanco/50'}`}
              title="Vista lista"
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
          className="space-y-3"
        >
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
          title="Tu panal esta vacio"
          subtitle="Cuando te asignen tareas, las veras llegar volando aqui"
        />
      )}

      {/* Panal view */}
      {view === 'panal' && tasks.length > 0 && (
        <div className="pt-2 pb-4">
          <HoneycombGrid items={hexItems} />
          {/* Leyenda */}
          <div className="flex justify-center gap-4 mt-5 text-[10px] text-blanco/50">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amarillo/20 border border-amarillo/50" /> Pendiente
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-azul" /> En curso
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amarillo" /> Con miel
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-rojo" /> Vencida
            </span>
          </div>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="space-y-2">
          {tasks.map((task, i) => {
            const urgent = isUrgent(task)
            const overdue = isOverdue(task)
            const statusValue = overdue ? 'overdue' : task.status

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card
                  className={`p-3 space-y-2 cursor-pointer hover:bg-blanco/5 transition-colors ${
                    urgent ? 'border-rojo/40' : overdue ? 'border-rojo/60' : ''
                  }`}
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blanco leading-tight truncate">{task.title}</p>
                      <p className="text-xs text-blanco/40 mt-0.5">{task.area}</p>
                    </div>
                    <Badge variant="priority" value={task.priority} className="flex-shrink-0">
                      {priorityLabels[task.priority]}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="status" value={statusValue}>
                      {overdue ? 'Vencida' : statusLabels[task.status]}
                    </Badge>
                    {task.due_date && (
                      <>
                        {urgent ? (
                          <Countdown dueDate={task.due_date} />
                        ) : (
                          <span className={`text-xs ${overdue ? 'text-rojo' : 'text-blanco/40'}`}>
                            {format(new Date(task.due_date), 'dd MMM HH:mm', { locale: es })}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && user && (
          <TaskDetailModal
            task={selectedTask}
            userId={user.id}
            onClose={() => setSelectedTask(null)}
            onTaskUpdated={handleTaskUpdated}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
