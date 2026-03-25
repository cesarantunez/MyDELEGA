import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, BellOff, ChevronRight, TrendingUp } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { useAuthStore } from '../../stores/auth.store'
import {
  getMyWeeklyHistory,
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type WeeklyHistory,
  type NotificationRow,
} from '../../lib/repositories/employee-task.repository'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const [history, setHistory] = useState<WeeklyHistory[]>([])
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [notifEnabled, setNotifEnabled] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    if (!user) return
    setHistory(getMyWeeklyHistory(user.id, 4))
    setNotifications(getMyNotifications(user.id))
    // Check if notifications are allowed in this browser
    if ('Notification' in window) {
      setNotifEnabled(Notification.permission === 'granted')
    }
  }, [user])

  const handleToggleNotifications = async () => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') {
      setNotifEnabled(false)
      return
    }
    const result = await Notification.requestPermission()
    setNotifEnabled(result === 'granted')
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    await markAllNotificationsRead(user.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })))
  }

  const handleMarkRead = async (id: number) => {
    if (!user) return
    await markNotificationRead(user.id, id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: 1 } : n)))
  }

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'E'

  const maxCompleted = Math.max(...history.map((h) => h.total), 1)

  const unreadCount = notifications.filter((n) => n.read === 0).length

  return (
    <div className="space-y-4">
      {/* Profile card */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6 text-center">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-20 h-20 rounded-2xl object-cover mx-auto mb-3" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-rosa flex items-center justify-center mx-auto mb-3">
              <span className="text-blanco text-2xl font-bold">{initials}</span>
            </div>
          )}
          <h2 className="text-lg font-bold text-blanco">{user?.name}</h2>
          <p className="text-blanco/50 text-sm">{user?.email}</p>
          <div className="mt-2 inline-block px-3 py-1 rounded-full bg-rosa/20 text-rosa text-xs font-medium">
            Empleado
          </div>
        </Card>
      </motion.div>

      {/* Weekly history chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-amarillo" />
            <p className="text-sm font-semibold text-blanco">Historial (4 semanas)</p>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-blanco/30 text-center py-4">Sin historial aun</p>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {history.map((week, i) => {
                const heightPct = week.total > 0 ? (week.completed / maxCompleted) * 100 : 0
                const completionRate = week.total > 0 ? Math.round((week.completed / week.total) * 100) : 0
                const weekLabel = `S${i + 1}`

                return (
                  <div key={week.week_start} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-blanco/40">
                      {week.completed}/{week.total}
                    </span>
                    <div className="w-full bg-blanco/10 rounded-t-lg relative" style={{ height: '80px' }}>
                      <motion.div
                        className={`absolute bottom-0 left-0 right-0 rounded-t-lg ${
                          completionRate >= 80 ? 'bg-rosa' : completionRate >= 50 ? 'bg-amarillo' : 'bg-azul'
                        }`}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(heightPct, 4)}%` }}
                        transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                      />
                    </div>
                    <span className="text-[10px] text-blanco/50">{weekLabel}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Notifications section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="overflow-hidden">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-full flex items-center justify-between p-4 hover:bg-blanco/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-amarillo" />
              <span className="text-sm font-semibold text-blanco">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="bg-rojo text-blanco text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <ChevronRight
              size={16}
              className={`text-blanco/40 transition-transform ${showNotifications ? 'rotate-90' : ''}`}
            />
          </button>

          {showNotifications && (
            <div className="border-t border-blanco/10">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="w-full text-xs text-amarillo py-2 hover:bg-blanco/5"
                >
                  Marcar todas como leidas
                </button>
              )}

              {notifications.length === 0 ? (
                <p className="text-xs text-blanco/30 text-center py-6">Sin notificaciones</p>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-blanco/5">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => notif.read === 0 && handleMarkRead(notif.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-blanco/5 transition-colors ${
                        notif.read === 0 ? 'bg-amarillo/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {notif.read === 0 && (
                          <span className="w-2 h-2 bg-amarillo rounded-full mt-1.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-blanco font-medium truncate">{notif.title}</p>
                          {notif.body && <p className="text-xs text-blanco/40 mt-0.5 truncate">{notif.body}</p>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Notification settings */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {notifEnabled ? (
                <Bell size={16} className="text-rosa" />
              ) : (
                <BellOff size={16} className="text-blanco/40" />
              )}
              <div>
                <p className="text-sm text-blanco font-medium">Notificaciones push</p>
                <p className="text-xs text-blanco/40">
                  {notifEnabled ? 'Activadas' : 'Desactivadas'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleNotifications}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                notifEnabled ? 'bg-amarillo' : 'bg-blanco/20'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-blanco rounded-full shadow transition-transform ${
                  notifEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
