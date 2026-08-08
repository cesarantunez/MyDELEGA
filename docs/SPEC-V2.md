# MyDELEGA V2 — SPEC maestra

> **Estado:** BORRADOR — pendiente de aprobación por Cesar antes de escribir código (gate de Etapa 1 del Build Pipeline).
> **Fecha:** 2026-08-08
> **Basada en:** auditoría completa del código V1 (2026-08-08) + brief de Cesar (voz, 2026-08-08).

## 1. El problema en una frase

Los dueños-operadores de negocios con personal (supermercados, farmacias, ferreterías, clínicas, gasolineras…) delegan por WhatsApp y memoria: las indicaciones se pierden, nadie mide el desempeño del personal, la capacitación es informal y los vencimientos de producto se descubren cuando ya costaron dinero.

## 2. Visión del producto

MyDELEGA V2 deja de ser "la app del supermercado" y se convierte en **plataforma de delegación y gestión de personal para cualquier tipo de negocio**:

1. El admin (dueño) crea su negocio y elige el **tipo** (supermercado, farmacia, ferretería, gasolinera, clínica dental, hospital, restaurante…).
2. La plataforma se **pre-configura sola** para ese vertical: áreas, plantillas de tareas, checklists de conocimiento por puesto, dimensiones de evaluación y el conocimiento de dominio del agente IA.
3. El admin delega tareas; cada empleado las recibe **en su propio teléfono** con notificación push real.
4. El admin **capacita y evalúa** a su personal con checklists por área e historial de desempeño.
5. Un **agente IA empapado del dominio del negocio** asiste a admin y empleados por chat.
6. El negocio controla **documentos por área** y **vencimientos de producto** con recordatorios automáticos.

La V1 (UI, flujos, diseño visual) se conserva casi íntegra; lo que se reemplaza es la capa de datos.

## 3. Decisiones de arquitectura (para ADRs)

| # | Decisión | Elección | Por qué |
|---|---|---|---|
| D1 | Backend | **Supabase** (Auth + Postgres + RLS + Realtime + Storage + Edge Functions) | Opción A aprobada por Cesar. Stack default KREALABS, reversible. Elimina de raíz la falla de sincronización de V1. |
| D2 | SQLite local (sql.js/OPFS) | **Se elimina.** Supabase es la única fuente de verdad. | Mantener dos motores duplica todo el trabajo. El modo offline de lectura puede volver después como caché (fase futura, si un cliente lo pide). |
| D3 | Framework | **Se mantiene Vite + React SPA + carpeta `api/` en Vercel.** No se migra a Next.js. | La app ya funciona como PWA instalable; migrar a Next.js es costo alto sin beneficio para este producto. AI SDK, push y webhooks viven bien en `api/`. |
| D4 | Multi-negocio | **`business_id` en todas las tablas desde el día uno** (multi-tenant). | Cesar quiere producto para cualquier vertical. Añadirlo hoy es barato; añadirlo después es una migración dolorosa. |
| D5 | Agente IA | Claude vía **Vercel AI SDK v5** (streaming + tool calling), RAG con **pgvector** sobre los documentos del negocio. | Skill `ai-templates` ya tiene los 4 patrones verificados (chat, tools, structured, RAG). |
| D6 | Rol del agente | **La UI manda, el chat complementa.** Todo lo que el agente hace se puede hacer con botones. | Doctrina `agentic-api-contract`: nuestro ICP necesita botones. El agente es una capa de ayuda, no la interfaz principal. |
| D7 | Auditoría | Tabla **`audit_log` append-only** para acciones sensibles (evaluaciones, cambios de rol, acciones del agente). | Doctrina `append-only-ledger`: evaluaciones de personal son registros que alguien puede disputar después. |
| D8 | Escrituras del agente | Tools del agente pasan por la **misma capa de servicio** que la UI, con actor registrado (`agent` vs `user`) y validación zod. | Doctrina `agentic-api-contract` (5 reglas) + `optimistic-concurrency-agent-writes` si agente y humano tocan la misma tarea. |

