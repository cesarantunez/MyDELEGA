import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { z } from 'zod'

// ══════════════════════════════════════════════════════════════
// POST /api/invite — invitacion segura de personal.
// 1. Verifica que quien llama sea admin/supervisor (token Bearer).
// 2. Crea el usuario con app_metadata (el cliente NUNCA puede
//    escribirla) → el trigger de DB crea su perfil.
// 3. Genera un link de un solo uso para que el invitado defina
//    SU propia contraseña en /join. Nada de contraseñas por email.
// 4. Intenta enviar el email (Resend); si no se puede, devuelve
//    el link para compartirlo por WhatsApp.
// ══════════════════════════════════════════════════════════════

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120),
  role: z.enum(['employee', 'supervisor']),
  area_id: z.string().uuid().nullish(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Solo POST' } })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ ok: false, error: { code: 'CONFIG', message: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configuradas' } })
  }

  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: { code: 'INVALID_BODY', message: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') },
    })
  }
  const { email, name, role, area_id } = parsed.data

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  if (!token) {
    return res.status(401).json({ ok: false, error: { code: 'NO_AUTH', message: 'Falta token de sesion' } })
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // 1. Identificar y autorizar al caller
  const { data: callerData, error: callerError } = await admin.auth.getUser(token)
  if (callerError || !callerData.user) {
    return res.status(401).json({ ok: false, error: { code: 'BAD_TOKEN', message: 'Sesion invalida' } })
  }

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('business_id, role, name')
    .eq('user_id', callerData.user.id)
    .maybeSingle()

  if (!callerProfile || !['admin', 'supervisor'].includes(callerProfile.role)) {
    return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Solo un admin o supervisor puede invitar' } })
  }

  const businessId = callerProfile.business_id

  // Validar area (error autocorregible: devuelve las validas)
  if (area_id) {
    const { data: area } = await admin.from('areas').select('id').eq('id', area_id).eq('business_id', businessId).maybeSingle()
    if (!area) {
      const { data: validAreas } = await admin.from('areas').select('id, name').eq('business_id', businessId).order('sort')
      return res.status(400).json({
        ok: false,
        error: { code: 'UNKNOWN_AREA', message: 'El area no existe en este negocio', valid: validAreas ?? [] },
      })
    }
  }

  try {
    // 2. Crear el usuario invitado (perfil lo crea el trigger via app_metadata)
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      app_metadata: {
        business_id: businessId,
        role,
        invite_name: name,
        area_id: area_id ?? '',
      },
    })

    if (createError) {
      const already = /already/i.test(createError.message)
      return res.status(already ? 409 : 400).json({
        ok: false,
        error: { code: already ? 'EMAIL_EXISTS' : 'CREATE_FAILED', message: already ? 'Ese correo ya tiene una cuenta' : createError.message },
      })
    }

    // Crear el perfil explicitamente (el trigger de DB es respaldo: GoTrue
    // puede escribir app_metadata despues del insert del usuario).
    if (created.user) {
      const { error: profileError } = await admin.from('profiles').upsert(
        {
          user_id: created.user.id,
          business_id: businessId,
          role,
          name,
          email,
          area_id: area_id ?? null,
        },
        { onConflict: 'user_id', ignoreDuplicates: true }
      )
      if (profileError) {
        return res.status(500).json({ ok: false, error: { code: 'PROFILE_FAILED', message: profileError.message } })
      }
    }

    // 3. Link de un solo uso para definir contraseña
    const origin = (req.headers.origin as string) || `https://${req.headers.host}`
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${origin}/join` },
    })
    if (linkError || !linkData.properties?.action_link) {
      return res.status(500).json({ ok: false, error: { code: 'LINK_FAILED', message: linkError?.message ?? 'No se pudo generar el enlace' } })
    }
    const inviteLink = linkData.properties.action_link

    // 4. Audit log
    await admin.from('audit_log').insert({
      business_id: businessId,
      actor_id: callerData.user.id,
      actor_type: 'user',
      action: 'employee_invited',
      entity: 'profile',
      entity_id: created.user?.id ?? email,
      payload: { email, role },
    })

    // 5. Email (best-effort)
    let emailSent = false
    let emailError: string | undefined
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      try {
        const resend = new Resend(resendKey)
        const { error: sendError } = await resend.emails.send({
          from: 'MyDELEGA <onboarding@resend.dev>',
          to: email,
          subject: `${callerProfile.name} te invito a MyDELEGA`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#2D2D2D;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;width:56px;height:56px;background-color:#FFE000;border-radius:14px;line-height:56px;text-align:center;">
        <span style="color:#1B4FD8;font-size:28px;font-weight:bold;">M</span>
      </div>
      <h1 style="color:#FFFFFF;font-size:24px;margin:16px 0 0;">My<span style="color:#FFE000;">DELEGA</span></h1>
    </div>
    <div style="background-color:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:24px;">
      <h2 style="color:#FFFFFF;font-size:18px;margin:0 0 8px;">Hola ${name}!</h2>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.5;margin:0 0 24px;">
        <strong style="color:#FFE000;">${callerProfile.name}</strong> te invito a su equipo en MyDELEGA.
        Activa tu cuenta y define tu propia contraseña con el siguiente boton:
      </p>
      <a href="${inviteLink}"
         style="display:block;text-align:center;background-color:#FFE000;color:#2D2D2D;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 24px;border-radius:12px;">
        Activar mi cuenta
      </a>
      <p style="color:rgba(255,255,255,0.3);font-size:12px;text-align:center;margin:16px 0 0;">
        El enlace es personal y de un solo uso. Nadie de MyDELEGA te pedira tu contraseña.
      </p>
    </div>
    <p style="color:rgba(255,255,255,0.2);font-size:11px;text-align:center;margin-top:32px;">
      MyDELEGA — Delegacion y gestion de personal
    </p>
  </div>
</body>
</html>`.trim(),
        })
        if (sendError) {
          emailError = sendError.message
        } else {
          emailSent = true
        }
      } catch (err) {
        emailError = err instanceof Error ? err.message : 'Error enviando email'
      }
    } else {
      emailError = 'RESEND_API_KEY no configurada'
    }

    return res.status(200).json({
      ok: true,
      email_sent: emailSent,
      email_error: emailError,
      invite_link: inviteLink,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return res.status(500).json({ ok: false, error: { code: 'UNEXPECTED', message } })
  }
}
