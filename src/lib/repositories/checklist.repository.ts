import { supabase } from '../supabase'
import { useAuthStore } from '../../stores/auth.store'

// ══════════════════════════════════════════════════════════════
// Checklist semanal consolidado para admin.
// Genera snapshot de todas las tareas de una semana con su estado:
// a_tiempo, tarde, pendiente — agrupadas por empleado y area.
// ══════════════════════════════════════════════════════════════

export interface WeeklyTaskEntry {
  task_id: string
  title: string
  area: string
  employee_id: string
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
  employee_id: string
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
  id: string
  week_start: string
  week_end: string
  generated_by: string
  data: WeeklyReportData
  generated_at: string
}

// ── Semana ───────────────────────────────────────────────────

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

// ── Generate weekly report ───────────────────────────────────

interface RawWeeklyTask {
  id: string
  title: string
  area: string
  assigned_to: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: string
  due_date: string | null
  completed_at: string | null
  assigned_to_profile: { name: string } | null
}

export async function generateWeeklyReport(weekStart?: string, weekEnd?: string): Promise<WeeklyReportData> {
  const bounds = weekStart && weekEnd
    ? { start: weekStart, end: weekEnd }
    : getWeekBounds()

  const endExclusive = new Date(bounds.end)
  endExclusive.setDate(endExclusive.getDate() + 1)

  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, area, assigned_to, status, priority, due_date, completed_at, assigned_to_profile:profiles!tasks_assigned_to_fkey(name)')
    .gte('created_at', bounds.start)
    .lt('created_at', endExclusive.toISOString())
    .order('area')
  if (error) throw new Error(error.message)

  const tasks: WeeklyTaskEntry[] = (data as unknown as RawWeeklyTask[]).map((r) => ({
    task_id: r.id,
    title: r.title,
    area: r.area,
    employee_id: r.assigned_to,
    employee_name: r.assigned_to_profile?.name ?? 'Desconocido',
    status: r.status,
    priority: r.priority,
    due_date: r.due_date,
    completed_at: r.completed_at,
    completion_status: classifyCompletion(r),
  })).sort((a, b) =>
    a.employee_name.localeCompare(b.employee_name) || a.area.localeCompare(b.area)
  )

  const summary = {
    total: tasks.length,
    a_tiempo: tasks.filter((t) => t.completion_status === 'a_tiempo').length,
    tarde: tasks.filter((t) => t.completion_status === 'tarde').length,
    pendiente: tasks.filter((t) => t.completion_status === 'pendiente').length,
  }

  // Group by employee
  const empMap = new Map<string, EmployeeSummary>()
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

export async function saveWeeklyReport(report: WeeklyReportData, generatedBy: string): Promise<string> {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Sin sesion activa')

  const { data, error } = await supabase
    .from('weekly_reports')
    .insert({
      business_id: user.business_id,
      week_start: report.week_start,
      week_end: report.week_end,
      generated_by: generatedBy,
      data: report,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return (data as { id: string }).id
}

export async function getWeeklyReportHistory(): Promise<WeeklyReportRow[]> {
  const { data, error } = await supabase
    .from('weekly_reports')
    .select('*')
    .order('week_start', { ascending: false })
    .limit(20)
  if (error) return []
  return data as WeeklyReportRow[]
}

export function parseReportData(row: WeeklyReportRow): WeeklyReportData {
  return row.data
}