**Seguridad V2 (corrige los hallazgos de la auditoría V1):**
- Registro público de admin: **se elimina**. El primer admin nace al crear el negocio (onboarding); empleados entran SOLO por invitación.
- Invitaciones: **Supabase Auth invites** (token firmado, expira, un solo uso). El empleado elige su propia contraseña. Nunca más contraseñas en texto plano por email.
- Roles: se asignan server-side; el rol viaja en la DB, jamás en un link.
- RLS en toda tabla, scoped por `business_id` + rol (patrón `supabase-rls-performance` del wiki).
- El endpoint V1 `api/send-invite.ts` (roto, redeclara `data`) queda obsoleto y se elimina.
- Email transaccional: Resend con **dominio verificado** (plugin oficial resend).

## 4. Usuarios y roles

| Rol | Qué hace |
|---|---|
| **Admin** (dueño/gerente) | Configura el negocio, invita personal, delega tareas, crea checklists, capacita, evalúa, ve reportes, chatea con el agente sobre TODO el negocio. |
| **Supervisor** *(nuevo, opcional)* | Como admin pero limitado a sus áreas asignadas. Para negocios con jefes de área. |
| **Empleado** | Recibe tareas en su teléfono, completa checklists con evidencia, consulta sus capacitaciones y evaluaciones, chatea con el agente sobre SU área y SUS tareas. |

## 5. Módulos

### M1 — Núcleo de delegación (migración de V1)
Lo que ya existe, movido a Supabase: tareas con prioridad/estado/vencimiento, checklists por tarea, plantillas por área, evidencia fotográfica (→ Supabase Storage, no base64), notificaciones in-app, reportes semanales PDF. **Nuevo:** Realtime (la tarea aparece al instante en el teléfono del empleado) y push notifications reales (web-push + VAPID, skill `add-mobile`).

### M2 — Verticales y áreas configurables
- Catálogo de **tipos de negocio** (seed packs versionados en código): supermercado, farmacia, ferretería, gasolinera, clínica dental, restaurante, hotel, taller, oficina/genérico.
- Cada pack define: áreas sugeridas, plantillas de tareas, checklists de conocimiento por puesto, plantilla de evaluación con pesos, y el prompt de dominio del agente.
- Pack supermercado (el primero, para Su Hogar): Cajas, Bodega/Almacén, Piso de Ventas, Perecederos, Carnicería (refris, cuartos fríos, temperaturas), Panadería, Café, Contabilidad/Archivo, Recibo de mercancía (entradas/salidas, control de fechas), Limpieza/Mantenimiento, Seguridad.
- El admin puede añadir/renombrar/quitar áreas — el pack es punto de partida, no camisa de fuerza.

### M3 — Control de vencimientos
- Registro de productos con lote/cantidad/área responsable/fecha de vencimiento (captura manual rápida; escáner de código de barras después — V1 de LabelCraft ya nos dio el patrón ZXing).
- Job diario (Supabase pg_cron / Edge Function) que dispara alertas a los umbrales configurables: 30, 7, 3, 1 día y vencido.
- Notificación push al área responsable + resumen al admin; lista "por vencer" en el dashboard.
- Aplica a cualquier vertical: perecederos en súper, medicamentos en farmacia, reactivos en clínica.

### M4 — Archivos por área
- Subida de documentos (PDF, imágenes, Office) a Supabase Storage, organizados por área, con metadata (quién, cuándo, descripción).
- Visor in-app y control de acceso por rol/área vía RLS + signed URLs.
- **Los documentos alimentan al agente**: extracción de texto + embeddings (pgvector) para que el agente responda citando los documentos del propio negocio.

### M5 — Capacitación
- **Módulos de capacitación por área**: material (documentos de M4, links, texto), asignables a empleados con fecha límite.
- **Checklists de conocimiento por puesto** ("sabe hacer arqueo de caja", "conoce protocolo de cuarto frío"): el admin/supervisor marca lo verificado en persona; queda historial de quién validó y cuándo.
- **Quizzes generados por el agente** a partir del material del área, con calificación automática (opcional por módulo).
- Progreso visible: % de capacitación por empleado y por área.

### M6 — Evaluación de desempeño
Evaluaciones periódicas (mensual/trimestral, configurable) por empleado, con dimensiones estándar de la industria + pesos ajustables por vertical:

