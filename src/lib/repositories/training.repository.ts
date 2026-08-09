import { supabase } from '../supabase'
import { useAuthStore } from '../../stores/auth.store'
import { sendPushToUsers } from '../notifications/notification-service'

// ══════════════════════════════════════════════════════════════
// Capacitación (SPEC V2 §M5): módulos con material + asignación
// con fecha límite + checklists de conocimiento verificados en
// persona. Los quizzes generados por IA llegan en Fase 5.
// ══════════════════════════════════════════════════════════════

export interface TrainingLink {
  label: string
  url: string
}

export interface TrainingModuleRow {
  id: string
  area: string
  title: string
  content: string | null
  links: TrainingLink[]
  document_ids: string[]
  created_by: string
  created_at: string
  // agregados
  assigned_count?: number
  completed_count?: number
}

export interface CreateModuleInput {
  area: string
  title: string
  content?: string
  links?: TrainingLink[]
  document_ids?: string[]
}

export interface TrainingProgressRow {
  id: string
  module_id: string
  profile_id: string
  due_date: string | null
  status: 'assigned' | 'completed'
  assigned_at: string
  completed_at: string | null
  profile_name?: string
}

export interface MyTrainingItem {
  progress_id: string
  module: TrainingModuleRow
  due_date: string | null
  status: 'assigned' | 'completed'
  completed_at: string | null
}

function currentUser() {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Sin sesion activa')
  return user
}

// ── Módulos ────────────────────────────────────────────────

export async function getModules(area?: string): Promise<TrainingModuleRow[]> {
  let query = supabase
    .from('training_modules')
    .select('*, training_progress(status)')
  if (area) query = query.eq('area', area)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  interface Raw extends Omit<TrainingModuleRow, 'assigned_count' | 'completed_count'> {
    training_progress: { status: string }[]
  }
  return (data as unknown as Raw[]).map(({ training_progress, ...rest }) => ({
    ...rest,
    assigned_count: training_progress.length,
    completed_count: training_progress.filter((p) => p.status === 'completed').length,
  }))
}

