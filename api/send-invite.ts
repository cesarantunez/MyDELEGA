import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Resend } from 'resend'
import bcrypt from 'bcryptjs'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' })
  }

  const { name, email, password, role, appUrl } = req.body ?? {}

  if (!name || !email || !password || !role || !appUrl) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // Hash password (same config as frontend: 10 rounds)
    const hash = await bcrypt.hash(password, 10)

    // Encode user data for the join link
    const data = JSON.stringify({ n: name, e: email, h: hash, r: role })
    const encoded = Buffer.from(data).toString('base64url')
    const joinUrl = `${appUrl}/join?d=${encoded}`

    const resend = new Resend(apiKey)

    const { data, error: sendError } = await resend.emails.send({
      from: 'MyDELEGA <onboarding@resend.dev>',
      to: email,
      subject: 'Bienvenido a MyDELEGA',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#2D2D2D;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px;">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;width:56px;height:56px;background-color:#FFE000;border-radius:14px;line-height:56px;text-align:center;">
        <span style="color:#1B4FD8;font-size:28px;font-weight:bold;">M</span>
      </div>
      <h1 style="color:#FFFFFF;font-size:24px;margin:16px 0 0;">My<span style="color:#FFE000;">DELEGA</span></h1>
    </div>

    <!-- Card -->
    <div style="background-color:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:24px;">
      <h2 style="color:#FFFFFF;font-size:18px;margin:0 0 8px;">Hola ${name}!</h2>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.5;margin:0 0 24px;">
        Tu cuenta en <strong style="color:#FFE000;">MyDELEGA</strong> ha sido creada.
        Usa las siguientes credenciales para iniciar sesion:
      </p>

      <!-- Credentials -->
      <div style="background-color:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:16px;margin-bottom:24px;">
        <div style="margin-bottom:12px;">
          <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0 0 4px;text-transform:uppercase;">Email</p>
          <p style="color:#FFFFFF;font-size:15px;margin:0;font-weight:600;">${email}</p>
        </div>
        <div>
          <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0 0 4px;text-transform:uppercase;">Contrasena</p>
          <p style="color:#FFE000;font-size:15px;margin:0;font-weight:600;">${password}</p>
        </div>
      </div>

      <!-- CTA Button -->
      <a href="${joinUrl}"
         style="display:block;text-align:center;background-color:#FFE000;color:#2D2D2D;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 24px;border-radius:12px;">
        Activar cuenta e instalar app
      </a>

      <p style="color:rgba(255,255,255,0.3);font-size:12px;text-align:center;margin:16px 0 0;">
        Al hacer clic, tu cuenta se activara y podras instalar la aplicacion en tu dispositivo.
      </p>
    </div>

    <!-- Footer -->
    <p style="color:rgba(255,255,255,0.2);font-size:11px;text-align:center;margin-top:32px;">
      MyDELEGA — Gestion operativa de supermercado
    </p>
  </div>
</body>
</html>
      `.trim(),
    })

    if (sendError) {
      return res.status(400).json({ error: sendError.message ?? 'Resend error', detail: JSON.stringify(sendError) })
    }

    return res.status(200).json({ success: true, id: data?.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}
