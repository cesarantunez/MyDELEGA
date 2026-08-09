import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, KeyRound, LogIn } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../../components/ui/button'
import InstallBanner from '../../components/pwa/InstallBanner'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth.store'

// ══════════════════════════════════════════════════════════════
// El link de invitacion (generado server-side en /api/invite)
// abre esta pagina con una sesion temporal en el hash de la URL.
// El empleado define AQUI su propia contraseña — nunca viaja
// una contraseña por email.
// ══════════════════════════════════════════════════════════════

const passwordSchema = z.object({
  password: z.string().min(8, 'Minimo 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

type PasswordForm = z.infer<typeof passwordSchema>

type JoinStatus = 'checking' | 'set_password' | 'done' | 'invalid'

export default function JoinPage() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuthStore()
  const [status, setStatus] = useState<JoinStatus>('checking')
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  useEffect(() => {
    // supabase-js procesa el token del hash automaticamente (detectSessionInUrl).
    // Esperamos un momento a que la sesion quede establecida.
    let attempts = 0
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', session.user.id)
          .maybeSingle()
        setUserName(profile?.name ?? session.user.email ?? '')
        setStatus('set_password')
        return
      }
      attempts++
      if (attempts < 10) {
        setTimeout(check, 300)
      } else {
        setStatus('invalid')
      }
    }
    check()
  }, [])

  const onSubmit = async (data: PasswordForm) => {
    setError(null)
    const { error: updateError } = await supabase.auth.updateUser({ password: data.password })
    if (updateError) {
      setError(updateError.message)
      return
    }
    await refreshProfile()
    setStatus('done')
  }

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

        {/* Checking */}
        {status === 'checking' && (
          <div className="bg-blanco/10 backdrop-blur-sm rounded-2xl p-8">
            <div className="w-10 h-10 border-3 border-amarillo/30 border-t-amarillo rounded-full animate-spin mx-auto mb-4" />
            <p className="text-blanco/70 text-sm">Verificando tu invitacion...</p>
          </div>
        )}

        {/* Set password */}
        {status === 'set_password' && (
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={handleSubmit(onSubmit)}
            className="bg-blanco/10 backdrop-blur-sm rounded-2xl p-6 space-y-4 text-left"
          >
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-amarillo/20 mx-auto flex items-center justify-center">
                <KeyRound size={26} className="text-amarillo" />
              </div>
              <h2 className="text-lg font-bold text-blanco">
                Bienvenido{userName ? `, ${userName.split(' ')[0]}` : ''}!
              </h2>
              <p className="text-blanco/60 text-xs">
                Define tu contraseña para activar tu cuenta.
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-blanco/80 mb-1">
                Nueva contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Minimo 8 caracteres"
                {...register('password')}
                className="w-full px-4 py-3 rounded-xl bg-blanco/10 border border-blanco/20 text-blanco placeholder-blanco/40 focus:outline-none focus:border-amarillo focus:ring-1 focus:ring-amarillo transition-colors"
              />
              {errors.password && (
                <p className="text-rosa text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-blanco/80 mb-1">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                {...register('confirmPassword')}
                className="w-full px-4 py-3 rounded-xl bg-blanco/10 border border-blanco/20 text-blanco placeholder-blanco/40 focus:outline-none focus:border-amarillo focus:ring-1 focus:ring-amarillo transition-colors"
              />
              {errors.confirmPassword && (
                <p className="text-rosa text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-rojo/20 border border-rojo/40 rounded-xl px-4 py-3">
                <p className="text-rojo text-sm text-center">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Activar mi cuenta'}
            </Button>
          </motion.form>
        )}

        {/* Done */}
        {status === 'done' && (
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
                Tu cuenta esta lista. Instala la app en tu telefono y entra con tu correo y tu nueva contraseña.
              </p>
            </div>
            <Button onClick={() => navigate('/employee/checklist')} className="w-full">
              <LogIn size={16} className="mr-2" />
              Entrar
            </Button>
          </motion.div>
        )}

        {/* Invalid */}
        {status === 'invalid' && (
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
                El enlace de invitacion no es valido o ya expiro. Pide a tu administrador que te envie uno nuevo.
              </p>
            </div>
            <Button onClick={() => navigate('/login')} variant="secondary" className="w-full">
              Ir al login
            </Button>
          </motion.div>
        )}

        <p className="text-blanco/20 text-xs mt-6">
          MyDELEGA v2 — Gestion operativa
        </p>
      </motion.div>

      {(status === 'done') && <InstallBanner />}
    </div>
  )
}