export async function createModule(input: CreateModuleInput): Promise<string> {
  const user = currentUser()
  const { data, error } = await supabase
    .from('training_modules')
    .insert({
      business_id: user.business_id,
      area: input.area,
      title: input.title,
      content: input.content || null,
      links: input.links ?? [],
      document_ids: input.document_ids ?? [],
      created_by: user.id,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return (data as { id: string }).id
}

export async function deleteModule(id: string): Promise<void> {
  const { error } = await supabase.from('training_modules').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Asignación y progreso ──────────────────────────────────

export async function getModuleProgress(moduleId: string): Promise<TrainingProgressRow[]> {
  const { data, error } = await supabase
    .from('training_progress')
    .select('*, profile:profiles!training_progress_profile_id_fkey(name)')
    .eq('module_id', moduleId)
    .order('assigned_at')
  if (error) throw new Error(error.message)
  interface Raw extends Omit<TrainingProgressRow, 'profile_name'> {
    profile: { name: string } | null
  }
  return (data as unknown as Raw[]).map(({ profile, ...rest }) => ({
    ...rest,
    profile_name: profile?.name,
  }))
}

export async function assignModule(
  moduleId: string,
  moduleTitle: string,
  profileIds: string[],
  dueDate?: string | null
): Promise<void> {
  const user = currentUser()
  const { error } = await supabase.from('training_progress').upsert(
    profileIds.map((profileId) => ({
      business_id: user.business_id,
      module_id: moduleId,
      profile_id: profileId,
      due_date: dueDate || null,
      assigned_by: user.id,
    })),
    { onConflict: 'module_id,profile_id', ignoreDuplicates: true }
  )
  if (error) throw new Error(error.message)

  // Notificación in-app + push
  await supabase.from('notifications').insert(
    profileIds.map((profileId) => ({
      business_id: user.business_id,
      user_id: profileId,
      title: 'Nueva capacitacion asignada',
      body: moduleTitle,
      type: 'training_assigned',
      reference_id: moduleId,
    }))
  )
  void sendPushToUsers(profileIds, {
    title: 'Nueva capacitacion',
    body: moduleTitle,
    url: '/employee/training',
    tag: `training-${moduleId}`,
  })
}

export async function getMyTraining(userId: string): Promise<MyTrainingItem[]> {
  const { data, error } = await supabase
    .from('training_progress')
    .select('id, due_date, status, completed_at, module:training_modules(*)')
    .eq('profile_id', userId)
    .order('assigned_at', { ascending: false })
  if (error) throw new Error(error.message)

  interface Raw {
    id: string
    due_date: string | null
    status: 'assigned' | 'completed'
    completed_at: string | null
    module: TrainingModuleRow | null
  }
  return (data as unknown as Raw[])
    .filter((r) => r.module !== null)
    .map((r) => ({
      progress_id: r.id,
      module: r.module as TrainingModuleRow,
      due_date: r.due_date,
      status: r.status,
      completed_at: r.completed_at,
    }))
}

export async function completeMyModule(progressId: string): Promise<void> {
  const { error } = await supabase
    .from('training_progress')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', progressId)
  if (error) throw new Error(error.message)
}

// ── Checklists de conocimiento ─────────────────────────────

export interface SkillChecklistRow {
  id: string
  area: string
  title: string
  created_at: string
  items: SkillItemRow[]
}

export interface SkillItemRow {
  id: string
  title: string
  sort: number
}

export interface SkillCheckRow {
  item_id: string
  profile_id: string
  verified_by: string
  verified_at: string
  verified_by_name?: string
}

export async function getSkillChecklists(area?: string): Promise<SkillChecklistRow[]> {
  let query = supabase
    .from('skill_checklists')
    .select('id, area, title, created_at, items:skill_items(id, title, sort)')
  if (area) query = query.eq('area', area)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  interface Raw extends Omit<SkillChecklistRow, 'items'> {
    items: SkillItemRow[]
  }
  return (data as unknown as Raw[]).map((r) => ({
    ...r,
    items: [...r.items].sort((a, b) => a.sort - b.sort),
  }))
}

export async function createSkillChecklist(area: string, title: string, items: string[]): Promise<string> {
  const user = currentUser()
  const { data, error } = await supabase
    .from('skill_checklists')
    .insert({ business_id: user.business_id, area, title, created_by: user.id })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  const checklistId = (data as { id: string }).id

  const { error: itemsError } = await supabase.from('skill_items').insert(
    items.map((t, i) => ({ checklist_id: checklistId, title: t, sort: i }))
  )
  if (itemsError) throw new Error(itemsError.message)
  return checklistId
}

/** Checks de un empleado para una checklist (mapa item_id → check). */
export async function getSkillChecks(itemIds: string[], profileId?: string): Promise<SkillCheckRow[]> {
  if (itemIds.length === 0) return []
  let query = supabase
    .from('skill_checks')
    .select('item_id, profile_id, verified_by, verified_at, verifier:profiles!skill_checks_verified_by_fkey(name)')
    .in('item_id', itemIds)
  if (profileId) query = query.eq('profile_id', profileId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  interface Raw extends Omit<SkillCheckRow, 'verified_by_name'> {
    verifier: { name: string } | null
  }
  return (data as unknown as Raw[]).map(({ verifier, ...rest }) => ({
    ...rest,
    verified_by_name: verifier?.name,
  }))
}

/** El manager marca/desmarca una habilidad verificada en persona. */
export async function toggleSkillCheck(itemId: string, profileId: string, currentlyChecked: boolean): Promise<void> {
  const user = currentUser()
  if (currentlyChecked) {
    const { error } = await supabase
      .from('skill_checks')
      .delete()
      .eq('item_id', itemId)
      .eq('profile_id', profileId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('skill_checks').insert({
      business_id: user.business_id,
      item_id: itemId,
      profile_id: profileId,
      verified_by: user.id,
    })
    if (error) throw new Error(error.message)
  }
}
