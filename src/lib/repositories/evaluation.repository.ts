import { supabase } from '../supabase'
import { useAuthStore } from '../../stores/auth.store'
import { sendPushToUsers } from '../notifications/notification-service'
import { DIMENSIONS } from '../evaluations/dimensions'

// ══════════════════════════════════════════════════════════════
// Evaluaciones de desempeño (SPEC V2 §M6). Append-only: se crean
// finalizadas y ni el cliente ni la RLS permiten editarlas.
// Productividad y conocimiento se sugieren con datos reales.
// ══════════════════════════════════════════════════════════════

export interface EvaluationRow {
  id: string
  profile_id: string
  evaluator_id: string
  period: string
  notes: string | null
  average: number
  created_at: string
  evaluator_name?: string
  profile_name?: string
}

export interface EvaluationScoreRow {
  dimension: string
  score: number
  comment: string | null
  prefill_score: number | null
}

export interface EvaluationDetail extends EvaluationRow {
  scores: EvaluationScoreRow[]
}

export interface CreateEvaluationInput {
  profile_id: string
  period: string
  notes?: string
  scores: { dimension: string; score: number; comment?: string; prefill_score?: number | null }[]
}

export interface PrefillSuggestion {
  /** null = sin datos suficientes para sugerir */
  score: number | null
  detail: string
}

export interface PrefillData {
  productividad: PrefillSuggestion
  conocimiento: PrefillSuggestion
}

function currentUser() {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Sin sesion activa')
  return user
}

function pctToScore(pct: number): number {
  if (pct >= 90) return 5
  if (pct >= 75) return 4
  if (pct >= 50) return 3
  if (pct >= 25) return 2
  return 1
}

// ── Pre-llenado con datos reales ───────────────────────────

export async function computePrefill(profileId: string): Promise<PrefillData> {
  const since = new Date()
  since.setDate(since.getDate() - 30)

  // Productividad: tareas de los últimos 30 días completadas a tiempo
  const { data: tasks } = await supabase
    .from('tasks')
    .select('status, due_date, completed_at')
    .eq('assigned_to', profileId)
    .gte('created_at', since.toISOString())

  let productividad: PrefillSuggestion = { score: null, detail: 'Sin tareas en los ultimos 30 dias' }
  if (tasks && tasks.length > 0) {
    const rows = tasks as { status: string; due_date: string | null; completed_at: string | null }[]
    const now = Date.now()
    const onTime = rows.filter((t) =>
      t.status === 'completed' &&
      (!t.due_date || !t.completed_at || new Date(t.completed_at) <= new Date(t.due_date))
    ).length
    const failed = rows.filter((t) =>
      (t.status === 'completed' && t.due_date && t.completed_at && new Date(t.completed_at) > new Date(t.due_date)) ||
      ((t.status === 'pending' || t.status === 'in_progress') && t.due_date && new Date(t.due_date).getTime() < now)
    ).length
    const relevant = onTime + failed
    if (relevant === 0) {
      productividad = { score: null, detail: `${rows.length} tarea(s) aun en curso, sin datos de cierre` }
    } else {
      const pct = Math.round((onTime / relevant) * 100)
      productividad = {
        score: pctToScore(pct),
        detail: `${onTime}/${relevant} tareas a tiempo (${pct}%) en 30 dias`,
      }
    }
  }

  // Conocimiento: capacitaciones completadas + conocimiento verificado
  const [{ data: training }, { data: checklists }] = await Promise.all([
    supabase.from('training_progress').select('status').eq('profile_id', profileId),
    supabase.from('skill_checklists').select('id, items:skill_items(id)'),
  ])
  const { data: checks } = await supabase
    .from('skill_checks')
    .select('item_id')
    .eq('profile_id', profileId)

  const trainingRows = (training ?? []) as { status: string }[]
  const totalItems = ((checklists ?? []) as { items: { id: string }[] }[])
    .reduce((sum, c) => sum + c.items.length, 0)
  const checkedItems = (checks ?? []).length

  const parts: string[] = []
  const pcts: number[] = []
  if (trainingRows.length > 0) {
    const done = trainingRows.filter((t) => t.status === 'completed').length
    pcts.push((done / trainingRows.length) * 100)
    parts.push(`${done}/${trainingRows.length} capacitaciones`)
  }
  if (totalItems > 0) {
    pcts.push((checkedItems / totalItems) * 100)
    parts.push(`${checkedItems}/${totalItems} conocimientos verificados`)
  }

  const conocimiento: PrefillSuggestion = pcts.length === 0
    ? { score: null, detail: 'Sin capacitaciones ni verificaciones registradas' }
    : {
        score: pctToScore(pcts.reduce((a, b) => a + b, 0) / pcts.length),
        detail: parts.join(' · '),
      }

  return { productividad, conocimiento }
}

