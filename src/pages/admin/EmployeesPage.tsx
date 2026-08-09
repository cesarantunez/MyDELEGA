import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, X, Mail, Copy, CheckCircle2, Link2, Users2, ClipboardCheck, Trash2, MessageCircle, AlertTriangle } from 'lucide-react'
import PerformanceTab from '../../components/admin/PerformanceTab'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import { supabase } from '../../lib/supabase'
import {
  getAllUsers,
  toggleUserActive,
  type UserRow,
} from '../../lib/repositories/user.repository'
import { hapticSuccess } from '../../lib/haptic'

const inviteSchema = z.object({
  name: z.string().min(2, 'Minimo 2 caracteres'),
  email: z.string().email('Email invalido'),
  role: z.enum(['employee', 'supervisor']),
  area_id: z.string().optional(),
})

type InviteForm = z.infer<typeof inviteSchema>

const roleOptions = [
  { value: 'employee', label: 'Empleado' },
  { value: 'supervisor', label: 'Supervisor' },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  supervisor: 'Supervisor',
  employee: 'Empleado',
}

interface AreaOption {
  id: string
  name: string
}

interface InviteResult {
  name: string
  email: string
  emailSent: boolean
  inviteLink: string
  errorDetail?: string
}

export default function EmployeesPage() {
  const [tab, setTab] = useState<'members' | 'performance'>('members')
  const [users, setUsers] = useState<UserRow[]>([])
  const [areas, setAreas] = useState<AreaOption[]>([])
  const [showForm, setShowForm] = useState(false)
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'employee' },
  })

  const loadUsers = () => {
    getAllUsers().then(setUsers).catch(console.error)
  }

  useEffect(() => {
    loadUsers()
    supabase.from('areas').select('id, name').order('sort').then(({ data }) => {
      if (data) setAreas(data as AreaOption[])
    })
  }, [])

  const onSubmit = async (data: InviteForm) => {
    setInviteError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sin sesion activa')

      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          role: data.role,
          area_id: data.area_id || null,
        }),
      })

      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.ok) {
        throw new Error(body?.error?.message || `Error HTTP ${res.status}`)
      }

      hapticSuccess()
      setShowForm(false)
      setInviteResult({
        name: data.name,
        email: data.email,
        emailSent: Boolean(body.email_sent),
        inviteLink: body.invite_link,
        errorDetail: body.email_error,
      })
      reset()
      loadUsers()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Error al invitar')
    }
  }

  const handleToggleActive = async (id: string) => {
    await toggleUserActive(id)
    loadUsers()
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    setDeleteMsg(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sin sesion activa')
      const res = await fetch('/api/member-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: deleteTarget.id }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.ok) throw new Error(body?.error?.message || `Error HTTP ${res.status}`)
      hapticSuccess()
      setDeleteMsg(
        body.result === 'deleted'
          ? `${body.name} fue eliminado(a) del equipo.`
          : `${body.name} fue retirado(a): su historial se conserva y ya no puede entrar.`
      )
      setDeleteTarget(null)
      loadUsers()
    } catch (err) {
      setDeleteMsg(`No se pudo: ${err instanceof Error ? err.message : 'error desconocido'}`)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const areaOptions = areas.map((a) => ({ value: a.id, label: a.name }))
  const areaName = (id: string | null) => areas.find((a) => a.id === id)?.name

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-blanco">Equipo</h2>
          <p className="text-blanco/50 text-sm">{users.length} miembro(s)</p>
        </div>
        {tab === 'members' && (
          <Button onClick={() => setShowForm(true)} size="sm">
            <UserPlus size={16} />
            Invitar
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-blanco/5 rounded-xl p-1 gap-1">
        <button
          onClick={() => setTab('members')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            tab === 'members' ? 'bg-amarillo text-oscuro' : 'text-blanco/50 hover:text-blanco'
          }`}
        >
          <Users2 size={14} /> Miembros
        </button>
        <button
          onClick={() => setTab('performance')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            tab === 'performance' ? 'bg-amarillo text-oscuro' : 'text-blanco/50 hover:text-blanco'
          }`}
        >
          <ClipboardCheck size={14} /> Desempeño
        </button>
      </div>

      {tab === 'performance' && <PerformanceTab />}

      {tab === 'members' && (
      <>
      {/* eslint-disable-next-line -- contenido original de Miembros */}

      {/* Invite form modal */}
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
                <h3 className="text-lg font-semibold text-blanco">Invitar al equipo</h3>
                <button onClick={() => setShowForm(false)} className="text-blanco/40 hover:text-blanco">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <Input id="name" label="Nombre" placeholder="Juan Perez" error={errors.name?.message} {...register('name')} />
                <Input id="email" label="Email" type="email" placeholder="juan@ejemplo.com" error={errors.email?.message} {...register('email')} />
                <Select id="role" label="Rol" options={roleOptions} error={errors.role?.message} {...register('role')} />
                <Select id="area_id" label="Area" options={areaOptions} placeholder="Seleccionar area (opcional)" {...register('area_id')} />

                <p className="text-[10px] text-blanco/40">
                  Recibira un enlace personal para activar su cuenta y definir su
                  propia contraseña. Nunca se envian contraseñas por correo.
                </p>

                {inviteError && (
                  <div className="bg-rojo/20 border border-rojo/40 rounded-xl px-4 py-3">
                    <p className="text-rojo text-sm text-center">{inviteError}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? 'Enviando...' : 'Enviar invitacion'}
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
                  <Link2 size={28} className="text-azul" />
                )}
              </div>

              <h3 className="text-lg font-bold text-blanco mb-1">
                {inviteResult.emailSent ? 'Invitacion enviada!' : 'Invitacion creada'}
              </h3>
              <p className="text-blanco/50 text-sm mb-4">
                {inviteResult.emailSent
                  ? `${inviteResult.email} recibio un correo con su enlace de activacion.`
                  : 'El correo no salio. Comparte el enlace de activacion por WhatsApp:'}
              </p>
              {!inviteResult.emailSent && inviteResult.errorDetail && (
                <p className="text-rojo/70 text-xs mb-4 bg-rojo/10 rounded-lg px-3 py-2">
                  {inviteResult.errorDetail}
                </p>
              )}

              <div className="space-y-2">
                <Button
                  className="w-full bg-[#25D366] hover:bg-[#1faf55] text-blanco"
                  onClick={() => {
                    const text = `Hola ${inviteResult.name}! Te invite a MyDELEGA. Activa tu cuenta aqui (enlace personal, de un solo uso): ${inviteResult.inviteLink}`
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
                  }}
                >
                  <MessageCircle size={16} className="mr-1" />
                  Enviar por WhatsApp
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      const text = `Hola ${inviteResult.name}! Te invite a MyDELEGA. Activa tu cuenta aqui (enlace personal, de un solo uso): ${inviteResult.inviteLink}`
                      navigator.clipboard.writeText(text)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                  >
                    {copied ? <CheckCircle2 size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
                    {copied ? 'Copiado' : 'Copiar enlace'}
                  </Button>
                  <Button className="flex-1" onClick={() => { setInviteResult(null); setCopied(false) }}>
                    Listo
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Aviso de resultado de eliminacion */}
      {deleteMsg && (
        <div className="bg-blanco/5 border border-blanco/10 rounded-xl px-4 py-3 flex items-start justify-between gap-2">
          <p className="text-blanco/70 text-xs">{deleteMsg}</p>
          <button onClick={() => setDeleteMsg(null)} className="text-blanco/30 hover:text-blanco">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Confirmar eliminacion */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              className="bg-oscuro border border-blanco/10 rounded-2xl p-6 w-full max-w-sm text-center"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4 bg-rojo/20">
                <AlertTriangle size={28} className="text-rojo" />
              </div>
              <h3 className="text-lg font-bold text-blanco mb-1">Quitar a {deleteTarget.name}?</h3>
              <p className="text-blanco/50 text-sm mb-5">
                Perdera el acceso a la app. Si tiene tareas o evaluaciones, su
                historial se conserva; si no tiene nada, se elimina por completo.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-rojo hover:bg-rojo/80 text-blanco"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  {deleting ? 'Quitando...' : 'Si, quitar'}
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
                <p className="text-blanco/40 text-xs truncate">
                  {user.email}
                  {areaName(user.area_id) ? ` · ${areaName(user.area_id)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">
                  {ROLE_LABELS[user.role] ?? user.role}
                </Badge>
                <button
                  onClick={() => handleToggleActive(user.id)}
                  className={`w-2.5 h-2.5 rounded-full ${user.active ? 'bg-amarillo' : 'bg-blanco/20'}`}
                  title={user.active ? 'Activo' : 'Inactivo'}
                />
                {user.role !== 'admin' && (
                  <button
                    onClick={() => setDeleteTarget(user)}
                    className="text-blanco/25 hover:text-rojo transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Quitar del equipo"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
      </>
      )}
    </div>
  )
}
