import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  CartesianGrid,
} from 'recharts'
import { Filter } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  getComplianceByEmployee,
  getComplianceByAreaRadar,
  getMostFailedTasks,
  type EmployeeCompliance,
  type AreaRadarData,
  type MostFailedTask,
  type DateRange,
} from '../../lib/repositories/report.repository'

const COLORS = {
  amarillo: '#FFE000',
  rosa: '#FF1F8E',
  azul: '#1B4FD8',
  rojo: '#E31E24',
  blanco: '#FFFFFF',
  gray: '#6B7280',
}

const BAR_COLORS = [COLORS.amarillo, COLORS.rosa, COLORS.azul, COLORS.rojo, '#9CA3AF', '#34D399']

const tooltipStyle = {
  contentStyle: {
    background: '#2D2D2D',
    border: 'none',
    borderRadius: 12,
    fontSize: 12,
    color: '#FFFFFF',
  },
}

export default function ReportsPage() {
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [employeeData, setEmployeeData] = useState<EmployeeCompliance[]>([])
  const [areaData, setAreaData] = useState<AreaRadarData[]>([])
  const [failedTasks, setFailedTasks] = useState<MostFailedTask[]>([])

  const getRange = useCallback((): DateRange | undefined => {
    if (dateFrom && dateTo) return { from: dateFrom, to: dateTo }
    return undefined
  }, [dateFrom, dateTo])

  const loadData = useCallback(() => {
    const range = getRange()
    setEmployeeData(getComplianceByEmployee(range))
    setAreaData(getComplianceByAreaRadar(range))
    setFailedTasks(getMostFailedTasks(range))
  }, [getRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleApplyFilter = () => {
    loadData()
  }

  const handleClearFilter = () => {
    setDateFrom('')
    setDateTo('')
    const noRange = undefined
    setEmployeeData(getComplianceByEmployee(noRange))
    setAreaData(getComplianceByAreaRadar(noRange))
    setFailedTasks(getMostFailedTasks(noRange))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-blanco">Reportes</h2>
          <p className="text-blanco/50 text-sm">Analisis de cumplimiento</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDateFilter(!showDateFilter)}
          className={showDateFilter ? 'text-amarillo' : ''}
        >
          <Filter size={16} />
        </Button>
      </div>

      {/* Date filter */}
      {showDateFilter && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Desde"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label="Hasta"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleApplyFilter} className="flex-1">
              Aplicar
            </Button>
            <Button size="sm" variant="secondary" onClick={handleClearFilter}>
              Limpiar
            </Button>
          </div>
        </motion.div>
      )}

      {/* 1. Bar chart: Cumplimiento por empleado */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-blanco mb-4">Cumplimiento por empleado</h3>
          {employeeData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeeData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#ffffff60', fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#ffffff80', fontSize: 11 }}
                    width={80}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = { on_time: 'A tiempo', late: 'Tarde', pending: 'Pendiente' }
                      return [value, labels[name] || name]
                    }}
                  />
                  <Bar dataKey="on_time" stackId="a" fill={COLORS.azul} radius={[0, 0, 0, 0]} name="on_time" />
                  <Bar dataKey="late" stackId="a" fill={COLORS.rojo} name="late" />
                  <Bar dataKey="pending" stackId="a" fill={COLORS.gray} radius={[0, 4, 4, 0]} name="pending" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-blanco/30 text-sm text-center py-8">Sin datos</p>
          )}
        </Card>
      </motion.div>

      {/* 2. Radar chart: Cumplimiento por area */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-blanco mb-4">Cumplimiento por area</h3>
          {areaData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={areaData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#ffffff15" />
                  <PolarAngleAxis
                    dataKey="area"
                    tick={{ fill: '#ffffff80', fontSize: 10 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: '#ffffff40', fontSize: 9 }}
                  />
                  <Radar
                    dataKey="cumplimiento"
                    stroke={COLORS.rosa}
                    fill={COLORS.rosa}
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(value: number) => [`${value}%`, 'Cumplimiento']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-blanco/30 text-sm text-center py-8">Sin datos</p>
          )}
        </Card>
      </motion.div>

      {/* 3. Horizontal bars: Tareas mas incumplidas */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-blanco mb-4">Tareas mas incumplidas</h3>
          {failedTasks.length > 0 ? (
            <div className="space-y-2">
              {failedTasks.map((task, i) => {
                const maxFailed = Math.max(...failedTasks.map((t) => t.times_failed))
                const widthPct = maxFailed > 0 ? (task.times_failed / maxFailed) * 100 : 0

                return (
                  <div key={`${task.title}-${task.area}`} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-blanco truncate">{task.title}</p>
                        <p className="text-[10px] text-blanco/40">{task.area}</p>
                      </div>
                      <span className="text-xs text-rojo font-bold ml-2">{task.times_failed}x</span>
                    </div>
                    <div className="h-2 bg-blanco/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPct}%` }}
                        transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-blanco/30 text-sm text-center py-8">Sin tareas incumplidas</p>
          )}
        </Card>
      </motion.div>

      {/* 4. Employee compliance detail cards */}
      {employeeData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-sm font-semibold text-blanco mb-3">Detalle por empleado</h3>
          <div className="grid grid-cols-2 gap-3">
            {employeeData.map((emp, i) => (
              <motion.div
                key={emp.employee_id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
              >
                <Card className="p-3 space-y-2">
                  <p className="text-sm font-medium text-blanco truncate">{emp.name}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-blanco/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${emp.percentage}%`,
                          backgroundColor:
                            emp.percentage >= 80 ? COLORS.azul : emp.percentage >= 50 ? COLORS.amarillo : COLORS.rojo,
                        }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${
                      emp.percentage >= 80 ? 'text-azul' : emp.percentage >= 50 ? 'text-amarillo' : 'text-rojo'
                    }`}>
                      {emp.percentage}%
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-blanco/40">
                    <span>{emp.total} total</span>
                    <span className="text-azul">{emp.on_time} ok</span>
                    <span className="text-rojo">{emp.late} tarde</span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
