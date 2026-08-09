# Fase 4 — Evaluaciones de desempeño — ✅ EN PRODUCCIÓN

> Estado al 2026-08-09. SPEC: `docs/SPEC-V2.md` §M6.
> **`v2-fase-4` mergeada a master y desplegada en https://my-delega.vercel.app.**

## Qué quedó construido y VERIFICADO

- **Registro append-only** (`evaluations` + `evaluation_scores`): las evaluaciones
  se crean selladas — sin policies de update/delete + revoke, **ni el admin puede
  editarlas o borrarlas** (verificado con cliente autenticado: 42501). Cada
  creación queda en `audit_log`.
- **10 dimensiones** (SPEC §M6): productividad, calidad, conocimiento,
  confiabilidad, integridad, iniciativa, equipo, servicio, seguridad, recursos.
  Escala 1-5 con **comentario obligatorio en extremos** (1 y 5) — aplica incluso
  a los valores pre-llenados.
- **Pre-llenado con datos reales** (el evaluador ajusta, no inventa):
  - *Productividad*: % de tareas a tiempo en los últimos 30 días → sugerencia 1-5
    con el detalle ("1/1 tareas a tiempo (100%)").
  - *Conocimiento*: capacitaciones completadas + conocimiento verificado en
    persona → sugerencia combinada.
  - La sugerencia se guarda junto a la nota final (`prefill_score`) para auditoría.
- **Equipo → pestaña Desempeño**: última nota por empleado, botón Evaluar,
  historial con **radar de 10 dimensiones**, comentarios, notas y **tendencia**
  entre periodos (barras clicables).
- **Empleado**: sección "Mis evaluaciones" en su perfil (solo las suyas — RLS
  verificada cruzada: otro empleado ve cero). Notificación `evaluation_ready`
  + push al finalizar.

## Verificación E2E (2026-08-09)

1. Evaluación real a Marta desde la cuenta admin de Cesar: prefill de
   productividad validado contra la DB (la tarea la completó Cesar probando la
   app), 10 dimensiones, promedio 4.10, guardada.
2. El validador exigió comentario en los tres 5 (incluido el pre-llenado). ✓
3. Radar + detalle + comentarios visibles en el historial. ✓
4. Inmutabilidad: update y delete bloqueados con sesión de admin (42501). ✓
5. Marta ve su evaluación y su notificación; Pedro no ve ninguna. ✓
6. Typecheck + build en verde; bundle de producción confirmado.

## Brechas conocidas

- Pesos por dimensión según vertical (`evaluation_templates`) = fase futura;
  hoy las 10 pesan igual.
- Confiabilidad (asistencia/puntualidad) sin fuente de datos automática — no hay
  control de asistencia en la SPEC (fuera de scope).
- Evidencia adjunta por dimensión (foto) pendiente; el comentario cubre el piloto.
- Heredadas: gate de push en teléfono real, dominio Resend, datos de prueba en prod.

## Siguiente fase

**Fase 5 — Agente IA** (SPEC §M7): chat con dominio del vertical, RAG sobre los
documentos ya subidos (M4), tools con contrato agéntico (crear tarea, registrar
producto, generar quiz), scope por rol. Última fase grande antes del endurecido.
