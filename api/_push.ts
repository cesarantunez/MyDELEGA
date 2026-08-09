import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

// ══════════════════════════════════════════════════════════════
// Helper compartido de envío web-push (lo usan push-send y
// expiry-check). Limpia suscripciones muertas (404/410).
// ══════════════════════════════════════════════════════════════

export interface PushMessage {
  title: string
  body: string
  url?: string
  tag?: string
}

let vapidConfigured = false

export function configureVapid(): boolean {
  if (vapidConfigured) return true
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:antunezc628@gmail.com'
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
  return true
}

interface SubscriptionRow {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Envía un push a todos los dispositivos de los usuarios dados.
 * Devuelve cuántos envíos salieron bien.
 */
export async function sendPushToUsers(
  admin: SupabaseClient,
  userIds: string[],
  message: PushMessage
): Promise<{ sent: number; failed: number }> {
  if (!configureVapid() || userIds.length === 0) return { sent: 0, failed: 0 }

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (!subs || subs.length === 0) return { sent: 0, failed: 0 }

  const payload = JSON.stringify(message)
  let sent = 0
  let failed = 0
  const dead: string[] = []

  await Promise.all(
    (subs as SubscriptionRow[]).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 60 * 60 * 24 }
        )
        sent++
      } catch (err) {
        failed++
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) dead.push(sub.id)
      }
    })
  )

  if (dead.length > 0) {
    await admin.from('push_subscriptions').delete().in('id', dead)
  }

  return { sent, failed }
}
