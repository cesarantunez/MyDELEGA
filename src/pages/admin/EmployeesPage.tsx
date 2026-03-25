import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, X, UserCircle, Mail, Copy, CheckCircle2 } from 'lucide-react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import {
  getAllUsers,
  createUser,
  toggleUserActive,
  type UserRow,
} from '../../lib/repositories/user.repository'
import { hapticSuccess } from '../../lib/haptic'

const createSchema = z.object({
  name: z.string().min(2, 'Minimo 2 caracteres'),
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Minimo 6 caracteres'),
  role: z.enum(['admin', 'employee']),
  area: z.string().optional(),
})

type CreateForm = z.infer<typeof createSchema>

const roleOptions = [
  { value: 'employee', label: 'Empleado' },
  { value: 'admin', label: 'Administrador' },
]

const areaOptions = [
  { value: 'Cajas', label: 'Cajas' },
  { value: 'Almacen', label: 'Almacen' },
  { value: 'Piso de Ventas', label: 'Piso de Ventas' },
  { value: 'Perecederos', label: 'Perecederos' },
  { value: 'Panaderia', label: 'Panaderia' },
  { value: 'General', label: 'General' },
]

interface InviteResult {
  name: string
  email: string
  password: string
  emailSent: boolean
}

export default function EmployeesPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null)
  const [copied, setCopied] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'employee' },
  })

  const loadUsers = () => setUsers(getAllUsers())

  useEffect(() => { loadUsers() }, [])

  const sendInviteEmail = async (name: string, email: string, password: string, role: string): Promise<boolean> => {
    try {
      const appUrl = window.location.origin
      const res = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, appUrl }),
      })
      return res.ok
    } catch {
      return false
    }
  }

  const onSubmit = async (data: CreateForm) => {
    await createUser({
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      avatar_url: avatarPreview,
    })

    // Try to send invite email
    const emailSent = await sendInviteEmail(data.name, data.email, data.password, data.role)

    hapticSuccess()
    setShowForm(false)
    setInviteResult({
      name: data.name,
      email: data.email,
      password: data.password,
      emailSent,
    })
    reset()
    setAvatarPreview(null)
    loadUsers()
  }

  const handleToggleActive = async (id: number) => {
    await toggleUserActive(id)
    loadUsers()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-blanco">Empleados</h2>
          <p className="text-blanco/50 text-sm">{users.length} registrado(s)</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm">
          <UserPlus size={16} />
          Crear
        </Button>
      </div>

      {/* Create form modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              className="bg-oscuro border border-blanco/10 rounded-2xl p-6 w-full max-w-md"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blanco">Nuevo empleado</h3>
                <button onClick={() => setShowForm(false)} className="text-blanco/40 hover:text-blanco">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-blanco/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle size={28} className="text-blanco/30" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-blanco/60 mb-1">Foto (opcional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="text-xs text-blanco/50 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-blanco/10 file:text-blanco/70 hover:file:bg-blanco/20"
                    />
                  </div>
                </div>

                <Input id="name" label="Nombre" placeholder="Juan Perez" error={errors.name?.message} {...register('name')} />
                <Input id="email" label="Email" type="email" placeholder="juan@mydelega.com" error={errors.email?.message} {...register('email')} />
                <Input id="password" label="Contraseña" type="password" placeholder="Minimo 6 caracteres" error={errors.password?.message} {...register('password')} />
                <Select id="role" label="Rol" options={roleOptions} error={errors.role?.message} {...register('role')} />
                <Select id="area" label="Area" options={areaOptions} placeholder="Seleccionar area" {...register('area')} />

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? 'Creando...' : 'Crear empleado'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite result modal */}
      <AnimatePresence>
        {inviteResult && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setInviteResult(null); setCopied(false) }}
          >
            <motion.div
              className="bg-oscuro border border-blanco/10 rounded-2xl p-6 w-full max-w-sm text-center"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4 ${
                inviteResult.emailSent ? 'bg-amarillo/20' : 'bg-azul/20'
              }`}>
                {inviteResult.emailSent ? (
                  <Mail size={28} className="text-amarillo" />
                ) : (
                  <Mail size={28} className="text-azul" />
                )}
              </div>

              <h3 className="text-lg font-bold text-blanco mb-1">
                {inviteResult.emailSent ? 'Invitacion enviada!' : 'Empleado creado'}
              </h3>
              <p className="text-blanco/50 text-sm mb-4">
                {inviteResult.emailSent
                  ? `Se envio un email a ${inviteResult.email} con las credenciales y enlace de acceso.`
                  : 'No se pudo enviar el email. Comparte las credenciales manualmente:'}
              </p>

              {/* Credentials card */}
              <div className="bg-blanco/5 border border-blanco/10 rounded-xl p-4 text-left mb-4">
                <div className="mb-3">
                  <p className="text-blanco/40 text-[10px] uppercase">Email</p>
                  <p className="text-blanco text-sm font-medium">{inviteResult.email}</p>
                </div>
                <div>
                  <p className="text-blanco/40 text-[10px] uppercase">Contrasena</p>
                  <p className="text-amarillo text-sm font-semibold">{inviteResult.password}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    const text = `MyDELEGA - Tus credenciales:\nEmail: ${inviteResult.email}\nContrasena: ${inviteResult.password}\nEnlace: ${window.location.origin}`
                    navigator.clipboard.writeText(text)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  {copied ? <CheckCircle2 size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
                <Button className="flex-1" onClick={() => { setInviteResult(null); setCopied(false) }}>
                  Listo
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User list */}
      <div className="space-y-2">
        {users.map((user, i) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-xl bg-blanco/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-blanco/50 font-bold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-blanco text-sm font-medium truncate">{user.name}</p>
                <p className="text-blanco/40 text-xs truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">
                  {user.role === 'admin' ? 'Admin' : 'Empleado'}
                </Badge>
                <button
                  onClick={() => handleToggleActive(user.id)}
                  className={`w-2.5 h-2.5 rounded-full ${user.active ? 'bg-amarillo' : 'bg-blanco/20'}`}
                  title={user.active ? 'Activo' : 'Inactivo'}
                />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
