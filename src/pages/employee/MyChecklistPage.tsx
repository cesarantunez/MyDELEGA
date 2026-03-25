import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CheckSquare } from 'lucide-react'
import { Card } from '../../components/ui/card'
import EmptyState from '../../components/ui/EmptyState'
import { useAuthStore } from '../../stores/auth.store'
import {
  getMyWeeklyChecklist,
  toggleChecklistItem,
  type WeeklyChecklistData,
} from '../../lib/repositories/employee-task.repository'
import { hapticSuccess } from '../../lib/haptic'

export default function MyChecklistPage() {
  const user = useAuthStore((s) => s.user)
  const [data, setData] = useState<WeeklyChecklistData>({ items: [], total: 0, completed: 0, percentage: 0 })

  const load = useCallback(() => {
    if (!user) return
    setData(getMyWeeklyChecklist(user.id))
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const handleToggle = async (itemId: number) => {
    if (!user) return
    hapticSuccess()
    await toggleChecklistItem(user.id, itemId)
    load()
  }

  // Group items by task
  const grouped = data.items.reduce<Record<string, typeof data.items>>((acc, item) => {
    const key = `${item.task_id}-${item.task_title}`
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const progressColor =
    data.percentage >= 80 ? 'bg-rosa' : data.percentage >= 50 ? 'bg-amarillo' : 'bg-azul'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-blanco">Mi checklist</h2>
        <p className="text-blanco/50 text-sm">Semana actual</p>
      </div>

      {/* Progress */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare size={18} className="text-amarillo" />
            <span className="text-sm text-blanco font-medium">Progreso semanal</span>
          </div>
          <span className="text-2xl font-bold text-blanco">{data.percentage}%</span>
        </div>
        <div className="h-3 bg-blanco/10 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${progressColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${data.percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-blanco/40 text-center">
          {data.completed} de {data.total} completado{data.total !== 1 ? 's' : ''}
        </p>
      </Card>

      {/* Empty state */}
      {data.total === 0 && (
        <EmptyState
          icon="checklist"
          title="No hay checklist esta semana"
          subtitle="Los checklists se crean con las tareas asignadas"
        />
      )}

      {/* Grouped checklists */}
      {Object.entries(grouped).map(([key, items], groupIndex) => {
        const taskTitle = items[0].task_title
        const groupCompleted = items.filter((i) => i.completed === 1).length
        const groupTotal = items.length

        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.08 }}
          >
            <Card className="p-3 space-y-2">
              {/* Task header */}
              <div className="flex items-center justify-between pb-2 border-b border-blanco/10">
                <p className="text-sm font-medium text-blanco truncate">{taskTitle}</p>
                <span className="text-xs text-blanco/40 flex-shrink-0">
                  {groupCompleted}/{groupTotal}
                </span>
              </div>

              {/* Checklist items */}
              <div className="space-y-1">
                {items.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-blanco/5 cursor-pointer transition-colors min-h-[44px]"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed === 1}
                      onChange={() => handleToggle(item.id)}
                      className="w-5 h-5 rounded border-blanco/30 bg-blanco/10 text-amarillo focus:ring-amarillo focus:ring-offset-0 focus:ring-1"
                    />
                    <span
                      className={`text-sm flex-1 ${
                        item.completed === 1
                          ? 'text-blanco/30 line-through'
                          : 'text-blanco/80'
                      }`}
                    >
                      {item.title}
                    </span>
                  </label>
                ))}
              </div>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
