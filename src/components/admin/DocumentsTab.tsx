import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, FileText, ExternalLink, Trash2 } from 'lucide-react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import EmptyState from '../ui/EmptyState'
import {
  getDocuments,
  uploadDocument,
  getDocumentUrl,
  deleteDocument,
  formatSize,
  type DocumentRow,
} from '../../lib/repositories/document.repository'
import { hapticSuccess } from '../../lib/haptic'

interface Props {
  areas: string[]
}

export default function DocumentsTab({ areas }: Props) {
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [areaFilter, setAreaFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [area, setArea] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    getDocuments(areaFilter || undefined).then(setDocuments).catch(console.error)
  }, [areaFilter])

  useEffect(() => { load() }, [load])

  const handleUpload = async () => {
    if (!file || !title || !area) {
      setError('Archivo, titulo y area son requeridos')
      return
    }
    setError(null)
    setUploading(true)
    try {
      await uploadDocument(file, { area, title, description })
      hapticSuccess()
      setShowForm(false)
      setFile(null)
      setTitle('')
      setArea('')
      setDescription('')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir')
    } finally {
      setUploading(false)
    }
  }

  const handleOpen = async (doc: DocumentRow) => {
    const url = await getDocumentUrl(doc.storage_path)
    if (url) window.open(url, '_blank', 'noopener')
  }

  const handleDelete = async (doc: DocumentRow) => {
    await deleteDocument(doc)
    load()
  }

  const areaOptions = areas.map((a) => ({ value: a, label: a }))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select
            options={[{ value: '', label: 'Todas las areas' }, ...areaOptions]}
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Upload size={15} /> Subir
        </Button>
      </div>

      {documents.length === 0 && (
        <EmptyState
          icon="tasks"
          title="Sin documentos"
          subtitle="Sube manuales, protocolos y material por area"
        />
      )}

      <div className="space-y-2">
        {documents.map((doc, i) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Card className="flex items-center gap-3 p-3">
              <div className="w-9 h-9 rounded-xl bg-azul/15 flex items-center justify-center flex-shrink-0">
                <FileText size={17} className="text-azul" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-blanco font-medium truncate">{doc.title}</p>
                <p className="text-[11px] text-blanco/40 truncate">
                  {doc.area} · {formatSize(doc.size_bytes)}
                  {doc.uploaded_by_name ? ` · ${doc.uploaded_by_name}` : ''}
                </p>
              </div>
              <button
                onClick={() => handleOpen(doc)}
                className="text-amarillo/80 hover:text-amarillo p-2"
                title="Abrir"
              >
                <ExternalLink size={15} />
              </button>
              <button
                onClick={() => handleDelete(doc)}
                className="text-blanco/25 hover:text-rojo p-2"
                title="Eliminar"
              >
                <Trash2 size={15} />
              </button>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Upload modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-[70] flex items-end sm:items-center justify-center p-4"
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
                <h3 className="text-lg font-semibold text-blanco">Subir documento</h3>
                <button onClick={() => setShowForm(false)} className="text-blanco/40 hover:text-blanco">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-xl p-5 text-center transition-colors ${
                    file ? 'border-amarillo/50 bg-amarillo/5' : 'border-blanco/20 hover:border-blanco/40'
                  }`}
                >
                  <FileText size={22} className={`mx-auto mb-1 ${file ? 'text-amarillo' : 'text-blanco/30'}`} />
                  <p className="text-xs text-blanco/60 truncate">
                    {file ? `${file.name} (${formatSize(file.size)})` : 'Toca para elegir archivo (PDF, imagen, Office)'}
                  </p>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    setFile(f)
                    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''))
                  }}
                />

                <Input id="doc-title" label="Titulo" placeholder="Protocolo de cuarto frio" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Select id="doc-area" label="Area" options={areaOptions} placeholder="Seleccionar area" value={area} onChange={(e) => setArea(e.target.value)} />
                <Input id="doc-desc" label="Descripcion (opcional)" placeholder="De que trata" value={description} onChange={(e) => setDescription(e.target.value)} />

                {error && (
                  <div className="bg-rojo/20 border border-rojo/40 rounded-xl px-4 py-3">
                    <p className="text-rojo text-sm text-center">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" className="flex-1" onClick={handleUpload} disabled={uploading}>
                    {uploading ? 'Subiendo...' : 'Subir'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
