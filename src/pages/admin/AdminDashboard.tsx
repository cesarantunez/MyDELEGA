import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { ClipboardList, CheckCircle, AlertTriangle, Users, PlusCircle, BarChart3 } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { getTaskStats, getComplianceByArea, type TaskStats, type AreaCompliance } from '../../lib/repositories/task.repository'
import { getActiveEmployeeCount } from '../../lib/repositories/user.repository'

const AREA_COLORS = ['#FFE000', '#FF1F8E', '#1B4FD8', '#E31E24', '#FFFFFF', '#9CA3AF']

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<TaskStats>({ active: 0, completed_today: 0, overdue: 0 })
  const [compliance, setCompliance] = useState<AreaCompliance[]>([])
  const [employeeCount, setEmployeeCount] = useState(0)

  useEffect(() => {
    setStats(getTaskStats())
    setCompliance(getComplianceByArea())
    setEmployeeCount(getActiveEmployeeCount())
  }, [])

  const statCards = [
    { label: 'Tareas activas', value: stats.active, icon: ClipboardList, color: 'text-amarillo' },
    { label: 'Completadas hoy', value: stats.completed_today, icon: CheckCircle, color: 'text-rosa' },
    { label: 'Vencidas', value: stats.overdue, icon: AlertTriangle, color: 'text-rojo' },
    { label: 'Empleados activos', value: employeeCount, icon: Users, color: 'text-azul' },
  ]

  const chartData = compliance.length > 0
    ? compliance.map((c) => ({ name: c.area, value: c.total, completed: c.completed }))
    : [{ name: 'Sin tareas', value: 1, completed: 0 }]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-blanco">Dashboard</h2>
        <p className="text-blanco/50 text-sm">Resumen de operaciones</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} {...fadeUp} transition={{ delay: i * 0.1 }}>
            <Card className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-blanco/5 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-blanco">{stat.value}</p>
                <p className="text-blanco/50 text-xs">{stat.label}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Compliance chart */}
      <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
        <Card>
          <h3 className="text-sm font-semibold text-blanco mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-amarillo" />
            Cumplimiento por area
          </h3>
          {compliance.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-36 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {chartData.map((_, index) => (
                        <Cell key={index} fill={AREA_COLORS[index % AREA_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#2D2D2D', border: 'none', borderRadius: 12, fontSize: 12 }}
                      itemStyle={{ color: '#FFFFFF' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {compliance.map((c, i) => (
                  <div key={c.area} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: AREA_COLORS[i % AREA_COLORS.length] }}
                    />
                    <span className="text-blanco/70 flex-1 truncate">{c.area}</span>
                    <span className="text-blanco font-medium">{c.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-blanco/30 text-sm text-center py-8">
              Crea tareas para ver el cumplimiento
            </p>
          )}
        </Card>
      </motion.div>

      {/* Quick actions */}
      <motion.div {...fadeUp} transition={{ delay: 0.5 }}>
        <h3 className="text-sm font-semibold text-blanco mb-3">Accesos rapidos</h3>
        <div className="grid grid-cols-3 gap-3">
          <Button variant="secondary" className="flex-col gap-2 py-4 h-auto" onClick={() => navigate('/admin/tasks/new')}>
            <PlusCircle size={22} className="text-amarillo" />
            <span className="text-xs">Crear tarea</span>
          </Button>
          <Button variant="secondary" className="flex-col gap-2 py-4 h-auto" onClick={() => navigate('/admin/employees')}>
            <Users size={22} className="text-rosa" />
            <span className="text-xs">Empleados</span>
          </Button>
          <Button variant="secondary" className="flex-col gap-2 py-4 h-auto" onClick={() => navigate('/admin/tasks')}>
            <BarChart3 size={22} className="text-azul" />
            <span className="text-xs">Seguimiento</span>
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
