import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check } from 'lucide-react'
import { useAuthStore } from '../../stores/auth.store'
import {
  getMyUnreadCount,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationRow,
} from '../../lib/repositories/employee-task.repository'

const TYPE_ICONS: Record<string, string> = {
  task_assigned: '📋',
  task_completed: '✅',
  warning: '⚠️',
  info: 'ℹ️',
  success: '🎉',
}

export default function NotificationBell() {
  const user = useAuthStore((s) => s.user)
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    setUnreadCount(getMyUnreadCount(user.id))
    const interval = setInterval(() => {
      setUnreadCount(getMyUnreadCount(user.id))
    }, 15000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    if (isOpen && user) {
      setNotifications(getMyNotifications(user.id))
    }
  }, [isOpen, user])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const handleMarkRead = async (id: number) => {
    if (!user) return
    await markNotificationRead(user.id, id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: 1 } : n)))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    await markAllNotificationsRead(user.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })))
    setUnreadCount(0)
  }

  const timeAgo = (date: string): string => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'ahora'
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-blanco/40 hover:text-blanco transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-0.5 right-0.5 w-4 h-4 bg-rojo rounded-full text-[10px] text-blanco flex items-center justify-center font-bold"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            className="absolute right-0 top-full mt-1 w-80 max-h-96 bg-oscuro border border-blanco/10 rounded-2xl shadow-2xl overflow-hidden z-[100]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-blanco/10">
              <p className="text-sm font-semibold text-blanco">Notificaciones</p>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-amarillo hover:underline flex items-center gap-1"
                >
                  <Check size={10} /> Marcar leidas
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-blanco/5">
              {notifications.length === 0 ? (
                <p className="text-xs text-blanco/30 text-center py-8">Sin notificaciones</p>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => notif.read === 0 && handleMarkRead(notif.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-blanco/5 transition-colors flex gap-3 ${
                      notif.read === 0 ? 'bg-amarillo/5' : ''
                    }`}
                  >
                    <span className="text-sm flex-shrink-0 mt-0.5">
                      {TYPE_ICONS[notif.type] || 'ℹ️'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-medium truncate ${notif.read === 0 ? 'text-blanco' : 'text-blanco/60'}`}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-blanco/30 flex-shrink-0">
                          {timeAgo(notif.created_at)}
                        </span>
                      </div>
                      {notif.body && (
                        <p className="text-[11px] text-blanco/40 truncate mt-0.5">{notif.body}</p>
                      )}
                    </div>
                    {notif.read === 0 && (
                      <span className="w-2 h-2 bg-amarillo rounded-full mt-1.5 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
