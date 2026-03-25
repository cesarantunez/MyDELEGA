import { runRead, runWrite, persistDatabase } from '../db/sqlite-client'
import type { TaskRow } from './task.repository'
import { notifyTaskCompleted } from '../notifications/notification-service'

// ══════════════════════════════════════════════════════════════
// PRIVACIDAD: Todas las queries filtran por assigned_to = userId.
// Un empleado NUNCA puede ver tareas de otro.
// ══════════════════════════════════════════════════════════════

const BASE_SELECT = `
  SELECT t.*,
    u1.name as assigned_to_name,
    u2.name as assigned_by_name
  FROM tasks t
  LEFT JOIN users u1 ON t.assigned_to = u1.id
  LEFT JOIN users u2 ON t.assigned_by = u2.id
`

// ── Stats ─────────────────────────────────────────────────

export interface EmployeeStats {
  pending_today: number
  completed_week: number
  due_soon: number
}

export function getMyStats(userId: number): EmployeeStats {
  const pendingToday = runRead<{ count: number }>(
    `SELECT COUNT(*) as count FROM tasks
     WHERE assigned_to = ? AND status IN ('pending', 'in_progress')
     AND date(created_at) <= date('now')`,
    [userId]
  )

  const completedWeek = runRead<{ count: number }>(
    `SELECT COUNT(*) as count FROM tasks
     WHERE assigned_to = ? AND status = 'completed'
     AND completed_at >= datetime('now', '-7 days')`,
    [userId]
  )

  const dueSoon = runRead<{ count: number }>(
    `SELECT COUNT(*) as count FROM tasks
     WHERE assigned_to = ? AND status IN ('pending', 'in_progress')
     AND due_date IS NOT NULL
     AND due_date <= datetime('now', '+24 hours')
     AND due_date > datetime('now')`,
    [userId]
  )

  return {
    pending_today: pendingToday[0]?.count ?? 0,
    completed_week: completedWeek[0]?.count ?? 0,
    due_soon: dueSoon[0]?.count ?? 0,
  }
}

// ── My Tasks (filtered) ───────────────────────────────────

export interface MyTaskFilters {
  status?: string
  from_date?: string
  to_date?: string
}

export function getMyTasks(userId: number, filters: MyTaskFilters = {}): TaskRow[] {
  const conditions: string[] = ['t.assigned_to = ?']
  const params: (string | number)[] = [userId]

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

  const where = `WHERE ${conditions.join(' AND ')}`
  return runRead<TaskRow>(
    `${BASE_SELECT} ${where} ORDER BY
      CASE WHEN t.due_date IS NOT NULL AND t.due_date <= datetime('now', '+24 hours') AND t.status IN ('pending', 'in_progress') THEN 0 ELSE 1 END,
      t.due_date ASC NULLS LAST,
      t.created_at DESC`,
    params
  )
}

export function getMyTaskById(userId: number, taskId: number): TaskRow | null {
  const rows = runRead<TaskRow>(
    `${BASE_SELECT} WHERE t.id = ? AND t.assigned_to = ?`,
    [taskId, userId]
  )
  return rows[0] ?? null
}

// ── Checklist (current week) ──────────────────────────────

export interface ChecklistItemRow {
  id: number
  checklist_id: number
  title: string
  completed: number
  completed_at: string | null
  sort_order: number
  task_title: string
  task_id: number
}

export interface WeeklyChecklistData {
  items: ChecklistItemRow[]
  total: number
  completed: number
  percentage: number
}

