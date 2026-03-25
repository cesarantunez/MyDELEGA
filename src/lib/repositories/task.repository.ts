import { runRead, runWrite, persistDatabase } from '../db/sqlite-client'
import { notifyTaskAssigned } from '../notifications/notification-service'

export interface TaskRow {
  id: number
  template_id: number | null
  assigned_to: number
  assigned_by: number
  area: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  due_date: string | null
  evidence_base64: string | null
  completed_at: string | null
  created_at: string
  // Joined fields
  assigned_to_name?: string
  assigned_by_name?: string
}

export interface TaskTemplateRow {
  id: number
  area: string
  title: string
  description: string | null
  default_priority: string
  default_checklist: string | null
  created_at: string
}

export interface CreateTaskInput {
  template_id?: number | null
  assigned_to: number
  assigned_by: number
  area: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string | null
  checklist_items?: string[]
}

export interface TaskFilters {
  area?: string
  assigned_to?: number
  status?: string
  from_date?: string
  to_date?: string
}

export interface TaskStats {
  active: number
  completed_today: number
  overdue: number
}

export interface AreaCompliance {
  area: string
  total: number
  completed: number
  percentage: number
}

// ── Queries ────────────────────────────────────────────────

const BASE_SELECT = `
  SELECT t.*,
    u1.name as assigned_to_name,
    u2.name as assigned_by_name
  FROM tasks t
  LEFT JOIN users u1 ON t.assigned_to = u1.id
  LEFT JOIN users u2 ON t.assigned_by = u2.id
`

export function getAllTasks(): TaskRow[] {
  return runRead<TaskRow>(`${BASE_SELECT} ORDER BY t.created_at DESC`)
}

export function getTaskById(id: number): TaskRow | null {
  const rows = runRead<TaskRow>(`${BASE_SELECT} WHERE t.id = ?`, [id])
  return rows[0] ?? null
}

export function getFilteredTasks(filters: TaskFilters): TaskRow[] {
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (filters.area) {
    conditions.push('t.area = ?')
    params.push(filters.area)
  }
  if (filters.assigned_to) {
    conditions.push('t.assigned_to = ?')
    params.push(filters.assigned_to)
  }
  if (filters.status) {
    if (filters.status === 'overdue') {
      conditions.push("t.status IN ('pending', 'in_progress') AND t.due_date < datetime('now')")
    } else {
      conditions.push('t.status = ?')
      params.push(filters.status)
    }
  }
  if (filters.from_date) {
    conditions.push('t.created_at >= ?')
    params.push(filters.from_date)
  }
  if (filters.to_date) {
    conditions.push('t.created_at <= ?')
    params.push(filters.to_date)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  return runRead<TaskRow>(`${BASE_SELECT} ${where} ORDER BY t.created_at DESC`, params)
}

export function getTaskStats(): TaskStats {
  const active = runRead<{ count: number }>(
    "SELECT COUNT(*) as count FROM tasks WHERE status IN ('pending', 'in_progress')"
  )
  const completedToday = runRead<{ count: number }>(
    "SELECT COUNT(*) as count FROM tasks WHERE status = 'completed' AND date(completed_at) = date('now')"
  )
  const overdue = runRead<{ count: number }>(
    "SELECT COUNT(*) as count FROM tasks WHERE status IN ('pending', 'in_progress') AND due_date < datetime('now') AND due_date IS NOT NULL"
  )
  return {
    active: active[0]?.count ?? 0,
    completed_today: completedToday[0]?.count ?? 0,
    overdue: overdue[0]?.count ?? 0,
  }
}

export function getComplianceByArea(): AreaCompliance[] {
  const rows = runRead<{ area: string; total: number; completed: number }>(
    `SELECT area,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM tasks
    GROUP BY area`
  )
  return rows.map((r) => ({
    area: r.area,
    total: r.total,
    completed: r.completed,
    percentage: r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0,
  }))
}

// ── Templates ──────────────────────────────────────────────

export function getTemplatesByArea(area: string): TaskTemplateRow[] {
  return runRead<TaskTemplateRow>(
    'SELECT * FROM task_templates WHERE area = ? ORDER BY title',
    [area]
  )
}

export function getAllAreas(): string[] {
  const rows = runRead<{ area: string }>('SELECT DISTINCT area FROM task_templates ORDER BY area')
  return rows.map((r) => r.area)
}

// ── Mutations ──────────────────────────────────────────────

export async function createTask(input: CreateTaskInput): Promise<number> {
  runWrite(
    `INSERT INTO tasks (template_id, assigned_to, assigned_by, area, title, description, priority, status, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [
      input.template_id ?? null,
      input.assigned_to,
      input.assigned_by,
      input.area,
      input.title,
      input.description ?? null,
      input.priority,
      input.due_date ?? null,
    ]
  )

  const taskRows = runRead<{ id: number }>('SELECT last_insert_rowid() as id')
  const taskId = taskRows[0].id

  // Create checklist if items provided
  if (input.checklist_items && input.checklist_items.length > 0) {
    runWrite(
      'INSERT INTO checklists (task_id, title) VALUES (?, ?)',
      [taskId, 'Checklist']
    )
    const clRows = runRead<{ id: number }>('SELECT last_insert_rowid() as id')
    const checklistId = clRows[0].id

    for (let i = 0; i < input.checklist_items.length; i++) {
      runWrite(
        'INSERT INTO checklist_tasks (checklist_id, title, sort_order) VALUES (?, ?, ?)',
        [checklistId, input.checklist_items[i], i]
      )
    }
  }

  // Notify employee about new task
  notifyTaskAssigned(input.assigned_to, input.title, taskId)

  await persistDatabase()
  return taskId
}

export async function updateTaskStatus(
  id: number,
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
): Promise<void> {
  const completedAt = status === 'completed' ? "datetime('now')" : 'NULL'
  runWrite(
    `UPDATE tasks SET status = ?, completed_at = ${completedAt} WHERE id = ?`,
    [status, id]
  )
  await persistDatabase()
}
