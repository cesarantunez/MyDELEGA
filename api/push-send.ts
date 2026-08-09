import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { sendPushToUsers } from './_push'

// ══════════════════════════════════════════════════════════════
// POST /api/push-send — relay de push entre miembros del negocio.
// El caller debe tener sesión; los destinatarios deben pertenecer
// a SU MISMO negocio (verificado server-side con service role).
// ══════════════════════════════════════════════════════════════

const bodySchema = z.object({
  user_ids: z.array(z.string().uuid()).min(1).max(50),
  title: z.string().min(1).max(120),
  body: z.string().max(300).default(''),
  url: z.string().max(300).optional(),
  tag: z.string().max(60).optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Solo POST' } })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ ok: false, error: { code: 'CONFIG', message: 'Supabase server env faltante' } })
  }

  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { code: 'INVALID_BODY', message: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') },
    })
  }

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  if (!token) {
    return res.status(401).json({ ok: false, error: { code: 'NO_AUTH', message: 'Falta token de sesion' } })
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: callerData, error: callerError } = await admin.auth.getUser(token)
  if (callerError || !callerData.user) {
    return res.status(401).json({ ok: false, error: { code: 'BAD_TOKEN', message: 'Sesion invalida' } })
  }

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('business_id, active')
    .eq('user_id', callerData.user.id)
    .maybeSingle()

  if (!callerProfile || !callerProfile.active) {
    return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Sin perfil activo' } })
  }

  // Los destinatarios deben ser del mismo negocio (nunca cross-tenant).
  const { user_ids, title, body, url, tag } = parsed.data
  const { data: targets } = await admin
    .from('profiles')
    .select('user_id')
    .eq('business_id', callerProfile.business_id)
    .in('user_id', user_ids)

  const validIds = (targets ?? []).map((t: { user_id: string }) => t.user_id)
  if (validIds.length === 0) {
    return res.status(400).json({ ok: false, error: { code: 'NO_TARGETS', message: 'Ningun destinatario valido en tu negocio' } })
  }

  const result = await sendPushToUsers(admin, validIds, { title, body, url, tag })

  return res.status(200).json({ ok: true, sent: result.sent, failed: result.failed, targets: validIds.length })
}