export function getMyWeeklyChecklist(userId: number): WeeklyChecklistData {
  const items = runRead<ChecklistItemRow>(
    `SELECT ct.*, t.title as task_title, t.id as task_id
     FROM checklist_tasks ct
     JOIN checklists c ON ct.checklist_id = c.id
     JOIN tasks t ON c.task_id = t.id
     WHERE t.assigned_to = ?
       AND t.created_at >= datetime('now', 'weekday 0', '-7 days')
     ORDER BY ct.sort_order`,
    [userId]
  )

  const total = items.length
  const completed = items.filter((i) => i.completed === 1).length

  return {
    items,
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}

export async function toggleChecklistItem(userId: number, itemId: number): Promise<boolean> {
  // Verify ownership through the chain: checklist_task → checklist → task → assigned_to
  const ownership = runRead<{ count: number }>(
    `SELECT COUNT(*) as count FROM checklist_tasks ct
     JOIN checklists c ON ct.checklist_id = c.id
     JOIN tasks t ON c.task_id = t.id
     WHERE ct.id = ? AND t.assigned_to = ?`,
    [itemId, userId]
  )

  if (ownership[0]?.count === 0) return false

  const current = runRead<{ completed: number }>(
    'SELECT completed FROM checklist_tasks WHERE id = ?',
    [itemId]
  )
  const newVal = current[0]?.completed === 1 ? 0 : 1
  const completedAt = newVal === 1 ? "datetime('now')" : 'NULL'

  runWrite(
    `UPDATE checklist_tasks SET completed = ?, completed_at = ${completedAt} WHERE id = ?`,
    [newVal, itemId]
  )
  await persistDatabase()
  return true
}

// ── Complete task ─────────────────────────────────────────

export async function completeMyTask(
  userId: number,
  taskId: number,
  evidenceBase64?: string
): Promise<boolean> {
  // Verify ownership
  const ownership = runRead<{ count: number }>(
    'SELECT COUNT(*) as count FROM tasks WHERE id = ? AND assigned_to = ?',
    [taskId, userId]
  )
  if (ownership[0]?.count === 0) return false

  if (evidenceBase64) {
    runWrite(
      `UPDATE tasks SET status = 'completed', completed_at = datetime('now'), evidence_base64 = ? WHERE id = ? AND assigned_to = ?`,
      [evidenceBase64, taskId, userId]
    )
  } else {
    runWrite(
      `UPDATE tasks SET status = 'completed', completed_at = datetime('now') WHERE id = ? AND assigned_to = ?`,
      [taskId, userId]
    )
  }

  // Notify admins about completion
  const task = runRead<{ title: string; assigned_by: number }>('SELECT title, assigned_by FROM tasks WHERE id = ?', [taskId])
  const employee = runRead<{ name: string }>('SELECT name FROM users WHERE id = ?', [userId])
  if (task[0] && employee[0]) {
    notifyTaskCompleted(task[0].assigned_by, employee[0].name, task[0].title, taskId)
  }

  await persistDatabase()
  return true
}

export async function startMyTask(userId: number, taskId: number): Promise<boolean> {
  const ownership = runRead<{ count: number }>(
    'SELECT COUNT(*) as count FROM tasks WHERE id = ? AND assigned_to = ?',
    [taskId, userId]
  )
  if (ownership[0]?.count === 0) return false

  runWrite(
    `UPDATE tasks SET status = 'in_progress' WHERE id = ? AND assigned_to = ? AND status = 'pending'`,
    [taskId, userId]
  )
  await persistDatabase()
  return true
}

// ── Profile history ───────────────────────────────────────

export interface WeeklyHistory {
  week_start: string
  completed: number
  total: number
}

export function getMyWeeklyHistory(userId: number, weeks: number = 4): WeeklyHistory[] {
  const result: WeeklyHistory[] = []

  for (let i = 0; i < weeks; i++) {
    const offset = -i * 7
    const row = runRead<{ completed: number; total: number }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM tasks
       WHERE assigned_to = ?
         AND created_at >= datetime('now', '${offset - 7} days')
         AND created_at < datetime('now', '${offset} days')`,
      [userId]
    )

    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() + offset - 7)

    result.push({
      week_start: weekStart.toISOString().split('T')[0],
      completed: row[0]?.completed ?? 0,
      total: row[0]?.total ?? 0,
    })
  }

  return result.reverse()
}

// ── Notifications ─────────────────────────────────────────

export interface NotificationRow {
  id: number
  user_id: number
  title: string
  body: string | null
  type: string
  read: number
  reference_id: number | null
  created_at: string
}

export function getMyUnreadCount(userId: number): number {
  const rows = runRead<{ count: number }>(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0',
    [userId]
  )
  return rows[0]?.count ?? 0
}

export function getMyNotifications(userId: number): NotificationRow[] {
  return runRead<NotificationRow>(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [userId]
  )
}

export async function markNotificationRead(userId: number, notificationId: number): Promise<void> {
  runWrite(
    'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  )
  await persistDatabase()
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  runWrite(
    'UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0',
    [userId]
  )
  await persistDatabase()
}
