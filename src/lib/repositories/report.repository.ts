import { runRead } from '../db/sqlite-client'

// ══════════════════════════════════════════════════════════════
// Queries para reportes admin con filtro por rango de fechas.
// ══════════════════════════════════════════════════════════════

export interface DateRange {
  from: string // YYYY-MM-DD
  to: string   // YYYY-MM-DD
}

// ── Cumplimiento por empleado (bar chart) ─────────────────

export interface EmployeeCompliance {
  employee_id: number
  name: string
  total: number
  completed: number
  on_time: number
  late: number
  pending: number
  percentage: number
}

export function getComplianceByEmployee(range?: DateRange): EmployeeCompliance[] {
  const dateFilter = range
    ? `AND t.created_at >= '${range.from}' AND t.created_at < datetime('${range.to}', '+1 day')`
    : ''

  const rows = runRead<{
    employee_id: number
    name: string
    total: number
    completed: number
    on_time: number
    late: number
  }>(
    `SELECT
      u.id as employee_id,
      u.name,
      COUNT(t.id) as total,
      SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN t.status = 'completed' AND (t.due_date IS NULL OR t.completed_at <= t.due_date) THEN 1 ELSE 0 END) as on_time,
      SUM(CASE WHEN t.status = 'completed' AND t.due_date IS NOT NULL AND t.completed_at > t.due_date THEN 1 ELSE 0 END) as late
     FROM users u
     JOIN tasks t ON t.assigned_to = u.id
     WHERE u.role = 'employee' AND u.active = 1 ${dateFilter}
     GROUP BY u.id
     ORDER BY u.name`
  )

  return rows.map((r) => ({
    ...r,
    pending: r.total - r.completed,
    percentage: r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0,
  }))
}

// ── Cumplimiento por area (radar chart) ───────────────────

export interface AreaRadarData {
  area: string
  cumplimiento: number
  total: number
  completed: number
}

export function getComplianceByAreaRadar(range?: DateRange): AreaRadarData[] {
  const dateFilter = range
    ? `AND created_at >= '${range.from}' AND created_at < datetime('${range.to}', '+1 day')`
    : ''

  const rows = runRead<{ area: string; total: number; completed: number }>(
    `SELECT
      area,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
     FROM tasks
     WHERE 1=1 ${dateFilter}
     GROUP BY area
     ORDER BY area`
  )

  return rows.map((r) => ({
    area: r.area,
    cumplimiento: r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0,
    total: r.total,
    completed: r.completed,
  }))
}

// ── Tareas mas incumplidas (ranking) ──────────────────────

export interface MostFailedTask {
  title: string
  area: string
  times_assigned: number
  times_failed: number
  failure_rate: number
}

export function getMostFailedTasks(range?: DateRange, limit: number = 10): MostFailedTask[] {
  const dateFilter = range
    ? `AND created_at >= '${range.from}' AND created_at < datetime('${range.to}', '+1 day')`
    : ''

  return runRead<MostFailedTask>(
    `SELECT
      title,
      area,
      COUNT(*) as times_assigned,
      SUM(CASE WHEN status IN ('pending', 'in_progress') AND due_date IS NOT NULL AND due_date < datetime('now') THEN 1
           WHEN status = 'completed' AND due_date IS NOT NULL AND completed_at > due_date THEN 1
           ELSE 0 END) as times_failed,
      ROUND(
        CAST(SUM(CASE WHEN status IN ('pending', 'in_progress') AND due_date IS NOT NULL AND due_date < datetime('now') THEN 1
             WHEN status = 'completed' AND due_date IS NOT NULL AND completed_at > due_date THEN 1
             ELSE 0 END) AS FLOAT) / COUNT(*) * 100
      ) as failure_rate
     FROM tasks
     WHERE 1=1 ${dateFilter}
     GROUP BY title, area
     HAVING times_failed > 0
     ORDER BY times_failed DESC, failure_rate DESC
     LIMIT ?`,
    [limit]
  )
}
