import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { useAuthStore } from '../../stores/auth.store'
import {
  getMyStats,
  getMyUnreadCount,
  getMyTasks,
  type EmployeeStats,
} from '../../lib/repositories/employee-task.repository'
import type { TaskRow } from '../../lib/repositories/task.repository'

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
}

export default function EmployeeDashboard() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [stats, setStats] = useState<EmployeeStats>({ pending_today: 0, completed_week: 0, due_soon: 0 })
  const [unreadCount, setUnreadCount] = useState(0)
  const [urgentTasks, setUrgentTasks] = useState<TaskRow[]>([])

  useEffect(() => {
    if (!user) return
    setStats(getMyStats(user.id))
    setUnreadCount(getMyUnreadCount(user.id))
    // Get tasks due soon for quick preview
    const myTasks = getMyTasks(user.id, {})
    setUrgentTasks(
      myTasks
        .filter((t) => {
          if (t.status === 'completed' || t.status === 'cancelled') return false
          if (!t.due_date) return false
          const diff = new Date(t.due_date).getTime() - Date.now()
          return diff > 0 && diff < 24 * 60 * 60 * 1000
        })
        .slice(0, 3)
    )
  }, [user])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos dias'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'E'

  const statCards = [
    {
      label: 'Pendientes',
      value: stats.pending_today,
      icon: Clock,
      color: 'text-amarillo',
      bg: 'bg-amarillo/10',
    },
    {
      label: 'Completadas (semana)',
      value: stats.completed_week,
      icon: CheckCircle2,
      color: 'text-rosa',
      bg: 'bg-rosa/10',
    },
    {
      label: 'Por vencer (24h)',
      value: stats.due_soon,
      icon: AlertTriangle,
      color: 'text-rojo',
      bg: 'bg-rojo/10',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-14 h-14 rounded-2xl object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-rosa flex items-center justify-center">
            <span className="text-blanco text-xl font-bold">{initials}</span>
          </div>
        )}
        <div>
          <p className="text-blanco/50 text-sm">{greeting()},</p>
          <h2 className="text-xl font-bold text-blanco">{user?.name?.split(' ')[0]}</h2>
        </div>
        {unreadCount > 0 && (
          <div className="ml-auto bg-rojo/20 text-rojo text-xs font-bold px-2.5 py-1 rounded-full">
            {unreadCount} nueva{unreadCount > 1 ? 's' : ''}
          </div>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {statCards.map((card, i) => (
          <motion.div key={card.label} custom={i} variants={fadeUp} initial="hidden" animate="visible">
            <Card className={`text-center p-3 ${card.bg} border-transparent`}>
              <card.icon size={20} className={`mx-auto mb-1 ${card.color}`} />
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-[10px] text-blanco/50 mt-0.5 leading-tight">{card.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          onClick={() => navigate('/employee/tasks')}
          className="bg-amarillo/10 border border-amarillo/20 rounded-xl p-4 text-left hover:bg-amarillo/20 transition-colors"
        >
          <p className="text-amarillo font-semibold text-sm">Mis tareas</p>
          <p className="text-blanco/40 text-xs mt-1">Ver todas las asignadas</p>
        </motion.button>
        <motion.button
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          onClick={() => navigate('/employee/checklist')}
          className="bg-rosa/10 border border-rosa/20 rounded-xl p-4 text-left hover:bg-rosa/20 transition-colors"
        >
          <p className="text-rosa font-semibold text-sm">Mi checklist</p>
          <p className="text-blanco/40 text-xs mt-1">Progreso de la semana</p>
        </motion.button>
      </div>

      {/* Urgent tasks preview */}
      {urgentTasks.length > 0 && (
        <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-rojo flex items-center gap-1">
              <AlertTriangle size={14} /> Por vencer
            </p>
            <button
              onClick={() => navigate('/employee/tasks')}
              className="text-xs text-blanco/40 hover:text-blanco flex items-center gap-1"
            >
              Ver todas <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {urgentTasks.map((task) => {
              const diff = new Date(task.due_date!).getTime() - Date.now()
              const hours = Math.max(0, Math.floor(diff / (1000 * 60 * 60)))
              const minutes = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)))

              return (
                <Card
                  key={task.id}
                  className="flex items-center gap-3 p-3 border-rojo/20 cursor-pointer hover:bg-blanco/5"
                  onClick={() => navigate('/employee/tasks')}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-blanco font-medium truncate">{task.title}</p>
                    <p className="text-xs text-blanco/40">{task.area}</p>
                  </div>
                  <span className="text-xs text-rojo font-mono font-bold flex-shrink-0">
                    {hours}h {minutes}m
                  </span>
                </Card>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}
