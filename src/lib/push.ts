import { supabase } from './supabase'

// ══════════════════════════════════════════════════════════════
// Push notifications reales (web-push + VAPID).
// La suscripción vive en push_subscriptions (RLS: solo el dueño).
// iOS: requiere la PWA instalada (standalone) y un gesto del
// usuario para pedir permiso — por eso el banner/toggle, nunca
// un prompt automático al cargar.
// ══════════════════════════════════════════════════════════════

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** iOS solo permite push con la app instalada en pantalla de inicio. */
export function isIosWithoutInstall(): boolean {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true
  return isIos && !standalone
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

/**
 * Pide permiso (debe llamarse desde un gesto del usuario), se suscribe
 * y guarda la suscripción en la base. Devuelve true si quedó activa.
 */
export async function enablePush(userId: string): Promise<boolean> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    })
  }

  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 250),
    },
    { onConflict: 'endpoint' }
  )
  return !error
}

/** Cancela la suscripción del dispositivo y la borra de la base. */
export async function disablePush(): Promise<void> {
  const sub = await getExistingSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe().catch(() => undefined)
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
}

/** Estado actual: permiso concedido Y suscripción registrada en este dispositivo. */
export async function isPushEnabled(): Promise<boolean> {
  if (!isPushSupported()) return false
  if (Notification.permission !== 'granted') return false
  const sub = await getExistingSubscription()
  return sub !== null
}
