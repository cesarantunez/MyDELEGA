import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import SplashPage from './pages/SplashPage'
import { initDatabase } from './lib/db/sqlite-client'
import { useAuthStore } from './stores/auth.store'
import { router } from './router'
import { checkDueSoonNotifications } from './lib/notifications/notification-service'
import InstallBanner from './components/pwa/InstallBanner'

type AppState = 'loading' | 'ready' | 'error'

function App() {
  const [state, setState] = useState<AppState>('loading')
  const [status, setStatus] = useState('Inicializando...')
  const [error, setError] = useState<string | null>(null)
  const loadSession = useAuthStore((s) => s.loadSession)

  useEffect(() => {
    let mounted = true

    async function boot() {
      try {
        setStatus('Cargando motor SQLite...')
        await initDatabase()

        if (!mounted) return
        setStatus('Verificando sesion...')

        // Load existing session from SQLite
        loadSession()

        if (!mounted) return
        setState('ready')

        // Check for due-soon notifications on boot
        checkDueSoonNotifications()
      } catch (err) {
        if (!mounted) return
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
        setState('error')
      }
    }

    boot()
    return () => { mounted = false }
  }, [loadSession])

  // Periodic check for due-soon tasks (every 60s)
  useEffect(() => {
    if (state !== 'ready') return
    const interval = setInterval(() => {
      checkDueSoonNotifications()
    }, 60000)
    return () => clearInterval(interval)
  }, [state])

  if (state === 'loading' || state === 'error') {
    return <SplashPage status={status} error={error} />
  }

  return (
    <>
      <RouterProvider router={router} />
      <InstallBanner />
    </>
  )
}

export default App
