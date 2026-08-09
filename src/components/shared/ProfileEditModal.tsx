import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth.store'
import { hapticSuccess } from '../../lib/haptic'

// ══════════════════════════════════════════════════════════════
// Editar mi perfil (nombre + foto). Compartido por admin y
// empleado. La foto se comprime en el navegador (256px WebP) y
// sube al bucket público `avatars/{user_id}/avatar.webp`; la RLS
// solo permite escribir en la carpeta propia.
// ══════════════════════════════════════════════════════════════

interface Props {
  open: boolean
  onClose: () => void
}

/** Reduce la imagen a 256px de lado y la convierte a WebP. */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const size = 256
  const scale = Math.max(size / bitmap.width, size / bitmap.height)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen'))), 'image/webp', 0.85)
  )
}

export default function ProfileEditModal({ open, onClose }: Props) {
  const user = useAuthStore((s) => s.user)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const [name, setName] = useState(user?.name ?? '')
  const [preview, setPreview] = useState<string | null>(null)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  const initials = (name || user.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    try {
      const blob = await compressImage(file)
      setPhotoBlob(blob)
      setPreview(URL.createObjectURL(blob))
    } catch {
      setError('No se pudo leer esa imagen. Proba con otra (JPG o PNG).')
    }
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('El nombre necesita al menos 2 caracteres')
      return
    }
    setSaving(true)
    setError(null)
    try {
      let avatarUrl = user.avatar_url

      if (photoBlob) {
        const path = `${user.id}/avatar.webp`
        const { error: upError } = await supabase.storage
          .from('avatars')
          .upload(path, photoBlob, { upsert: true, contentType: 'image/webp' })
        if (upError) throw new Error(upError.message)
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        // cache-bust: misma ruta, contenido nuevo
        avatarUrl = `${data.publicUrl}?v=${Date.now()}`
      }

      const { error: profError } = await supabase
        .from('profiles')
        .update({ name: trimmed, avatar_url: avatarUrl })
        .eq('user_id', user.id)
      if (profError) throw new Error(profError.message)

      await refreshProfile()
      hapticSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const shownAvatar = preview ?? user.avatar_url

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/60 z-[80] flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-oscuro border border-blanco/10 rounded-2xl p-6 w-full max-w-sm"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-blanco">Mi perfil</h3>
              <button onClick={onClose} className="text-blanco/40 hover:text-blanco">
                <X size={20} />
              </button>
            </div>

            {/* Foto */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-24 h-24 mx-auto mb-5 block group"
            >
              {shownAvatar ? (
                <img src={shownAvatar} alt="" className="w-24 h-24 rounded-2xl object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-rosa flex items-center justify-center">
                  <span className="text-blanco text-3xl font-bold">{initials}</span>
                </div>
              )}
              <span className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-xl bg-amarillo flex items-center justify-center shadow group-active:scale-90 transition-transform">
                <Camera size={16} className="text-oscuro" />
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            <p className="text-center text-blanco/30 text-[11px] mb-4 -mt-2">
              Toca la foto para cambiarla
            </p>

            {/* Nombre */}
            <Input
              id="profile-name"
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />

            {error && (
              <div className="bg-rojo/20 border border-rojo/40 rounded-xl px-4 py-2.5 mt-3">
                <p className="text-rojo text-sm text-center">{error}</p>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="button" className="flex-1" disabled={saving} onClick={handleSave}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
