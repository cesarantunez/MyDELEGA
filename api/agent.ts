import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import {
  buildSystemPrompt,
  executeTool,
  AGENT_TOOLS,
  type AgentCaller,
  type BusinessContext,
} from './_agent.js'

// ══════════════════════════════════════════════════════════════
// POST /api/agent — DELI, el agente IA del negocio (SPEC V2 §M7).
// Claude (claude-opus-5) + tools con contrato agéntico, scope por
// rol verificado SERVER-SIDE (el prompt guía, el código manda).
// Respuesta en streaming NDJSON:
//   {t:'text',  v:'…'}      delta de texto del asistente
//   {t:'tool',  name:'…'}   el agente está usando una herramienta
//   {t:'done'}              fin del turno
//   {t:'error', message}    error terminal
// Rate limit: 40 mensajes/hora por usuario, contados en audit_log.
// ══════════════════════════════════════════════════════════════

export const config = { supportsResponseStreaming: true, maxDuration: 120 }

const MODEL = 'claude-opus-5'
const MAX_TOOL_ROUNDS = 6
const RATE_LIMIT_PER_HOUR = 40

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(30),
})

function writeLine(res: VercelResponse, obj: Record<string, unknown>) {
  res.write(JSON.stringify(obj) + '\n')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Solo POST' } })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ ok: false, error: { code: 'CONFIG', message: 'Supabase server env faltante' } })
  }
  if (!anthropicKey) {
    return res.status(500).json({ ok: false, error: { code: 'CONFIG', message: 'ANTHROPIC_API_KEY no configurada' } })
  }

  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { code: 'INVALID_BODY', message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') },
    })
  }

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  if (!token) {
    return res.status(401).json({ ok: false, error: { code: 'NO_AUTH', message: 'Falta token de sesion' } })
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // ── Identidad y scope del caller (server-side, no negociable) ──
  const { data: callerData, error: callerError } = await admin.auth.getUser(token)
  if (callerError || !callerData.user) {
    return res.status(401).json({ ok: false, error: { code: 'BAD_TOKEN', message: 'Sesion invalida' } })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('business_id, role, name, area_id, active')
    .eq('user_id', callerData.user.id)
    .maybeSingle()

  if (!profile || !profile.active) {
    return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Sin perfil activo' } })
  }

  // ── Rate limit por usuario (audit_log como contador) ──
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('actor_id', callerData.user.id)
    .eq('action', 'agent_chat')
    .gte('created_at', oneHourAgo)
  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return res.status(429).json({
      ok: false,
      error: { code: 'RATE_LIMITED', message: 'Alcanzaste el límite de mensajes por hora. Intenta más tarde.' },
    })
  }

  // ── Contexto del negocio ──
  const [{ data: business }, { data: areas }] = await Promise.all([
    admin.from('businesses').select('name, type').eq('id', profile.business_id).single(),
    admin.from('areas').select('id, name').eq('business_id', profile.business_id).order('sort'),
  ])
  if (!business) {
    return res.status(500).json({ ok: false, error: { code: 'NO_BUSINESS', message: 'Negocio no encontrado' } })
  }

  const caller: AgentCaller = {
    userId: callerData.user.id,
    businessId: profile.business_id,
    role: profile.role,
    name: profile.name,
    areaId: profile.area_id,
    areaName: (areas ?? []).find((a) => a.id === profile.area_id)?.name ?? null,
  }
  const biz: BusinessContext = { name: business.name, type: business.type, areas: areas ?? [] }

  // Registrar el uso (rate limit + telemetría)
  await admin.from('audit_log').insert({
    business_id: caller.businessId,
    actor_id: caller.userId,
    actor_type: 'user',
    action: 'agent_chat',
    entity: 'agent',
    entity_id: caller.userId,
    payload: { role: caller.role, turns: parsed.data.messages.length },
  })

  // ── Streaming NDJSON ──
  res.status(200)
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')

  const anthropic = new Anthropic({ apiKey: anthropicKey })
  const system = buildSystemPrompt(caller, biz)

  const messages: Anthropic.MessageParam[] = parsed.data.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: 2048,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        tools: AGENT_TOOLS,
        messages,
      })

      stream.on('text', (delta) => writeLine(res, { t: 'text', v: delta }))

      const message = await stream.finalMessage()

      if (message.stop_reason !== 'tool_use') break

      // Ejecutar todas las tools pedidas y devolver los resultados en UN mensaje
      messages.push({ role: 'assistant', content: message.content })
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of message.content) {
        if (block.type !== 'tool_use') continue
        writeLine(res, { t: 'tool', name: block.name })
        const result = await executeTool(admin, caller, biz, block.name, block.input)
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
      }
      messages.push({ role: 'user', content: toolResults })
    }

    writeLine(res, { t: 'done' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    writeLine(res, { t: 'error', message })
  }

  res.end()
}