// ── Crear (siempre final) ──────────────────────────────────

export async function createEvaluation(input: CreateEvaluationInput): Promise<string> {
  const user = currentUser()

  if (input.scores.length !== DIMENSIONS.length) {
    throw new Error('Faltan dimensiones por calificar')
  }
  for (const s of input.scores) {
    if ((s.score === 1 || s.score === 5) && !s.comment?.trim()) {
      throw new Error('Las calificaciones de 1 o 5 requieren comentario')
    }
  }

  const average = input.scores.reduce((sum, s) => sum + s.score, 0) / input.scores.length

  const { data, error } = await supabase
    .from('evaluations')
    .insert({
      business_id: user.business_id,
      profile_id: input.profile_id,
      evaluator_id: user.id,
      period: input.period,
      notes: input.notes || null,
      average: Math.round(average * 100) / 100,
    })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  const evaluationId = (data as { id: string }).id

  const { error: scoresError } = await supabase.from('evaluation_scores').insert(
    input.scores.map((s) => ({
      evaluation_id: evaluationId,
      dimension: s.dimension,
      score: s.score,
      comment: s.comment?.trim() || null,
      prefill_score: s.prefill_score ?? null,
    }))
  )
  if (scoresError) throw new Error(scoresError.message)

  await supabase.from('audit_log').insert({
    business_id: user.business_id,
    actor_id: user.id,
    actor_type: 'user',
    action: 'evaluation_created',
    entity: 'evaluation',
    entity_id: evaluationId,
    payload: { profile_id: input.profile_id, period: input.period, average },
  })

  await supabase.from('notifications').insert({
    business_id: user.business_id,
    user_id: input.profile_id,
    title: 'Tu evaluacion esta lista',
    body: `Evaluacion de desempeño del periodo ${input.period}`,
    type: 'evaluation_ready',
    reference_id: evaluationId,
  })
  void sendPushToUsers([input.profile_id], {
    title: 'Tu evaluacion esta lista',
    body: `Periodo ${input.period} — abrela en tu perfil`,
    url: '/employee/profile',
    tag: `evaluation-${evaluationId}`,
  })

  return evaluationId
}

// ── Lecturas ───────────────────────────────────────────────

const EVAL_SELECT = `
  *,
  evaluator:profiles!evaluations_evaluator_id_fkey(name),
  evaluated:profiles!evaluations_profile_id_fkey(name)
`

interface RawEval extends Omit<EvaluationRow, 'evaluator_name' | 'profile_name'> {
  evaluator: { name: string } | null
  evaluated: { name: string } | null
}

function mapEval(r: RawEval): EvaluationRow {
  const { evaluator, evaluated, ...rest } = r
  return { ...rest, evaluator_name: evaluator?.name, profile_name: evaluated?.name }
}

/** Historial de un empleado (más reciente primero). */
export async function getEvaluationsFor(profileId: string): Promise<EvaluationRow[]> {
  const { data, error } = await supabase
    .from('evaluations')
    .select(EVAL_SELECT)
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as unknown as RawEval[]).map(mapEval)
}

export async function getEvaluationDetail(evaluationId: string): Promise<EvaluationDetail | null> {
  const [{ data: evalRow, error }, { data: scores }] = await Promise.all([
    supabase.from('evaluations').select(EVAL_SELECT).eq('id', evaluationId).maybeSingle(),
    supabase.from('evaluation_scores').select('dimension, score, comment, prefill_score').eq('evaluation_id', evaluationId),
  ])
  if (error || !evalRow) return null
  return {
    ...mapEval(evalRow as unknown as RawEval),
    scores: (scores ?? []) as EvaluationScoreRow[],
  }
}

/** Última evaluación por empleado (para la lista de Desempeño). */
export async function getLatestEvaluations(): Promise<Map<string, EvaluationRow>> {
  const { data, error } = await supabase
    .from('evaluations')
    .select(EVAL_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  const map = new Map<string, EvaluationRow>()
  for (const r of (data as unknown as RawEval[])) {
    if (!map.has(r.profile_id)) map.set(r.profile_id, mapEval(r))
  }
  return map
}

export function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
