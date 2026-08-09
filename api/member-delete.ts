import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// ══════════════════════════════════════════════════════════════
// POST /api/member-delete — quitar a un miembro del equipo.
// Solo ADMIN. Dos resultados posibles:
//   'deleted' — sin historial: usuario y perfil eliminados del todo.
//   'retired' — con historial (tareas/evaluaciones lo referencian y
//               la DB protege ese historial): perfil desactivado y
//               acceso bloqueado (ban). No vuelve a entrar.
// Nunca: a uno mismo, ni a otro admin.
// ══════════════════════════════════════════════════════════════

const bodySchema = z.object({ user_id: z.string().uuid() })

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
    return res.status(400).json({ ok: false, error: { code: 'INVALID_BODY', message: 'user_id invalido' } })
  }
  const targetId = parsed.data.user_id

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
    .select('business_id, role')
    .eq('user_id', callerData.user.id)
    .maybeSingle()

  if (!callerProfile || callerProfile.role !== 'admin') {
    return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Solo el administrador puede quitar miembros' } })
  }
  if (targetId === callerData.user.id) {
    return res.status(400).json({ ok: false, error: { code: 'SELF', message: 'No puedes eliminarte a ti mismo' } })
  }

  const { data: target } = await admin
    .from('profiles')
    .select('user_id, business_id, role, name')
    .eq('user_id', targetId)
    .maybeSingle()

  if (!target || target.business_id !== callerProfile.business_id) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Ese miembro no existe en tu negocio' } })
  }
  if (target.role === 'admin') {
    return res.status(403).json({ ok: false, error: { code: 'TARGET_ADMIN', message: 'No se puede eliminar a un administrador' } })
  }

  try {
    // Intento 1: borrado total (solo pasa si no tiene historial que la DB proteja)
    const { error: deleteError } = await admin.auth.admin.deleteUser(targetId)

    let result: 'deleted' | 'retired'
    if (!deleteError) {
      result = 'deleted'
    } else {
      // Historial protegido por FKs → retiro: sin acceso + perfil inactivo
      const { error: banError } = await admin.auth.admin.updateUserById(targetId, {
        ban_duration: '876000h', // ~100 años
      })
      if (banError) {
        return res.status(500).json({ ok: false, error: { code: 'BAN_FAILED', message: banError.message } })
      }
      const { error: profileError } = await admin
        .from('profiles')
        .update({ active: false })
        .eq('user_id', targetId)
      if (profileError) {
        return res.status(500).json({ ok: false, error: { code: 'PROFILE_FAILED', message: profileError.message } })
      }
      result = 'retired'
    }

    await admin.from('audit_log').insert({
      business_id: callerProfile.business_id,
      actor_id: callerData.user.id,
      actor_type: 'user',
      action: result === 'deleted' ? 'member_deleted' : 'member_retired',
      entity: 'profile',
      entity_id: targetId,
      payload: { name: target.name, role: target.role },
    })

    return res.status(200).json({ ok: true, result, name: target.name })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return res.status(500).json({ ok: false, error: { code: 'UNEXPECTED', message } })
  }
}