1. **Productividad** — cumplimiento de tareas asignadas en tiempo (se alimenta SOLA de los datos de M1).
2. **Calidad del trabajo** — bien hecho a la primera, retrabajos.
3. **Conocimiento del puesto** — se alimenta del progreso de M5.
4. **Confiabilidad** — asistencia, puntualidad, cumplimiento de turnos.
5. **Integridad y honestidad** — manejo de dinero/inventario, reportes veraces.
6. **Iniciativa y creatividad** — propone mejoras, resuelve sin esperar orden.
7. **Trabajo en equipo y comunicación**.
8. **Servicio al cliente** (peso alto en retail; bajo en bodega).
9. **Seguridad e higiene** — protocolos, uso de equipo (crítico en carnicería/panadería/clínica).
10. **Cuidado de recursos** — equipo, merma, desperdicio.

- Escala 1–5 con comentario obligatorio en extremos (1 o 5), evidencia opcional.
- Historial y gráfica de evolución por empleado (radar + tendencia); comparativo por área para el admin.
- Las dimensiones 1 y 3 se **pre-llenan con datos reales** del sistema (tareas completadas a tiempo, capacitaciones al día) — el evaluador ajusta, no inventa.
- Toda evaluación queda en `audit_log` (append-only): quién evaluó, cuándo, qué cambió.

### M7 — Agente IA ("el experto del negocio")
- Chat in-app para admin y empleados (streaming, Claude vía AI SDK).
- **Contexto por capas**: (1) prompt de dominio del vertical (el agente "se empapa" de supermercado, farmacia, etc.), (2) RAG sobre los documentos del negocio (M4), (3) datos vivos vía tools de solo-lectura (tareas, vencimientos, áreas, personal — respetando el rol de quien pregunta).
- **Tools de escritura (solo admin/supervisor)**: crear/asignar tarea, registrar producto con vencimiento, crear checklist, generar quiz de capacitación. Siguen las 5 reglas del contrato agéntico: acción discriminada, sobre `{ok, error}` constante, errores autocorregibles con lista de valores válidos, referencia por nombre legible, rate limit + audit_log.
- **Scope por rol**: el empleado consulta procedimientos y SUS tareas; jamás ve evaluaciones ajenas ni datos de otras áreas.
- Ejemplos de uso: *"Asígnale a Marta el arqueo de caja de mañana con prioridad alta"* (admin) · *"¿Cómo se hace la limpieza del horno?"* (empleado, responde citando el doc del área) · *"¿Qué productos vencen esta semana en perecederos?"* (ambos, según rol).

### M8 — Notificaciones push reales
- Web-push + VAPID (skill `add-mobile` tiene resueltos los gotchas de iOS).
- Disparadas server-side: tarea asignada, tarea completada (al admin), vencimiento próximo, capacitación asignada, recordatorio de evaluación pendiente.
- Preferencias por usuario (qué recibir, horario silencioso).

## 6. Modelo de datos V2 (resumen)

Migran de V1: `users→profiles`, `task_templates`, `tasks`, `checklists`, `checklist_tasks`, `notifications`, `weekly_reports`.

Nuevas:

```
businesses            (id, name, type, settings jsonb, created_by)
areas                 (business_id, name, icon, sort)
profiles              (user_id→auth.users, business_id, role, area_id?, name, avatar_url, active)
invitations           → Supabase Auth (nativo) + metadata de rol/área
products              (business_id, area_id, name, lot?, quantity, expiry_date, status)
expiry_alert_rules    (business_id, days_before[], channels)
documents             (business_id, area_id, storage_path, title, mime, uploaded_by, description)
document_chunks       (document_id, content, embedding vector)          ← RAG
training_modules      (business_id, area_id, title, content, refs[], due_days?)
training_progress     (module_id, profile_id, status, score?, completed_at)
skill_checklists      (business_id, area_id, position?, items[])
skill_checks          (checklist_id, item, profile_id, verified_by, verified_at)
evaluation_templates  (business_id, dimensions jsonb con pesos por área)
evaluations           (business_id, profile_id, evaluator_id, period, status)
evaluation_scores     (evaluation_id, dimension, score, comment, evidence?)
agent_conversations   (business_id, profile_id, title)
agent_messages        (conversation_id, role, content, tool_calls?)
push_subscriptions    (profile_id, endpoint, keys, prefs jsonb)
audit_log             (business_id, actor_id, actor_type user|agent, action, entity, payload, at)  ← append-only
```

