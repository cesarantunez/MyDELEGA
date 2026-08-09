import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Store, ArrowRight, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth.store'
import { VERTICAL_PACKS, getPack } from '../../lib/verticals/packs'

const onboardingSchema = z.object({
  businessName: z.string().min(2, 'Minimo 2 caracteres'),
  businessType: z.string().min(1, 'Elige el tipo de negocio'),
  adminName: z.string().min(2, 'Minimo 2 caracteres'),
})

type OnboardingForm = z.infer<typeof onboardingSchema>

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { refreshProfile, logout } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'creating'>('form')
  const [progress, setProgress] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { businessType: 'supermercado' },
  })

  const selectedType = watch('businessType')

  const onSubmit = async (data: OnboardingForm) => {
    setError(null)
    setStep('creating')
    try {
      setProgress('Creando tu negocio...')
      const { data: businessId, error: rpcError } = await supabase.rpc('onboard_business', {
        p_name: data.businessName,
        p_type: data.businessType,
        p_admin_name: data.adminName,
      })
      if (rpcError) throw new Error(rpcError.message)

      const pack = getPack(data.businessType)

      setProgress('Configurando areas...')
      const { error: areasError } = await supabase.from('areas').insert(
        pack.areas.map((name, i) => ({ business_id: businessId, name, sort: i }))
      )
      if (areasError) throw new Error(areasError.message)

      setProgress('Cargando plantillas de tareas...')
      const { error: tplError } = await supabase.from('task_templates').insert(
        pack.templates.map((t) => ({
          business_id: businessId,
          area: t.area,
          title: t.title,
          description: t.description,
          default_priority: t.priority,
          default_checklist: t.checklist,
        }))
      )
      if (tplError) throw new Error(tplError.message)

      setProgress('Listo! Entrando...')
      await refreshProfile()
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear el negocio'
      setError(message)
      setStep('form')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-azul px-4 py-8">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amarillo rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Store size={30} className="text-azul" />
          </div>
          <h1 className="text-2xl font-bold text-blanco">
            Crea tu <span className="text-amarillo">negocio</span>
          </h1>
          <p className="text-blanco/60 text-sm mt-1">
            MyDELEGA se configura solo segun tu tipo de negocio
          </p>
        </div>

        {step === 'creating' ? (
          <div className="bg-blanco/10 backdrop-blur-sm rounded-2xl p-8 text-center">
            <div className="w-10 h-10 border-3 border-amarillo/30 border-t-amarillo rounded-full animate-spin mx-auto mb-4" />
            <p className="text-blanco/70 text-sm">{progress}</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="bg-blanco/10 backdrop-blur-sm rounded-2xl p-6 space-y-4"
          >
            {/* Business name */}
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-blanco/80 mb-1">
                Nombre del negocio
              </label>
              <input
                id="businessName"
                type="text"
                placeholder="Su Hogar Supermercado"
                {...register('businessName')}
                className="w-full px-4 py-3 rounded-xl bg-blanco/10 border border-blanco/20 text-blanco placeholder-blanco/40 focus:outline-none focus:border-amarillo focus:ring-1 focus:ring-amarillo transition-colors"
              />
              {errors.businessName && (
                <p className="text-rosa text-xs mt-1">{errors.businessName.message}</p>
              )}
            </div>

            {/* Business type */}
            <div>
              <label className="block text-sm font-medium text-blanco/80 mb-2">
                Tipo de negocio
              </label>
              <div className="grid grid-cols-2 gap-2">
                {VERTICAL_PACKS.map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setValue('businessType', pack.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                      selectedType === pack.id
                        ? 'border-amarillo bg-amarillo/10'
                        : 'border-blanco/20 bg-blanco/5 hover:border-blanco/40'
                    }`}
                  >
                    <span className="text-lg">{pack.icon}</span>
                    <span className={`text-xs font-semibold ${selectedType === pack.id ? 'text-amarillo' : 'text-blanco/60'}`}>
                      {pack.label}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-blanco/40 mt-2">
                Pre-configura areas y plantillas de tareas de tu giro. Podras ajustarlas despues.
              </p>
            </div>

            {/* Admin name */}
            <div>
              <label htmlFor="adminName" className="block text-sm font-medium text-blanco/80 mb-1">
                Tu nombre (administrador)
              </label>
              <input
                id="adminName"
                type="text"
                placeholder="Cesar Antunez"
                {...register('adminName')}
                className="w-full px-4 py-3 rounded-xl bg-blanco/10 border border-blanco/20 text-blanco placeholder-blanco/40 focus:outline-none focus:border-amarillo focus:ring-1 focus:ring-amarillo transition-colors"
              />
              {errors.adminName && (
                <p className="text-rosa text-xs mt-1">{errors.adminName.message}</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rojo/20 border border-rojo/40 rounded-xl px-4 py-3"
              >
                <p className="text-rojo text-sm text-center">{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amarillo text-oscuro font-semibold text-base hover:bg-amarillo/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Crear mi negocio <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={async () => { await logout(); navigate('/login') }}
              className="w-full text-blanco/40 text-xs hover:text-blanco flex items-center justify-center gap-1 pt-1"
            >
              <LogOut size={12} /> Salir
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
