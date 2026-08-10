import { supabase } from '../supabase'

// ══════════════════════════════════════════════════════════════
// Cliente del agente DELI: manda el historial a /api/agent y
// consume la respuesta en streaming NDJSON.
// ══════════════════════════════════════════════════════════════

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface StreamCallbacks {
  onText: (delta: string) => void
  onTool: (name: string) => void
  onError: (message: string) => void
}

export const TOOL_LABELS: Record<string, string> = {
  consultar_tareas: 'Consultando tareas…',
  consultar_vencimientos: 'Revisando vencimientos…',
  buscar_material: 'Buscando en el material del negocio…',
  consultar_equipo: 'Consultando el equipo…',
  crear_tarea: 'Creando la tarea…',
  registrar_producto: 'Registrando el producto…',
  datos_para_evaluar: 'Analizando el desempeño real…',
  crear_evaluacion: 'Guardando la evaluación…',
  consultar_evaluaciones: 'Consultando evaluaciones…',
  estadisticas_equipo: 'Calculando estadísticas…',
}

/** Envía la conversación y consume el stream. Devuelve el texto completo del turno. */
export async function streamAgent(messages: ChatMessage[], cb: StreamCallbacks): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sin sesion activa')

  const res = await fetch('/api/agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    // Mandamos solo los últimos 20 turnos para no crecer sin límite
    body: JSON.stringify({ messages: messages.slice(-20) }),
  })

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error?.message ?? `Error HTTP ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  const handleLine = (line: string) => {
    if (!line.trim()) return
    try {
      const evt = JSON.parse(line) as { t: string; v?: string; name?: string; message?: string }
      if (evt.t === 'text' && evt.v) {
        fullText += evt.v
        cb.onText(evt.v)
      } else if (evt.t === 'tool' && evt.name) {
        cb.onTool(evt.name)
      } else if (evt.t === 'error') {
        cb.onError(evt.message ?? 'Error inesperado')
      }
    } catch {
      // línea incompleta o basura: se ignora
    }
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    lines.forEach(handleLine)
  }
  if (buffer) handleLine(buffer)

  return fullText
}
