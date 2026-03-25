import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Share, PlusSquare } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'ios' | 'android' | 'desktop' | 'unknown'

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  if (/Windows|Mac|Linux/.test(ua)) return 'desktop'
  return 'unknown'
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone === true)
  )
}

export default function InstallBanner() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [platform] = useState<Platform>(detectPlatform)

  useEffect(() => {
    // Don't show if already installed
    if (isStandalone()) return

    // Don't show if dismissed recently (24h)
    const dismissed = localStorage.getItem('install-banner-dismissed')
    if (dismissed && Date.now() - Number(dismissed) < 24 * 60 * 60 * 1000) return

    // Listen for beforeinstallprompt (Chrome/Edge/Samsung)
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // For iOS Safari, show after 3 seconds
    if (platform === 'ios') {
      const timer = setTimeout(() => setShow(true), 3000)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handler)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [platform])

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShow(false)
      }
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem('install-banner-dismissed', String(Date.now()))
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-16 left-4 right-4 z-[60] max-w-lg mx-auto"
        >
          <div className="bg-oscuro border border-amarillo/30 rounded-2xl p-4 shadow-2xl">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-blanco/30 hover:text-blanco p-1"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amarillo rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-azul text-lg font-bold">M</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blanco">Instalar MyDELEGA</p>

                {/* iOS instructions */}
                {platform === 'ios' && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-blanco/50">Para instalar en tu iPhone:</p>
                    <div className="flex items-center gap-2 text-xs text-blanco/70">
                      <Share size={14} className="text-azul flex-shrink-0" />
                      <span>1. Toca el boton <strong>Compartir</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-blanco/70">
                      <PlusSquare size={14} className="text-azul flex-shrink-0" />
                      <span>2. Selecciona <strong>"Agregar a Inicio"</strong></span>
                    </div>
                  </div>
                )}

                {/* Android / Desktop with install prompt */}
                {(platform === 'android' || platform === 'desktop' || platform === 'unknown') && deferredPrompt && (
                  <div className="mt-2">
                    <p className="text-xs text-blanco/50 mb-2">
                      Acceso rapido sin abrir el navegador
                    </p>
                    <button
                      onClick={handleInstall}
                      className="flex items-center gap-2 bg-amarillo text-oscuro text-xs font-bold px-4 py-2 rounded-xl hover:bg-amarillo/90 transition-colors min-h-[44px]"
                    >
                      <Download size={14} />
                      Instalar ahora
                    </button>
                  </div>
                )}

                {/* Desktop without prompt (Firefox/Safari) */}
                {platform === 'desktop' && !deferredPrompt && (
                  <p className="text-xs text-blanco/50 mt-2">
                    Usa Chrome o Edge para instalar como aplicacion
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
