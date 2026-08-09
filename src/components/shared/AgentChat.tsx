import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, X, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../stores/auth.store'
import { streamAgent, TOOL_LABELS, type ChatMessage } from '../../lib/agent/agent-client'

// ══════════════════════════════════════════════════════════════
// DELI — el asistente del panal (SPEC V2 §M7). Botón hexagonal
// flotante disponible en TODAS las pantallas (admin y empleado)
// que abre un chat con streaming en vivo.
// ══════════════════════════════════════════════════════════════

const HEX_CLIP = 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)'

const ADMIN_SUGGESTIONS = [
  '¿Qué vence esta semana?',
  '¿Cómo va el equipo con sus tareas?',
  'Asígnale una tarea a alguien',
]
const EMPLOYEE_SUGGESTIONS = [
  '¿Qué tareas tengo pendientes?',
  '¿Cómo se hace un procedimiento de mi área?',
  '¿Qué productos están por vencer?',
]

interface Bubble extends ChatMessage {
  /** etiqueta de herramienta en curso (solo mientras stremea) */
  tool?: string | null
}

/** Renderiza **negritas** del asistente sin traer un parser de markdown. */
function richText(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="text-blanco font-semibold">{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  )
}

export default function AgentChat() {
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const storageKey = user ? `deli-chat-${user.id}` : null

  // Restaurar conversación de la sesión
  useEffect(() => {
    if (!storageKey) return
    try {
      const saved = sessionStorage.getItem(storageKey)
      if (saved) setBubbles(JSON.parse(saved))
    } catch { /* sin historial */ }
  }, [storageKey])

  // Persistir + autoscroll
  useEffect(() => {
    if (storageKey && bubbles.length > 0) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(bubbles.map(({ role, content }) => ({ role, content }))))
      } catch { /* storage lleno: no pasa nada */ }
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [bubbles, storageKey])

  if (!user) return null
  const suggestions = user.role === 'employee' ? EMPLOYEE_SUGGESTIONS : ADMIN_SUGGESTIONS

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    setInput('')
    setBusy(true)

    const history: ChatMessage[] = [
      ...bubbles.filter((b) => b.content.trim()).map(({ role, content }) => ({ role, content })),
      { role: 'user' as const, content: trimmed },
    ]
    setBubbles([...history, { role: 'assistant', content: '', tool: null }])

    const patchLast = (fn: (b: Bubble) => Bubble) =>
      setBubbles((prev) => prev.map((b, i) => (i === prev.length - 1 ? fn(b) : b)))

    try {
      await streamAgent(history, {
        onText: (delta) => patchLast((b) => ({ ...b, content: b.content + delta, tool: null })),
        onTool: (name) => patchLast((b) => ({ ...b, tool: TOOL_LABELS[name] ?? 'Trabajando…' })),
        onError: (message) => patchLast((b) => ({ ...b, content: b.content || `⚠️ ${message}`, tool: null })),
      })
      patchLast((b) => ({ ...b, tool: null, content: b.content || '⚠️ No obtuve respuesta. Intenta de nuevo.' }))
    } catch (err) {
      patchLast((b) => ({
        ...b,
        tool: null,
        content: `⚠️ ${err instanceof Error ? err.message : 'Error de conexión'}`,
      }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {/* FAB hexagonal — la celda del panal donde vive DELI */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-20 right-4 z-40 w-14 h-16 bg-amarillo flex items-center justify-center shadow-lg shadow-amarillo/30"
            style={{ clipPath: HEX_CLIP }}
            aria-label="Abrir asistente DELI"
          >
            <Sparkles size={22} className="text-oscuro" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel de chat */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="fixed inset-0 z-[70] bg-oscuro flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-blanco/10">
              <div
                className="w-9 h-10 bg-amarillo flex items-center justify-center flex-shrink-0"
                style={{ clipPath: HEX_CLIP }}
              >
                <Sparkles size={16} className="text-oscuro" />
              </div>
              <div className="flex-1">
                <p className="text-blanco font-bold text-sm leading-tight">DELI</p>
                <p className="text-blanco/40 text-[11px]">Asistente de tu negocio</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-blanco/40 hover:text-blanco min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mensajes */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {bubbles.length === 0 && (
                <div className="pt-10 text-center space-y-4">
                  <div
                    className="w-16 h-[4.5rem] bg-amarillo/15 border border-amarillo/30 mx-auto flex items-center justify-center"
                    style={{ clipPath: HEX_CLIP }}
                  >
                    <Sparkles size={24} className="text-amarillo" />
                  </div>
                  <div>
                    <p className="text-blanco font-semibold">Hola {user.name.split(' ')[0]} 👋</p>
                    <p className="text-blanco/50 text-sm mt-1 max-w-xs mx-auto">
                      Conozco tu negocio, sus tareas, vencimientos y material. Preguntame lo que necesites.
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2 pt-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="px-4 py-2 rounded-full bg-blanco/5 border border-blanco/10 text-blanco/70 text-xs hover:bg-blanco/10 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {bubbles.map((b, i) => (
                <div key={i} className={b.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={
                      b.role === 'user'
                        ? 'max-w-[85%] bg-azul text-blanco text-sm rounded-2xl rounded-br-md px-4 py-2.5 whitespace-pre-wrap'
                        : 'max-w-[92%] text-blanco/90 text-sm whitespace-pre-wrap leading-relaxed'
                    }
                  >
                    {b.role === 'assistant' ? richText(b.content) : b.content}
                    {b.tool && (
                      <span className="flex items-center gap-2 text-amarillo/80 text-xs mt-1">
                        <Loader2 size={12} className="animate-spin" /> {b.tool}
                      </span>
                    )}
                    {b.role === 'assistant' && !b.content && !b.tool && busy && i === bubbles.length - 1 && (
                      <span className="flex items-center gap-2 text-blanco/40 text-xs">
                        <Loader2 size={12} className="animate-spin" /> Pensando…
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); void send(input) }}
              className="flex items-center gap-2 px-4 py-3 border-t border-blanco/10 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribile a DELI…"
                className="flex-1 bg-blanco/5 border border-blanco/10 rounded-xl px-4 py-2.5 text-sm text-blanco placeholder:text-blanco/30 focus:outline-none focus:border-amarillo/50"
                maxLength={2000}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="w-11 h-11 rounded-xl bg-amarillo text-oscuro flex items-center justify-center disabled:opacity-40 transition-opacity"
                aria-label="Enviar"
              >
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
