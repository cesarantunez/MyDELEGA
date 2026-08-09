import { supabase } from '../supabase'
import { useAuthStore } from '../../stores/auth.store'
import { notifyTaskAssigned } from '../notifications/notification-service'

export interface TaskRow {
  id: string
  template_id: string | null
  assigned_to: string
  assigned_by: string
  area: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  due_date: string | null
  evidence_path: string | null
  completed_at: string | null
  created_at: string
  // Joined fields
  assigned_to_name?: string
  assigned_by_name?: string
}

export interface TaskTemplateRow {
  id: string
  area: string
  title: string
  description: string | null
  default_priority: string
  default_checklist: string[]
  created_at: string
}

export interface CreateTaskInput {
  template_id?: string | null
  assigned_to: string
  assigned_by: string
  area: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string | null
  checklist_items?: string[]
}

export interface TaskFilters {
  area?: string
  assigned_to?: string
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

// ── Select con nombres joineados ───────────────────────────

export const TASK_SELECT = `
  *,
  assigned_to_profile:profiles!tasks_assigned_to_fkey(name),
  assigned_by_profile:profiles!tasks_assigned_by_fkey(name)
`

interface RawTaskRow extends Omit<TaskRow, 'assigned_to_name' | 'assigned_by_name'> {
  assigned_to_profile: { name: string } | null
  assigned_by_profile: { name: string } | null
}

export function mapTask(row: RawTaskRow): TaskRow {
  const { assigned_to_profile, assigned_by_profile, ...rest } = row
  return {
    ...rest,
    assigned_to_name: assigned_to_profile?.name,
    assigned_by_name: assigned_by_profile?.name,
  }
}

function currentBusinessId(): string {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Sin sesion activa')
  return user.business_id
}

// ── Queries ────────────────────────────────────────────────

export async function getFilteredTasks(filters: TaskFilters): Promise<TaskRow[]> {
  let query = supabase.from('tasks').select(TASK_SELECT)

  if (filters.area) query = query.eq('area', filters.area)
  if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to)
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
  return (data as unknown as RawTaskRow[]).map(mapTask)
}

export async function getTaskStats(): Promise<TaskStats> {
  const nowIso = new Date().toISOString()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [active, completedToday, overdue] = await Promise.all([
    supabase.from('tasks').select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'in_progress']),
    supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', todayStart.toISOString()),
    supabase.from('tasks').select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'in_progress'])
      .lt('due_date', nowIso),
  ])

  return {
    active: active.count ?? 0,
    completed_today: completedToday.count ?? 0,
    overdue: overdue.count ?? 0,
  }
}

export async function getComplianceByArea(): Promise<AreaCompliance[]> {
  const { data, error } = await supabase.from('tasks').select('area, status')
  if (error) throw new Error(error.message)

  const map = new Map<string, { total: number; completed: number }>()
  for (const row of data as { area: string; status: string }[]) {
    const entry = map.get(row.area) ?? { total: 0, completed: 0 }
    entry.total++
    if (row.status === 'completed') entry.completed++
    map.set(row.area, entry)
  }

  return Array.from(map.entries()).map(([area, { total, completed }]) => ({
    area,
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  }))
}

// ── Templates y areas ──────────────────────────────────────

export async function getTemplatesByArea(area: string): Promise<TaskTemplateRow[]> {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('area', area)
    .order('title')
  if (error) throw new Error(error.message)
  return data as TaskTemplateRow[]
}

export async function getAllAreas(): Promise<string[]> {
  const { data, error } = await supabase
    .from('areas')
    .select('name')
    .order('sort')
  if (error) throw new Error(error.message)
  return (data as { name: string }[]).map((r) => r.name)
}

// ── Mutations ──────────────────────────────────────────────

export async function createTask(input: CreateTaskInput): Promise<string> {
  const businessId = currentBusinessId()

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      business_id: businessId,
      template_id: input.template_id ?? null,
      assigned_to: input.assigned_to,
      assigned_by: input.assigned_by,
      area: input.area,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      status: 'pending',
      due_date: input.due_date ? new Date(input.due_date).toISOString() : null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  const taskId = (data as { id: string }).id

  if (input.checklist_items && input.checklist_items.length > 0) {
    const { error: clError } = await supabase.from('checklist_items').insert(
      input.checklist_items.map((title, i) => ({
        task_id: taskId,
        title,
        sort_order: i,
      }))
    )
    if (clError) throw new Error(clError.message)
  }

  await notifyTaskAssigned(businessId, input.assigned_to, input.title, taskId)

  return taskId
}

export async function updateTaskStatus(
  id: string,
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Evidencia (Storage privado, URL firmada) ───────────────

export async function getEvidenceUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('evidence')
    .createSignedUrl(path, 3600)
  if (error) return null
  return data.signedUrl
}
