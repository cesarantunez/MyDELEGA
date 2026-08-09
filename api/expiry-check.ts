import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sendPushToUsers } from './_push.js'

// ══════════════════════════════════════════════════════════════
// GET /api/expiry-check — job diario (Vercel Cron, ver vercel.json).
// Recorre TODOS los negocios: productos activos que cruzan un
// umbral (30/7/3/1/0 dias) → notificación in-app + push al área
// responsable, resumen a admins/supervisores, y marca 'expired'
// lo vencido. Idempotente vía last_alert_threshold.
// ══════════════════════════════════════════════════════════════

const THRESHOLDS = [30, 7, 3, 1, 0]

interface ProductRow {
  id: string
  business_id: string
  area: string
  name: string
  lot: string | null
  quantity: number
  unit: string
  expiry_date: string
  last_alert_threshold: number | null
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

function thresholdFor(daysLeft: number): number | null {
  // El umbral más chico que ya se cruzó (30→7→3→1→0)
  for (const t of [...THRESHOLDS].sort((a, b) => a - b)) {
    if (daysLeft <= t) return t
  }
  return null
}

function labelFor(daysLeft: number, p: ProductRow): { title: string; body: string } {
  const qty = `${p.quantity} ${p.unit}`
  const lot = p.lot ? ` (lote ${p.lot})` : ''
  if (daysLeft < 0) return { title: 'Producto VENCIDO', body: `${p.name}${lot} — ${qty} en ${p.area}. Vencio hace ${Math.abs(daysLeft)} dia(s). Retirar.` }
  if (daysLeft === 0) return { title: 'Producto vence HOY', body: `${p.name}${lot} — ${qty} en ${p.area}. Aplicar protocolo hoy.` }
  if (daysLeft === 1) return { title: 'Producto vence MAÑANA', body: `${p.name}${lot} — ${qty} en ${p.area}.` }
  return { title: `Producto vence en ${daysLeft} dias`, body: `${p.name}${lot} — ${qty} en ${p.area}.` }
}

async function usersForArea(admin: SupabaseClient, businessId: string, areaName: string): Promise<string[]> {
  // Empleados/supervisores asignados al área (profiles.area_id → areas.name)
  const { data: area } = await admin
    .from('areas')
    .select('id')
    .eq('business_id', businessId)
    .eq('name', areaName)
    .maybeSingle()
  if (!area) return []
  const { data } = await admin
    .from('profiles')
    .select('user_id')
    .eq('business_id', businessId)
    .eq('area_id', area.id)
    .eq('active', true)
  return (data ?? []).map((p: { user_id: string }) => p.user_id)
}

async function managersOf(admin: SupabaseClient, businessId: string): Promise<string[]> {
  const { data } = await admin
    .from('profiles')
    .select('user_id')
    .eq('business_id', businessId)
    .in('role', ['admin', 'supervisor'])
    .eq('active', true)
  return (data ?? []).map((p: { user_id: string }) => p.user_id)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron manda Authorization: Bearer ${CRON_SECRET}
  const cronSecret = process.env.CRON_SECRET
  const auth = req.headers.authorization ?? ''
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Cron secret invalido' } })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ ok: false, error: { code: 'CONFIG', message: 'Supabase server env faltante' } })
  }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // Productos activos que ya están dentro del umbral máximo
  const horizon = new Date()
  horizon.setDate(horizon.getDate() + Math.max(...THRESHOLDS))
  const { data: products, error } = await admin
    .from('products')
    .select('id, business_id, area, name, lot, quantity, unit, expiry_date, last_alert_threshold')
    .eq('status', 'active')
    .lte('expiry_date', horizon.toISOString().split('T')[0])
  if (error) {
    return res.status(500).json({ ok: false, error: { code: 'QUERY_FAILED', message: error.message } })
  }

  let alertsCreated = 0
  let pushesSent = 0
  let markedExpired = 0
  const summaryByBusiness = new Map<string, string[]>()

  for (const p of (products ?? []) as ProductRow[]) {
    const daysLeft = daysUntil(p.expiry_date)
    const threshold = thresholdFor(daysLeft)
    if (threshold === null) continue

    // Idempotencia: si ya alertamos este umbral (o uno más urgente), saltar
    if (p.last_alert_threshold !== null && p.last_alert_threshold <= threshold) {
      if (daysLeft < 0) {
        await admin.from('products').update({ status: 'expired' }).eq('id', p.id)
        markedExpired++
      }
      continue
    }

    const { title, body } = labelFor(daysLeft, p)
    const areaUsers = await usersForArea(admin, p.business_id, p.area)
    const managers = await managersOf(admin, p.business_id)
    const targets = Array.from(new Set([...areaUsers, ...managers]))

    // Notificaciones in-app
    if (targets.length > 0) {
      await admin.from('notifications').insert(
        targets.map((userId) => ({
          business_id: p.business_id,
          user_id: userId,
          title,
          body,
          type: 'warning',
          reference_id: p.id,
        }))
      )
      alertsCreated += targets.length
    }

    // Push real
    const pushResult = await sendPushToUsers(admin, targets, {
      title,
      body,
      url: '/admin/products',
      tag: `product-${p.id}`,
    })
    pushesSent += pushResult.sent

    // Registrar umbral alcanzado + vencidos
    const update: Record<string, unknown> = { last_alert_threshold: threshold }
    if (daysLeft < 0) {
      update.status = 'expired'
      markedExpired++
    }
    await admin.from('products').update(update).eq('id', p.id)

    await admin.from('audit_log').insert({
      business_id: p.business_id,
      actor_id: null,
      actor_type: 'system',
      action: 'expiry_alert',
      entity: 'product',
      entity_id: p.id,
      payload: { threshold, days_left: daysLeft, targets: targets.length },
    })

    const list = summaryByBusiness.get(p.business_id) ?? []
    list.push(`${p.name} (${daysLeft < 0 ? 'vencido' : daysLeft + 'd'})`)
    summaryByBusiness.set(p.business_id, list)
  }

  return res.status(200).json({
    ok: true,
    checked: products?.length ?? 0,
    alerts_created: alertsCreated,
    pushes_sent: pushesSent,
    marked_expired: markedExpired,
    businesses_affected: summaryByBusiness.size,
  })
}
