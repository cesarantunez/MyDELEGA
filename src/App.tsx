import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import SplashPage from './pages/SplashPage'
import { useAuthStore } from './stores/auth.store'
import { router } from './router'
import InstallBanner from './components/pwa/InstallBanner'

type AppState = 'loading' | 'ready' | 'error'

function App() {
  const [state, setState] = useState<AppState>('loading')
  const [status, setStatus] = useState('Inicializando...')
  const [error, setError] = useState<string | null>(null)
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    let mounted = true

    async function boot() {
      try {
        setStatus('Verificando sesion...')
        await initialize()
        if (!mounted) return
        setState('ready')
      } catch (err) {
        if (!mounted) return
        const message = err instanceof Error ? err.message : 'Error desconocido'
        setError(message)
        setState('error')
      }
    }

    boot()
    return () => { mounted = false }
  }, [initialize])

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
