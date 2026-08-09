import { supabase } from '../supabase'
import { useAuthStore } from '../../stores/auth.store'
import { TASK_SELECT, mapTask, type TaskRow } from './task.repository'
import { notifyTaskCompleted } from '../notifications/notification-service'

// ══════════════════════════════════════════════════════════════
// PRIVACIDAD: ademas del filtro assigned_to en cada query, la RLS
// de Supabase garantiza a nivel de base que un empleado NUNCA
// puede ver tareas de otro.
// ══════════════════════════════════════════════════════════════

function currentBusinessId(): string {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Sin sesion activa')
  return user.business_id
}

// ── Stats ─────────────────────────────────────────────────

export interface EmployeeStats {
  pending_today: number
  completed_week: number
  due_soon: number
}

export async function getMyStats(userId: string): Promise<EmployeeStats> {
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [pending, completedWeek, dueSoon] = await Promise.all([
    supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .in('status', ['pending', 'in_progress']),
    supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .eq('status', 'completed')
      .gte('completed_at', weekAgo.toISOString()),
    supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .in('status', ['pending', 'in_progress'])
      .gt('due_date', now.toISOString())
      .lte('due_date', in24h.toISOString()),
  ])

  return {
    pending_today: pending.count ?? 0,
    completed_week: completedWeek.count ?? 0,
    due_soon: dueSoon.count ?? 0,
  }
}

// ── My Tasks (filtered) ───────────────────────────────────

export interface MyTaskFilters {
  status?: string
  from_date?: string
  to_date?: string
}

