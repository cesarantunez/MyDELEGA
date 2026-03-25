import { runRead, runWrite, persistDatabase } from '../db/sqlite-client'

// ══════════════════════════════════════════════════════════════
// Notification service: auto-inserta notificaciones al asignar
// tarea, completar tarea, o cuando vence en < 24h.
// ══════════════════════════════════════════════════════════════

export function notifyTaskAssigned(
  userId: number,
  taskTitle: string,
  taskId: number
): void {
  runWrite(
    `INSERT INTO notifications (user_id, title, body, type, reference_id)
     VALUES (?, ?, ?, 'task_assigned', ?)`,
    [userId, 'Nueva tarea asignada', taskTitle, taskId]
  )
}

export function notifyTaskCompleted(
  adminId: number,
  employeeName: string,
  taskTitle: string,
  taskId: number
): void {
  runWrite(
    `INSERT INTO notifications (user_id, title, body, type, reference_id)
     VALUES (?, ?, ?, 'task_completed', ?)`,
    [adminId, 'Tarea completada', `${employeeName} completo: ${taskTitle}`, taskId]
  )
}

/**
 * Checks for tasks due in < 24h that haven't been notified yet.
 * Uses a convention: checks if a notification with type='warning' and
 * reference_id=task.id already exists to avoid duplicates.
 */
export async function checkDueSoonNotifications(): Promise<number> {
  const dueSoonTasks = runRead<{ id: number; assigned_to: number; title: string }>(
    `SELECT t.id, t.assigned_to, t.title FROM tasks t
     WHERE t.status IN ('pending', 'in_progress')
       AND t.due_date IS NOT NULL
       AND t.due_date <= datetime('now', '+24 hours')
       AND t.due_date > datetime('now')
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.reference_id = t.id AND n.type = 'warning' AND n.user_id = t.assigned_to
       )`
  )

  if (dueSoonTasks.length === 0) return 0

  for (const task of dueSoonTasks) {
    runWrite(
      `INSERT INTO notifications (user_id, title, body, type, reference_id)
       VALUES (?, ?, ?, 'warning', ?)`,
      [task.assigned_to, 'Tarea por vencer', `"${task.title}" vence en menos de 24 horas`, task.id]
    )
  }

  await persistDatabase()
  showBrowserNotification(
    'Tareas por vencer',
    `Tienes ${dueSoonTasks.length} tarea(s) que vence(n) pronto`
  )

  return dueSoonTasks.length
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
