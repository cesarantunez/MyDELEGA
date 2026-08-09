import { supabase } from '../supabase'

// ══════════════════════════════════════════════════════════════
// Queries para reportes admin con filtro por rango de fechas.
// Los agregados se calculan en cliente: el volumen por negocio
// es bajo y la RLS ya limita los datos al tenant.
// ══════════════════════════════════════════════════════════════

export interface DateRange {
  from: string // YYYY-MM-DD
  to: string   // YYYY-MM-DD
}

interface RawReportTask {
  area: string
  status: string
  due_date: string | null
  completed_at: string | null
  title: string
  assigned_to: string
  assigned_to_profile: { name: string; role: string; active: boolean } | null
}

async function fetchTasks(range?: DateRange): Promise<RawReportTask[]> {
  let query = supabase
    .from('tasks')
    .select('area, status, due_date, completed_at, title, assigned_to, assigned_to_profile:profiles!tasks_assigned_to_fkey(name, role, active)')

  if (range) {
    const endExclusive = new Date(range.to)
    endExclusive.setDate(endExclusive.getDate() + 1)
    query = query.gte('created_at', range.from).lt('created_at', endExclusive.toISOString())
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as unknown as RawReportTask[]
}

function isLate(t: RawReportTask): boolean {
  if (t.status === 'completed') {
    return t.due_date !== null && t.completed_at !== null && new Date(t.completed_at) > new Date(t.due_date)
  }
  return false
}

function isOnTime(t: RawReportTask): boolean {
  return t.status === 'completed' && !isLate(t)
}

// ── Cumplimiento por empleado (bar chart) ─────────────────

export interface EmployeeCompliance {
  employee_id: string
  name: string
  total: number
  completed: number
  on_time: number
  late: number
  pending: number
  percentage: number
}

export async function getComplianceByEmployee(range?: DateRange): Promise<EmployeeCompliance[]> {
  const tasks = await fetchTasks(range)

  const map = new Map<string, EmployeeCompliance>()
  for (const t of tasks) {
    if (!t.assigned_to_profile || t.assigned_to_profile.role !== 'employee' || !t.assigned_to_profile.active) continue
    if (!map.has(t.assigned_to)) {
      map.set(t.assigned_to, {
        employee_id: t.assigned_to,
        name: t.assigned_to_profile.name,
        total: 0, completed: 0, on_time: 0, late: 0, pending: 0, percentage: 0,
      })
    }
    const e = map.get(t.assigned_to)!
    e.total++
    if (t.status === 'completed') e.completed++
    if (isOnTime(t)) e.on_time++
    if (isLate(t)) e.late++
  }

  return Array.from(map.values())
    .map((e) => ({
      ...e,
      pending: e.total - e.completed,
      percentage: e.total > 0 ? Math.round((e.completed / e.total) * 100) : 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// ── Cumplimiento por area (radar chart) ───────────────────

export interface AreaRadarData {
  area: string
  cumplimiento: number
  total: number
  completed: number
}

export async function getComplianceByAreaRadar(range?: DateRange): Promise<AreaRadarData[]> {
  const tasks = await fetchTasks(range)

  const map = new Map<string, { total: number; completed: number }>()
  for (const t of tasks) {
    const entry = map.get(t.area) ?? { total: 0, completed: 0 }
    entry.total++
    if (t.status === 'completed') entry.completed++
    map.set(t.area, entry)
  }

  return Array.from(map.entries())
    .map(([area, { total, completed }]) => ({
      area,
      cumplimiento: total > 0 ? Math.round((completed / total) * 100) : 0,
      total,
      completed,
    }))
    .sort((a, b) => a.area.localeCompare(b.area))
}

// ── Tareas mas incumplidas (ranking) ──────────────────────

export interface MostFailedTask {
  title: string
  area: string
  times_assigned: number
  times_failed: number
  failure_rate: number
}

export async function getMostFailedTasks(range?: DateRange, limit: number = 10): Promise<MostFailedTask[]> {
  const tasks = await fetchTasks(range)
  const now = Date.now()

  const map = new Map<string, MostFailedTask>()
  for (const t of tasks) {
    const key = `${t.title}::${t.area}`
    if (!map.has(key)) {
      map.set(key, { title: t.title, area: t.area, times_assigned: 0, times_failed: 0, failure_rate: 0 })
    }
    const entry = map.get(key)!
    entry.times_assigned++

    const overdueOpen = (t.status === 'pending' || t.status === 'in_progress')
      && t.due_date !== null && new Date(t.due_date).getTime() < now
    if (overdueOpen || isLate(t)) entry.times_failed++
  }

  return Array.from(map.values())
    .filter((t) => t.times_failed > 0)
    .map((t) => ({
      ...t,
      failure_rate: Math.round((t.times_failed / t.times_assigned) * 100),
    }))
    .sort((a, b) => b.times_failed - a.times_failed || b.failure_rate - a.failure_rate)
    .slice(0, limit)
}
