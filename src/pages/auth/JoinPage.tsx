import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, LogIn } from 'lucide-react'
import { Button } from '../../components/ui/button'
import InstallBanner from '../../components/pwa/InstallBanner'
import { initDatabase } from '../../lib/db/sqlite-client'
import { runRead, runWrite, persistDatabase } from '../../lib/db/sqlite-client'

type JoinStatus = 'loading' | 'success' | 'already_exists' | 'error'

interface InviteData {
  n: string // name
  e: string // email
  h: string // password_hash
  r: string // role
}

export default function JoinPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<JoinStatus>('loading')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const activate = async () => {
      const encoded = searchParams.get('d')
      if (!encoded) {
        setStatus('error')
        return
      }

      try {
        // Decode base64url data
        const json = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
        const data: InviteData = JSON.parse(json)

        if (!data.n || !data.e || !data.h || !data.r) {
          setStatus('error')
          return
        }

        setUserName(data.n)

        // Ensure database is initialized
        await initDatabase()

        // Check if user already exists
        const existing = runRead<{ id: number }>('SELECT id FROM users WHERE email = ?', [data.e])

        if (existing.length > 0) {
          setStatus('already_exists')
          return
        }

        // Create user with the hashed password from the invite
        runWrite(
          'INSERT INTO users (role, name, email, password_hash, active) VALUES (?, ?, ?, ?, 1)',
          [data.r, data.n, data.e, data.h]
        )
        await persistDatabase()

        // Clear install banner dismissal so it shows fresh
        localStorage.removeItem('install-banner-dismissed')

        setStatus('success')
      } catch {
        setStatus('error')
      }
    }

    activate()
  }, [searchParams])

  return (
    <div className="flex items-center justify-center min-h-screen bg-azul px-4">
      <motion.div
        className="w-full max-w-sm text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-amarillo rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-azul text-3xl font-bold">M</span>
          </div>
          <h1 className="text-2xl font-bold text-blanco">
            My<span className="text-amarillo">DELEGA</span>
          </h1>
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <div className="bg-blanco/10 backdrop-blur-sm rounded-2xl p-8">
            <div className="w-10 h-10 border-3 border-amarillo/30 border-t-amarillo rounded-full animate-spin mx-auto mb-4" />
            <p className="text-blanco/70 text-sm">Activando tu cuenta...</p>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-blanco/10 backdrop-blur-sm rounded-2xl p-8 space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-amarillo/20 mx-auto flex items-center justify-center">
              <CheckCircle2 size={36} className="text-amarillo" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-blanco">Cuenta activada!</h2>
              <p className="text-blanco/60 text-sm mt-2">
                Bienvenido <strong className="text-amarillo">{userName}</strong>. Tu cuenta esta lista.
              </p>
              <p className="text-blanco/40 text-xs mt-4">
                Usa las credenciales que recibiste por email para iniciar sesion.
              </p>
            </div>

            <Button onClick={() => navigate('/login')} className="w-full">
              <LogIn size={16} className="mr-2" />
              Ir al login
            </Button>
          </motion.div>
        )}

        {/* Already exists */}
        {status === 'already_exists' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-blanco/10 backdrop-blur-sm rounded-2xl p-8 space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-amarillo/20 mx-auto flex items-center justify-center">
              <CheckCircle2 size={36} className="text-amarillo" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-blanco">Ya tienes cuenta</h2>
              <p className="text-blanco/60 text-sm mt-2">
                Tu cuenta ya esta configurada en este dispositivo, <strong className="text-amarillo">{userName}</strong>.
              </p>
            </div>

            <Button onClick={() => navigate('/login')} className="w-full">
              <LogIn size={16} className="mr-2" />
              Ir al login
            </Button>
          </motion.div>
        )}

        {/* Error */}
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-blanco/10 backdrop-blur-sm rounded-2xl p-8 space-y-6"
          >
            <div className="w-16 h-16 rounded-full bg-rojo/20 mx-auto flex items-center justify-center">
              <AlertTriangle size={36} className="text-rojo" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-blanco">Enlace invalido</h2>
              <p className="text-blanco/60 text-sm mt-2">
                El enlace de invitacion no es valido o ha expirado. Contacta a tu administrador.
              </p>
            </div>

            <Button onClick={() => navigate('/login')} variant="secondary" className="w-full">
              Ir al login
            </Button>
          </motion.div>
        )}

        <p className="text-blanco/20 text-xs mt-6">
          MyDELEGA v0.1.0 — Gestion operativa
        </p>
      </motion.div>

      {/* Install banner - forced on this page */}
      {(status === 'success' || status === 'already_exists') && <InstallBanner />}
    </div>
  )
}
