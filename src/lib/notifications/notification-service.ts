import { supabase } from '../supabase'

// ══════════════════════════════════════════════════════════════
// Notificaciones in-app (tabla notifications, con RLS).
// Las push reales server-side llegan en Fase 2 (web-push + VAPID).
// ══════════════════════════════════════════════════════════════

export async function notifyTaskAssigned(
  businessId: string,
  userId: string,
  taskTitle: string,
  taskId: string
): Promise<void> {
  await supabase.from('notifications').insert({
    business_id: businessId,
    user_id: userId,
    title: 'Nueva tarea asignada',
    body: taskTitle,
    type: 'task_assigned',
    reference_id: taskId,
  })
}

export async function notifyTaskCompleted(
  businessId: string,
  adminId: string,
  employeeName: string,
  taskTitle: string,
  taskId: string
): Promise<void> {
  await supabase.from('notifications').insert({
    business_id: businessId,
    user_id: adminId,
    title: 'Tarea completada',
    body: `${employeeName} completo: ${taskTitle}`,
    type: 'task_completed',
    reference_id: taskId,
  })
}

/**
 * Show a native browser notification if permission is granted.
 */
export function showBrowserNotification(title: string, body: string): void {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'mydelega-notification',
        } as NotificationOptions)
      })
    } else {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
      })
    }
  } catch {
    // Silently fail if notification API not available
  }
}

/**
 * Request notification permission from the user.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  const result = await Notification.requestPermission()
  return result === 'granted'
}
