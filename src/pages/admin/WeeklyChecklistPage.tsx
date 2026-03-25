import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileDown, RefreshCw, Clock, ChevronRight, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { useAuthStore } from '../../stores/auth.store'
import {
  generateWeeklyReport,
  saveWeeklyReport,
  getWeeklyReportHistory,
  parseReportData,
  getWeekBoundsForOffset,
  type WeeklyReportData,
  type WeeklyReportRow,
} from '../../lib/repositories/checklist.repository'
import { generateWeeklyReportPDF } from '../../lib/pdf/weekly-report-pdf'

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  a_tiempo: { bg: 'bg-azul/20', text: 'text-azul', icon: CheckCircle2 },
  tarde: { bg: 'bg-rojo/20', text: 'text-rojo', icon: AlertTriangle },
  pendiente: { bg: 'bg-blanco/10', text: 'text-blanco/50', icon: XCircle },
}

const STATUS_LABELS: Record<string, string> = {
  a_tiempo: 'A tiempo',
  tarde: 'Tarde',
  pendiente: 'Pendiente',
}

export default function WeeklyChecklistPage() {
  const user = useAuthStore((s) => s.user)
  const [report, setReport] = useState<WeeklyReportData | null>(null)
  const [history, setHistory] = useState<WeeklyReportRow[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState(0) // 0 = current week

  useEffect(() => {
    handleGenerate()
    setHistory(getWeeklyReportHistory())
  }, [])

  const handleGenerate = () => {
    const bounds = getWeekBoundsForOffset(selectedWeek)
    const data = generateWeeklyReport(bounds.start, bounds.end)
    setReport(data)
  }

  const handleSaveAndExport = async () => {
    if (!report || !user) return
    setIsGenerating(true)

    await saveWeeklyReport(report, user.id)
    setHistory(getWeeklyReportHistory())
    generateWeeklyReportPDF(report)

    setIsGenerating(false)
  }

  const handleExportOnly = () => {
    if (!report) return
    generateWeeklyReportPDF(report)
  }

  const handleLoadHistorical = (row: WeeklyReportRow) => {
    const data = parseReportData(row)
    setReport(data)
    setShowHistory(false)
  }

  const handleWeekChange = (offset: number) => {
    setSelectedWeek(offset)
    const bounds = getWeekBoundsForOffset(offset)
    const data = generateWeeklyReport(bounds.start, bounds.end)
    setReport(data)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-blanco">Checklist Semanal</h2>
          {report && (
            <p className="text-blanco/50 text-sm">
              {report.week_start} al {report.week_end}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleExportOnly} disabled={!report}>
            <FileDown size={16} />
          </Button>
          <Button size="sm" onClick={handleSaveAndExport} disabled={isGenerating || !report}>
            {isGenerating ? <RefreshCw size={14} className="animate-spin mr-1" /> : <FileDown size={14} className="mr-1" />}
            Guardar y PDF
          </Button>
        </div>
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => handleWeekChange(selectedWeek + 1)}
          className="text-blanco/40 hover:text-blanco text-sm"
        >
          &larr; Anterior
        </button>
        <span className="text-blanco text-sm font-medium px-3 py-1 bg-blanco/10 rounded-lg">
          {selectedWeek === 0 ? 'Semana actual' : `Hace ${selectedWeek} semana${selectedWeek > 1 ? 's' : ''}`}
        </span>
        <button
          onClick={() => handleWeekChange(Math.max(0, selectedWeek - 1))}
          disabled={selectedWeek === 0}
          className={`text-sm ${selectedWeek === 0 ? 'text-blanco/20' : 'text-blanco/40 hover:text-blanco'}`}
        >
          Siguiente &rarr;
        </button>
      </div>

      {/* Summary cards */}
      {report && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total', value: report.summary.total, color: 'text-blanco', bg: 'bg-blanco/10' },
            { label: 'A tiempo', value: report.summary.a_tiempo, color: 'text-azul', bg: 'bg-azul/10' },
            { label: 'Tarde', value: report.summary.tarde, color: 'text-rojo', bg: 'bg-rojo/10' },
            { label: 'Pendiente', value: report.summary.pendiente, color: 'text-blanco/50', bg: 'bg-blanco/5' },
          ].map((s) => (
            <Card key={s.label} className={`text-center p-2 ${s.bg} border-transparent`}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-blanco/40">{s.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* By employee table */}
      {report && report.by_employee.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-3 border-b border-blanco/10">
            <p className="text-sm font-semibold text-blanco">Por empleado</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blanco/10">
                  <th className="text-left text-blanco/50 text-xs font-medium p-2 pl-3">Empleado</th>
                  <th className="text-center text-blanco/50 text-xs font-medium p-2">Total</th>
                  <th className="text-center text-azul text-xs font-medium p-2">A tiempo</th>
                  <th className="text-center text-rojo text-xs font-medium p-2">Tarde</th>
                  <th className="text-center text-blanco/40 text-xs font-medium p-2">Pend.</th>
                  <th className="text-center text-amarillo text-xs font-medium p-2">%</th>
                </tr>
              </thead>
              <tbody>
                {report.by_employee.map((emp) => (
                  <tr key={emp.employee_id} className="border-b border-blanco/5 hover:bg-blanco/5">
                    <td className="p-2 pl-3 text-blanco font-medium">{emp.employee_name}</td>
                    <td className="p-2 text-center text-blanco/60">{emp.total}</td>
                    <td className="p-2 text-center text-azul font-medium">{emp.a_tiempo}</td>
                    <td className="p-2 text-center text-rojo font-medium">{emp.tarde}</td>
                    <td className="p-2 text-center text-blanco/40">{emp.pendiente}</td>
                    <td className="p-2 text-center">
                      <span className={`font-bold ${
                        emp.percentage >= 80 ? 'text-azul' : emp.percentage >= 50 ? 'text-amarillo' : 'text-rojo'
                      }`}>
                        {emp.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* By area table */}
      {report && report.by_area.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-3 border-b border-blanco/10">
            <p className="text-sm font-semibold text-blanco">Por area</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blanco/10">
                  <th className="text-left text-blanco/50 text-xs font-medium p-2 pl-3">Area</th>
                  <th className="text-center text-blanco/50 text-xs font-medium p-2">Total</th>
                  <th className="text-center text-azul text-xs font-medium p-2">A tiempo</th>
                  <th className="text-center text-rojo text-xs font-medium p-2">Tarde</th>
                  <th className="text-center text-blanco/40 text-xs font-medium p-2">Pend.</th>
                  <th className="text-center text-amarillo text-xs font-medium p-2">%</th>
                </tr>
              </thead>
              <tbody>
                {report.by_area.map((area) => (
                  <tr key={area.area} className="border-b border-blanco/5 hover:bg-blanco/5">
                    <td className="p-2 pl-3 text-blanco font-medium">{area.area}</td>
                    <td className="p-2 text-center text-blanco/60">{area.total}</td>
                    <td className="p-2 text-center text-azul font-medium">{area.a_tiempo}</td>
                    <td className="p-2 text-center text-rojo font-medium">{area.tarde}</td>
                    <td className="p-2 text-center text-blanco/40">{area.pendiente}</td>
                    <td className="p-2 text-center">
                      <span className={`font-bold ${
                        area.percentage >= 80 ? 'text-azul' : area.percentage >= 50 ? 'text-amarillo' : 'text-rojo'
                      }`}>
                        {area.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detailed task list */}
      {report && report.tasks.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-3 border-b border-blanco/10">
            <p className="text-sm font-semibold text-blanco">Detalle de tareas</p>
          </div>
          <div className="divide-y divide-blanco/5">
            {report.tasks.map((task) => {
              const style = STATUS_STYLES[task.completion_status]
              const Icon = style.icon
              return (
                <div key={task.task_id} className="flex items-center gap-3 px-3 py-2 hover:bg-blanco/5">
                  <div className={`w-6 h-6 rounded-full ${style.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={12} className={style.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-blanco truncate">{task.title}</p>
                    <p className="text-[10px] text-blanco/40">{task.employee_name} · {task.area}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                    {STATUS_LABELS[task.completion_status]}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {report && report.tasks.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-blanco/30 text-sm">No hay tareas en esta semana</p>
        </Card>
      )}

      {/* History toggle */}
      <Card className="overflow-hidden">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-3 hover:bg-blanco/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amarillo" />
            <span className="text-sm font-semibold text-blanco">Historial de reportes</span>
            {history.length > 0 && (
              <span className="text-[10px] text-blanco/40 bg-blanco/10 px-1.5 py-0.5 rounded-full">
                {history.length}
              </span>
            )}
          </div>
          <ChevronRight
            size={16}
            className={`text-blanco/40 transition-transform ${showHistory ? 'rotate-90' : ''}`}
          />
        </button>

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-blanco/10"
            >
              {history.length === 0 ? (
                <p className="text-xs text-blanco/30 text-center py-6">
                  No hay reportes guardados. Genera y guarda uno con el boton superior.
                </p>
              ) : (
                <div className="divide-y divide-blanco/5 max-h-64 overflow-y-auto">
                  {history.map((row) => (
                    <button
                      key={row.id}
                      onClick={() => handleLoadHistorical(row)}
                      className="w-full text-left px-3 py-2.5 hover:bg-blanco/5 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm text-blanco">
                          Semana {row.week_start} al {row.week_end}
                        </p>
                        <p className="text-[10px] text-blanco/40">
                          Generado: {new Date(row.generated_at).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-blanco/30" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}
