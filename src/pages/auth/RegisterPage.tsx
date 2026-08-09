import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { signUpOwner } from '../../lib/auth/auth-service'

const registerSchema = z.object({
  name: z.string().min(2, 'Minimo 2 caracteres'),
  email: z.string().email('Ingresa un email valido'),
  password: z.string().min(8, 'Minimo 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)
    setError(null)
    try {
      const { needsEmailConfirm } = await signUpOwner(data.email, data.password, data.name)
      if (needsEmailConfirm) {
        setEmailSent(data.email)
      } else {
        navigate('/onboarding', { replace: true })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear cuenta'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-azul px-4">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amarillo rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-azul text-3xl font-bold">M</span>
          </div>
          <h1 className="text-2xl font-bold text-blanco">
            My<span className="text-amarillo">DELEGA</span>
          </h1>
          <p className="text-blanco/60 text-sm mt-1">
            Crea la cuenta del dueño de tu negocio
          </p>
        </div>

        {emailSent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-blanco/10 backdrop-blur-sm rounded-2xl p-8 text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-amarillo/20 mx-auto flex items-center justify-center">
              <MailCheck size={32} className="text-amarillo" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-blanco">Confirma tu correo</h2>
              <p className="text-blanco/60 text-sm mt-2">
                Te enviamos un enlace a <strong className="text-amarillo">{emailSent}</strong>.
                Abrelo para activar tu cuenta y continuar creando tu negocio.
              </p>
            </div>
            <Link to="/login" className="block text-amarillo text-sm font-medium hover:underline">
              Ir al login
            </Link>
          </motion.div>
        ) : (
          <>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="bg-blanco/10 backdrop-blur-sm rounded-2xl p-6 space-y-4"
            >
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-blanco/80 mb-1">
                  Tu nombre
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Juan Perez"
                  {...register('name')}
                  className="w-full px-4 py-3 rounded-xl bg-blanco/10 border border-blanco/20 text-blanco placeholder-blanco/40 focus:outline-none focus:border-amarillo focus:ring-1 focus:ring-amarillo transition-colors"
                />
                {errors.name && (
                  <p className="text-rosa text-xs mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-blanco/80 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  {...register('email')}
                  className="w-full px-4 py-3 rounded-xl bg-blanco/10 border border-blanco/20 text-blanco placeholder-blanco/40 focus:outline-none focus:border-amarillo focus:ring-1 focus:ring-amarillo transition-colors"
                />
                {errors.email && (
                  <p className="text-rosa text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-blanco/80 mb-1">
                  Contraseña
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

              {/* Confirm Password */}
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

              <p className="text-[10px] text-blanco/40">
                Los empleados no se registran aqui: tu los invitas desde la app y
                reciben su propio acceso.
              </p>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-rojo/20 border border-rojo/40 rounded-xl px-4 py-3"
                >
                  <p className="text-rojo text-sm text-center">{error}</p>
                </motion.div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-amarillo text-oscuro font-semibold text-base hover:bg-amarillo/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>

            <p className="text-blanco/50 text-sm text-center mt-6">
              Ya tienes cuenta?{' '}
              <Link to="/login" className="text-amarillo font-medium hover:underline">
                Inicia sesion
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  )
}
