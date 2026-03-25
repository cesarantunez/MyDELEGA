import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../stores/auth.store'
import { useNavigate } from 'react-router-dom'

const loginSchema = z.object({
  email: z.string().email('Ingresa un email valido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      clearError()
      await login(data.email, data.password)
      const user = useAuthStore.getState().user
      if (user?.role === 'admin') {
        navigate('/admin/dashboard', { replace: true })
      } else {
        navigate('/employee/checklist', { replace: true })
      }
    } catch {
      // Error already set in store
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
          <p className="text-blanco/60 text-sm mt-1">Inicia sesion para continuar</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-blanco/10 backdrop-blur-sm rounded-2xl p-6 space-y-4"
        >
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-blanco/80 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@mydelega.com"
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
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
              className="w-full px-4 py-3 rounded-xl bg-blanco/10 border border-blanco/20 text-blanco placeholder-blanco/40 focus:outline-none focus:border-amarillo focus:ring-1 focus:ring-amarillo transition-colors"
            />
            {errors.password && (
              <p className="text-rosa text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

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
            {isLoading ? 'Verificando...' : 'Iniciar sesion'}
          </button>
        </form>

        <p className="text-blanco/30 text-xs text-center mt-6">
          MyDELEGA v0.1.0 — Gestion operativa
        </p>
      </motion.div>
    </div>
  )
}