RLS: toda tabla filtra por `business_id` del JWT + rol; empleado solo ve lo suyo/su área. Fotos de evidencia → Storage con signed URLs (adiós `evidence_base64`).

## 7. Fases y gates

| Fase | Entrega | Gate para avanzar |
|---|---|---|
| **0. Fundación** | Proyecto Supabase, schema completo con RLS, Auth (login + invitaciones seguras), onboarding "crea tu negocio", seed pack supermercado. | Invitación real llega por email, empleado entra desde SU teléfono y ve el negocio. E2E en verde. |
| **1. Paridad multi-dispositivo** | M1 completo sobre Supabase: tareas, checklists, evidencia→Storage, Realtime, notificaciones in-app. Se elimina sql.js. | El flujo completo admin-asigna → empleado-ve-al-instante → completa-con-foto → admin-lo-ve funciona entre dos dispositivos reales. |
| **2. Push + vencimientos** | M8 (push reales) + M3 (productos, job diario, alertas). | Push llega con la app CERRADA en Android e iOS reales. Alerta de vencimiento dispara en umbral correcto. |
| **3. Archivos + capacitación** | M4 (documentos por área) + M5 (módulos, checklists de conocimiento, progreso). | Empleado abre su material desde el teléfono; admin marca conocimiento verificado; RLS probada entre áreas. |
| **4. Evaluaciones** | M6 completo con pre-llenado automático, historial y radar. | Ciclo de evaluación completo con datos reales de tareas; todo en audit_log. |
| **5. Agente IA** | M7: chat con dominio + RAG + tools con contrato agéntico. | El agente crea una tarea real por chat (admin), responde procedimiento citando doc (empleado), y respeta scopes de rol en test adversarial. |
| **6. Endurecer y pulir** | Tests E2E del happy path completo, quizzes IA, preferencias de notificación, más verticales (farmacia como 2°), limpieza de repo (README real, archivos sueltos). | Checklist de seguridad sin hallazgos críticos. UAT de Su Hogar firmado. |

Cada fase = PRs pequeños + verificación en dispositivos reales antes de declarar hecho (regla "hecho solo si verificado").

## 8. Fuera de scope (explícito)

- Apps nativas iOS/Android (es PWA, como todo KREALABS).
- Nómina, control de asistencia con reloj checador, contabilidad.
- Modo offline de escritura (el caché offline de lectura queda para una fase futura si un cliente lo exige).
- Facturación/cobro del SaaS (Stripe) — se decide cuando MyDELEGA V2 esté validada con Su Hogar; el schema multi-tenant ya lo deja listo.
- Migración de datos de V1: no hay datos reales en producción que preservar (DBs locales por dispositivo); se arranca limpio.

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Scope grande (7 módulos) | Fases con gates duros; Su Hogar usa desde Fase 1 — valor real desde el primer mes. |
| Costo IA del agente por uso de empleados | Rate limit por usuario, modelo económico (Haiku) para consultas simples, presupuesto mensual por negocio monitoreado. Ver `costo-real-de-operar-con-ia` del wiki. |
| iOS y push/almacenamiento | Skill `add-mobile` (14 commits de gotchas resueltos); prueba en dispositivo real como gate de Fase 2. |
| RLS multi-tenant mal escrita = fuga entre negocios | Patrón `supabase-rls-performance` + tests de aislamiento (`supabase-tests-client-isolation`) desde Fase 0. |
| El agente inventa procedimientos | RAG con cita obligatoria de fuente; si no hay documento del negocio, lo dice ("no tengo el procedimiento de tu tienda, esto es práctica general"). |

## 10. Definición de "V2 lista" (5 bullets medibles)

1. Dos dispositivos reales (admin + empleado) operan el flujo completo de delegación con push y Realtime.
2. Un negocio nuevo se auto-configura eligiendo vertical y queda operable en < 10 minutos.
3. Un ciclo de evaluación de desempeño completo, con pre-llenado automático desde tareas y capacitación.
4. Una alerta de vencimiento programada llega sola, sin intervención humana.
5. El agente responde consultas de dominio citando documentos del negocio y crea tareas por chat respetando roles.
