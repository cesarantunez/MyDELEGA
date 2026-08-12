import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { extractText, getDocumentProxy } from 'unpdf'

// ══════════════════════════════════════════════════════════════
// POST /api/document-ingest — indexa un documento para el RAG de
// DELI: descarga el archivo (service role), extrae el texto (PDF
// via unpdf, texto plano directo), lo trocea y guarda embeddings
// gte-small generados por la Edge Function `embed`.
// Caller: admin/supervisor del negocio dueño del documento.
// Idempotente: re-ingerir borra los chunks previos del documento.
// ══════════════════════════════════════════════════════════════

export const config = { maxDuration: 120 }

const bodySchema = z.object({ document_id: z.string().uuid() })

const CHUNK_SIZE = 1100
const CHUNK_OVERLAP = 150

function chunkText(text: string): string[] {
  const clean = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  if (!clean) return []
  const chunks: string[] = []
  let start = 0
  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE, clean.length)
    if (end < clean.length) {
      // cortar en el salto de linea o punto mas cercano hacia atras
      const slice = clean.slice(start, end)
      const cut = Math.max(slice.lastIndexOf('\n'), slice.lastIndexOf('. '))
      if (cut > CHUNK_SIZE * 0.4) end = start + cut + 1
    }
    chunks.push(clean.slice(start, end).trim())
    if (end >= clean.length) break
    start = end - CHUNK_OVERLAP
  }
  return chunks.filter((c) => c.length > 40).slice(0, 120)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Solo POST' } })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ ok: false, error: { code: 'CONFIG', message: 'Supabase server env faltante' } })
  }

  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_BODY', message: 'document_id invalido' } })
  }

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  if (!token) {
    return res.status(401).json({ ok: false, error: { code: 'NO_AUTH', message: 'Falta token de sesion' } })
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: callerData, error: callerError } = await admin.auth.getUser(token)
  if (callerError || !callerData.user) {
    return res.status(401).json({ ok: false, error: { code: 'BAD_TOKEN', message: 'Sesion invalida' } })
  }
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('business_id, role, active')
    .eq('user_id', callerData.user.id)
    .maybeSingle()
  if (!callerProfile || !callerProfile.active || !['admin', 'supervisor'].includes(callerProfile.role)) {
    return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Solo admin o supervisor' } })
  }

  const { data: doc } = await admin
    .from('documents')
    .select('id, business_id, title, area, mime, storage_path')
    .eq('id', parsed.data.document_id)
    .maybeSingle()
  if (!doc || doc.business_id !== callerProfile.business_id) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Documento no encontrado en tu negocio' } })
  }

  try {
    // 1. Descargar el archivo
    const { data: blob, error: dlError } = await admin.storage.from('documents').download(doc.storage_path)
    if (dlError || !blob) {
      return res.status(500).json({ ok: false, error: { code: 'DOWNLOAD', message: dlError?.message ?? 'No se pudo descargar' } })
    }
    const buffer = new Uint8Array(await blob.arrayBuffer())

    // 2. Extraer texto según el tipo
    let text = ''
    const mime = doc.mime ?? ''
    if (mime.includes('pdf') || doc.storage_path.toLowerCase().endsWith('.pdf')) {
      const pdf = await getDocumentProxy(buffer)
      const extracted = await extractText(pdf, { mergePages: true })
      text = typeof extracted.text === 'string' ? extracted.text : (extracted.text as string[]).join('\n')
    } else if (mime.startsWith('text/') || /\.(txt|md|csv)$/i.test(doc.storage_path)) {
      text = new TextDecoder('utf-8').decode(buffer)
    } else {
      return res.status(200).json({ ok: true, indexed: 0, skipped: true, reason: `Tipo no indexable (${mime || 'desconocido'})` })
    }

    const chunks = chunkText(text)
    if (chunks.length === 0) {
      return res.status(200).json({ ok: true, indexed: 0, skipped: true, reason: 'Sin texto extraible' })
    }

    // 3. Embeddings via Edge Function (gte-small, lotes de 16)
    const embeddings: number[][] = []
    for (let i = 0; i < chunks.length; i += 16) {
      const batch = chunks.slice(i, i + 16)
      const resp = await fetch(`${supabaseUrl}/functions/v1/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ texts: batch }),
      })
      const json = await resp.json() as { ok: boolean; embeddings?: number[][]; error?: string }
      if (!resp.ok || !json.ok || !json.embeddings) {
        return res.status(500).json({ ok: false, error: { code: 'EMBED', message: json.error ?? `HTTP ${resp.status}` } })
      }
      embeddings.push(...json.embeddings)
    }

    // 4. Reemplazar chunks del documento (idempotente)
    await admin.from('document_chunks').delete().eq('document_id', doc.id)
    const { error: insError } = await admin.from('document_chunks').insert(
      chunks.map((content, i) => ({
        business_id: doc.business_id,
        document_id: doc.id,
        chunk_index: i,
        content,
        embedding: JSON.stringify(embeddings[i]),
      }))
    )
    if (insError) {
      return res.status(500).json({ ok: false, error: { code: 'DB', message: insError.message } })
    }

    await admin.from('audit_log').insert({
      business_id: doc.business_id,
      actor_id: callerData.user.id,
      actor_type: 'user',
      action: 'document_indexed',
      entity: 'document',
      entity_id: doc.id,
      payload: { title: doc.title, chunks: chunks.length },
    })

    return res.status(200).json({ ok: true, indexed: chunks.length, title: doc.title })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return res.status(500).json({ ok: false, error: { code: 'UNEXPECTED', message } })
  }
}
