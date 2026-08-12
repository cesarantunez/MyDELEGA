import { supabase } from '../supabase'
import { useAuthStore } from '../../stores/auth.store'

// ══════════════════════════════════════════════════════════════
// Archivos por área (SPEC V2 §M4). Storage privado 'documents',
// acceso por URL firmada. En Fase 5 estos documentos alimentan
// el RAG del agente.
// ══════════════════════════════════════════════════════════════

export interface DocumentRow {
  id: string
  area: string
  title: string
  description: string | null
  storage_path: string
  mime: string | null
  size_bytes: number | null
  uploaded_by: string
  created_at: string
  uploaded_by_name?: string
}

interface RawDocumentRow extends Omit<DocumentRow, 'uploaded_by_name'> {
  uploader: { name: string } | null
}

function currentUser() {
  const user = useAuthStore.getState().user
  if (!user) throw new Error('Sin sesion activa')
  return user
}

export async function getDocuments(area?: string): Promise<DocumentRow[]> {
  let query = supabase
    .from('documents')
    .select('*, uploader:profiles!documents_uploaded_by_fkey(name)')
  if (area) query = query.eq('area', area)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as unknown as RawDocumentRow[]).map(({ uploader, ...rest }) => ({
    ...rest,
    uploaded_by_name: uploader?.name,
  }))
}

export async function uploadDocument(
  file: File,
  meta: { area: string; title: string; description?: string }
): Promise<string> {
  const user = currentUser()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)
  const path = `${user.business_id}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, file, { contentType: file.type || 'application/octet-stream' })
  if (uploadError) throw new Error(uploadError.message)

  const { data, error } = await supabase
    .from('documents')
    .insert({
      business_id: user.business_id,
      area: meta.area,
      title: meta.title,
      description: meta.description || null,
      storage_path: path,
      mime: file.type || null,
      size_bytes: file.size,
      uploaded_by: user.id,
    })
    .select('id')
    .single()
  if (error) {
    // No dejar huérfano el archivo si fallo la metadata
    await supabase.storage.from('documents').remove([path])
    throw new Error(error.message)
  }
  const documentId = (data as { id: string }).id

  // Indexar para el RAG de DELI (best-effort: si falla, el documento
  // igual queda subido; se puede reintentar re-subiendo o por backfill).
  void indexDocumentForAgent(documentId)

  return documentId
}

/** Manda el documento a extraccion de texto + embeddings (RAG de DELI). */
export async function indexDocumentForAgent(documentId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/document-ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ document_id: documentId }),
    })
  } catch {
    // best-effort
  }
}

export async function getDocumentUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 3600)
  if (error) return null
  return data.signedUrl
}

export async function deleteDocument(doc: DocumentRow): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', doc.id)
  if (error) throw new Error(error.message)
  await supabase.storage.from('documents').remove([doc.storage_path])
}

export function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