export async function getMyTasks(userId: string, filters: MyTaskFilters = {}): Promise<TaskRow[]> {
  let query = supabase.from('tasks').select(TASK_SELECT).eq('assigned_to', userId)

  if (filters.status) {
    if (filters.status === 'overdue') {
      query = query
        .in('status', ['pending', 'in_progress'])
        .lt('due_date', new Date().toISOString())
    } else {
      query = query.eq('status', filters.status)
    }
  }
  if (filters.from_date) query = query.gte('created_at', filters.from_date)
  if (filters.to_date) query = query.lte('created_at', filters.to_date)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  const tasks = (data as unknown as Parameters<typeof mapTask>[0][]).map(mapTask)

  // Urgentes (<24h) primero, luego por fecha limite, luego por creacion
  const now = Date.now()
  const isUrgent = (t: TaskRow) =>
    (t.status === 'pending' || t.status === 'in_progress') &&
    t.due_date !== null &&
    new Date(t.due_date).getTime() - now < 24 * 60 * 60 * 1000

  return tasks.sort((a, b) => {
    const ua = isUrgent(a) ? 0 : 1
    const ub = isUrgent(b) ? 0 : 1
    if (ua !== ub) return ua - ub
    const da = a.due_date ? new Date(a.due_date).getTime() : Infinity
    const db = b.due_date ? new Date(b.due_date).getTime() : Infinity
    if (da !== db) return da - db
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export async function getMyTaskById(userId: string, taskId: string): Promise<TaskRow | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('id', taskId)
    .eq('assigned_to', userId)
    .maybeSingle()
  if (error || !data) return null
  return mapTask(data as unknown as Parameters<typeof mapTask>[0])
}

// ── Checklist (current week) ──────────────────────────────

export interface ChecklistItemRow {
  id: string
  title: string
  completed: number
  completed_at: string | null
  sort_order: number
  task_title: string
  task_id: string
}

export interface WeeklyChecklistData {
  items: ChecklistItemRow[]
  total: number
  completed: number
  percentage: number
}

function currentWeekMondayIso(): string {
  const d = new Date()
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diffToMonday)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

interface RawChecklistItem {
  id: string
  title: string
  completed: boolean
  completed_at: string | null
  sort_order: number
  task: { id: string; title: string }
}

export async function getMyWeeklyChecklist(userId: string): Promise<WeeklyChecklistData> {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('id, title, completed, completed_at, sort_order, task:tasks!inner(id, title, assigned_to, created_at)')
    .eq('task.assigned_to', userId)
    .gte('task.created_at', currentWeekMondayIso())
    .order('sort_order')
  if (error) throw new Error(error.message)

  const items: ChecklistItemRow[] = (data as unknown as RawChecklistItem[]).map((r) => ({
    id: r.id,
    title: r.title,
    completed: r.completed ? 1 : 0,
    completed_at: r.completed_at,
    sort_order: r.sort_order,
    task_id: r.task.id,
    task_title: r.task.title,
  }))

  const total = items.length
  const completed = items.filter((i) => i.completed === 1).length

  return {
    items,
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}

export async function toggleChecklistItem(_userId: string, itemId: string): Promise<boolean> {
  const { data } = await supabase
    .from('checklist_items')
    .select('completed')
    .eq('id', itemId)
    .maybeSingle()
  if (!data) return false

  const newVal = !data.completed
  const { error } = await supabase
    .from('checklist_items')
    .update({
      completed: newVal,
      completed_at: newVal ? new Date().toISOString() : null,
    })
    .eq('id', itemId)
  return !error
}

// ── Complete / start task ─────────────────────────────────

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

export async function completeMyTask(
  userId: string,
  taskId: string,
  evidenceDataUrl?: string
): Promise<boolean> {
  const businessId = currentBusinessId()

  let evidencePath: string | null = null
  if (evidenceDataUrl) {
    const blob = await dataUrlToBlob(evidenceDataUrl)
    evidencePath = `${businessId}/${taskId}-${Date.now()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('evidence')
      .upload(evidencePath, blob, { contentType: blob.type || 'image/jpeg' })
    if (uploadError) {
      evidencePath = null
    }
  }

  const update: Record<string, unknown> = {
    status: 'completed',
    completed_at: new Date().toISOString(),
  }
  if (evidencePath) update.evidence_path = evidencePath

  const { data, error } = await supabase
    .from('tasks')
    .update(update)
    .eq('id', taskId)
    .eq('assigned_to', userId)
    .select('title, assigned_by')
    .maybeSingle()

  if (error || !data) return false

  const employeeName = useAuthStore.getState().user?.name ?? 'Un empleado'
  await notifyTaskCompleted(businessId, data.assigned_by, employeeName, data.title, taskId)

  return true
}

export async function startMyTask(userId: string, taskId: string): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'in_progress' })
    .eq('id', taskId)
    .eq('assigned_to', userId)
    .eq('status', 'pending')
  return !error
}

// ── Profile history ───────────────────────────────────────

export interface WeeklyHistory {
  week_start: string
  completed: number
  total: number
}

export async function getMyWeeklyHistory(userId: string, weeks: number = 4): Promise<WeeklyHistory[]> {
  const since = new Date()
  since.setDate(since.getDate() - weeks * 7)

  const { data, error } = await supabase
    .from('tasks')
    .select('status, created_at')
    .eq('assigned_to', userId)
    .gte('created_at', since.toISOString())
  if (error) throw new Error(error.message)

  const result: WeeklyHistory[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const windowEnd = new Date()
    windowEnd.setDate(windowEnd.getDate() - i * 7)
    const windowStart = new Date(windowEnd)
    windowStart.setDate(windowStart.getDate() - 7)

    const inWindow = (data as { status: string; created_at: string }[]).filter((t) => {
      const created = new Date(t.created_at)
      return created >= windowStart && created < windowEnd
    })

    result.push({
      week_start: windowStart.toISOString().split('T')[0],
      completed: inWindow.filter((t) => t.status === 'completed').length,
      total: inWindow.length,
    })
  }

  return result
}

// ── Notifications ─────────────────────────────────────────

export interface NotificationRow {
  id: string
  user_id: string
  title: string
  body: string | null
  type: string
  read: number
  reference_id: string | null
  created_at: string
}

interface RawNotification extends Omit<NotificationRow, 'read'> {
  read: boolean
}

export async function getMyUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
  if (error) return 0
  return count ?? 0
}

export async function getMyNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return []
  return (data as RawNotification[]).map((n) => ({ ...n, read: n.read ? 1 : 0 }))
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
}
