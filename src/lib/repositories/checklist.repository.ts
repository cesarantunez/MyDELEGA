import { runRead, runWrite, persistDatabase } from '../db/sqlite-client'

// ══════════════════════════════════════════════════════════════
// Checklist semanal consolidado para admin.
// Genera snapshot de todas las tareas de una semana con su estado:
// a_tiempo, tarde, pendiente — agrupadas por empleado y area.
// ══════════════════════════════════════════════════════════════

export interface WeeklyTaskEntry {
  task_id: number
  title: string
  area: string
  employee_id: number
  employee_name: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: string
  due_date: string | null
  completed_at: string | null
  /** a_tiempo: completada antes del due_date, tarde: completada despues, pendiente: no completada */
  completion_status: 'a_tiempo' | 'tarde' | 'pendiente'
}

export interface WeeklyReportData {
  week_start: string
  week_end: string
  tasks: WeeklyTaskEntry[]
  summary: {
    total: number
    a_tiempo: number
    tarde: number
    pendiente: number
  }
  by_employee: EmployeeSummary[]
  by_area: AreaSummary[]
}

export interface EmployeeSummary {
  employee_id: number
  employee_name: string
  total: number
  a_tiempo: number
  tarde: number
  pendiente: number
  percentage: number
}

export interface AreaSummary {
  area: string
  total: number
  a_tiempo: number
  tarde: number
  pendiente: number
  percentage: number
}

export interface WeeklyReportRow {
  id: number
  week_start: string
  week_end: string
  generated_by: number
  data: string
  generated_at: string
}

// ── Generate weekly report ───────────────────────────────────

function getWeekBounds(date: Date = new Date()): { start: string; end: string } {
  const d = new Date(date)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  }
}

export function getWeekBoundsForOffset(weeksBack: number = 0): { start: string; end: string } {
  const d = new Date()
  d.setDate(d.getDate() - weeksBack * 7)
  return getWeekBounds(d)
}

function classifyCompletion(task: {
  status: string
  due_date: string | null
  completed_at: string | null
}): 'a_tiempo' | 'tarde' | 'pendiente' {
  if (task.status !== 'completed') return 'pendiente'
  if (!task.due_date || !task.completed_at) return 'a_tiempo'
  return new Date(task.completed_at) <= new Date(task.due_date) ? 'a_tiempo' : 'tarde'
}

export function generateWeeklyReport(weekStart?: string, weekEnd?: string): WeeklyReportData {
  const bounds = weekStart && weekEnd
    ? { start: weekStart, end: weekEnd }
    : getWeekBounds()

  const rows = runRead<{
    task_id: number
    title: string
    area: string
    employee_id: number
    employee_name: string
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    priority: string
    due_date: string | null
    completed_at: string | null
  }>(
    `SELECT
      t.id as task_id, t.title, t.area,
      t.assigned_to as employee_id, u.name as employee_name,
      t.status, t.priority, t.due_date, t.completed_at
     FROM tasks t
     JOIN users u ON t.assigned_to = u.id
     WHERE t.created_at >= ? AND t.created_at < datetime(?, '+1 day')
     ORDER BY u.name, t.area, t.created_at`,
    [bounds.start, bounds.end]
  )

  const tasks: WeeklyTaskEntry[] = rows.map((r) => ({
    ...r,
    completion_status: classifyCompletion(r),
  }))

  const summary = {
    total: tasks.length,
    a_tiempo: tasks.filter((t) => t.completion_status === 'a_tiempo').length,
    tarde: tasks.filter((t) => t.completion_status === 'tarde').length,
    pendiente: tasks.filter((t) => t.completion_status === 'pendiente').length,
  }

  // Group by employee
  const empMap = new Map<number, EmployeeSummary>()
  for (const t of tasks) {
    if (!empMap.has(t.employee_id)) {
      empMap.set(t.employee_id, {
        employee_id: t.employee_id,
        employee_name: t.employee_name,
        total: 0,
        a_tiempo: 0,
        tarde: 0,
        pendiente: 0,
        percentage: 0,
      })
    }
    const emp = empMap.get(t.employee_id)!
    emp.total++
    emp[t.completion_status]++
  }
  const by_employee = Array.from(empMap.values()).map((e) => ({
    ...e,
    percentage: e.total > 0 ? Math.round(((e.a_tiempo + e.tarde) / e.total) * 100) : 0,
  }))

  // Group by area
  const areaMap = new Map<string, AreaSummary>()
  for (const t of tasks) {
    if (!areaMap.has(t.area)) {
      areaMap.set(t.area, {
        area: t.area,
        total: 0,
        a_tiempo: 0,
        tarde: 0,
        pendiente: 0,
        percentage: 0,
      })
    }
    const area = areaMap.get(t.area)!
    area.total++
    area[t.completion_status]++
  }
  const by_area = Array.from(areaMap.values()).map((a) => ({
    ...a,
    percentage: a.total > 0 ? Math.round(((a.a_tiempo + a.tarde) / a.total) * 100) : 0,
  }))

  return {
    week_start: bounds.start,
    week_end: bounds.end,
    tasks,
    summary,
    by_employee,
    by_area,
  }
}

// ── Save / load weekly reports ───────────────────────────────

export async function saveWeeklyReport(report: WeeklyReportData, generatedBy: number): Promise<number> {
  runWrite(
    `INSERT INTO weekly_reports (week_start, week_end, generated_by, data) VALUES (?, ?, ?, ?)`,
    [report.week_start, report.week_end, generatedBy, JSON.stringify(report)]
  )
  const rows = runRead<{ id: number }>('SELECT last_insert_rowid() as id')
  await persistDatabase()
  return rows[0].id
}

export function getWeeklyReportHistory(): WeeklyReportRow[] {
  return runRead<WeeklyReportRow>(
    'SELECT * FROM weekly_reports ORDER BY week_start DESC LIMIT 20'
  )
}

export function getWeeklyReportById(id: number): WeeklyReportRow | null {
  const rows = runRead<WeeklyReportRow>('SELECT * FROM weekly_reports WHERE id = ?', [id])
  return rows[0] ?? null
}

export function parseReportData(row: WeeklyReportRow): WeeklyReportData {
  return JSON.parse(row.data) as WeeklyReportData
}
