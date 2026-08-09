import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { useAuthStore } from '../../stores/auth.store'
import { enablePush, isPushEnabled, isPushSupported, isIosWithoutInstall } from '../../lib/push'
import { hapticSuccess } from '../../lib/haptic'

const DISMISS_KEY = 'push-banner-dismissed'

/**
 * Banner de activación de push. Aparece una vez por dispositivo cuando
 * el usuario esta logueado, hay soporte y aun no hay suscripción.
 * El permiso SIEMPRE se pide desde el boton (gesto de usuario, regla iOS).
 */
export default function PushBanner() {
  const user = useAuthStore((s) => s.user)
  const [visible, setVisible] = useState(false)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (!user) return
    if (localStorage.getItem(DISMISS_KEY)) return
    if (!isPushSupported()) return
    if (isIosWithoutInstall()) return // en iOS sin instalar no hay push: no ofrecer
    if (Notification.permission === 'denied') return

    isPushEnabled().then((enabled) => {
      if (!enabled) setVisible(true)
    })
  }, [user])

  const handleEnable = async () => {
    if (!user) return
    setWorking(true)
    const ok = await enablePush(user.id)
    setWorking(false)
    if (ok) {
      hapticSuccess()
      setVisible(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mx-4 mt-3 bg-amarillo/10 border border-amarillo/30 rounded-2xl p-3 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-amarillo/20 flex items-center justify-center flex-shrink-0">
            <Bell size={18} className="text-amarillo" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-blanco text-xs font-semibold">Activa las notificaciones</p>
            <p className="text-blanco/50 text-[11px] leading-tight">
              Entérate al momento cuando te asignen tareas o algo esté por vencer.
            </p>
          </div>
          <button
            onClick={handleEnable}
            disabled={working}
            className="bg-amarillo text-oscuro text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all disabled:opacity-50 flex-shrink-0"
          >
            {working ? '...' : 'Activar'}
          </button>
          <button onClick={handleDismiss} className="text-blanco/30 hover:text-blanco flex-shrink-0 p-1">
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
