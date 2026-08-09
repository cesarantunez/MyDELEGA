# Fase 0 — Fundación Supabase — ✅ ENCENDIDA EN PRODUCCIÓN

> Estado al 2026-08-08 (nocturno). SPEC: `docs/SPEC-V2.md` (firmada).
> **`v2-fase-0` mergeada a master y desplegada: https://my-delega.vercel.app corre la V2.**
> Verificado en prod: login del dueño → dashboard con datos reales de la nube;
> `/api/invite` probado E2E en preview (usuario + perfil + enlace de un solo uso).

## Configuración aplicada (2026-08-08, por agente, sin exponer valores)

- **Vercel env vars** en production/preview/development: `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (extraída
  vía Supabase CLI a archivo temporal, cargada por API y destruida). `RESEND_API_KEY`
  ya existía de la V1.
- **Supabase Auth**: `site_url` = https://my-delega.vercel.app; redirects para prod,
  previews del team y localhost. Config pinneada en `supabase/config.toml`
  (⚠️ `config push` aplica defaults del CLI en campos no declarados — por eso está
  todo pinneado; editar ese archivo antes de cualquier push futuro).
- **Fix post-preview**: GoTrue escribe `app_metadata` después del insert en
  `admin.createUser`, así que el trigger no veía `business_id`. `api/invite.ts`
  ahora upserta el perfil explícitamente y el trigger cubre insert+update.

## Qué quedó construido y VERIFICADO en local

- **Proyecto Supabase `mydelega`** (`fdzzieihsgkdygazfjvm`, org Mercados, us-east-1, $10/mes).
- **Schema V2 multi-tenant con RLS en todas las tablas**: businesses, areas, profiles,
  task_templates, tasks, checklist_items, notifications, weekly_reports, audit_log (append-only).
  Helpers RLS con security definer bloqueados por revoke (advisors en limpio).
- **Auth Supabase**: registro de dueño (con confirmación de correo), login, logout, guards por rol.
- **Onboarding "crea tu negocio"**: elige vertical (7 packs: supermercado, farmacia, ferretería,
  restaurante, clínica dental, gasolinera, genérico) → RPC atómico + seed de áreas y plantillas.
  Verificado: 12 áreas + 31 plantillas del pack supermercado.
- **Invitaciones seguras**: `api/invite.ts` (service role) valida admin → crea usuario con
  `app_metadata` (el cliente no puede falsificarla) → trigger crea el perfil → link de un solo
  uso → `/join` donde el empleado define SU contraseña. El email V1 con contraseña en texto
  plano quedó eliminado (`api/send-invite.ts` borrado).
- **Capa de datos completa migrada a Supabase** (5 repositorios + 11 páginas). SQLite/sql.js
  eliminado del proyecto.
- **Realtime**: tareas y notificaciones se actualizan en vivo (campana + panal).
- **El Panal (SPEC §M5.1)**: `HoneycombGrid`/`HexCard` — celdas hexagonales con animación de
  enjambre; vista default de "Mis tareas" del empleado.
- **Evidencia fotográfica** → Supabase Storage (bucket privado `evidence`, URLs firmadas).

**Flujo E2E verificado en navegador** (dev local): registro dueño → confirmación → login →
onboarding supermercado → dashboard → crear tarea con plantilla de Carnicería asignada a
empleada → login como empleada → la tarea aparece en su panal → la inicia (RLS de empleado OK).
Checklist (5 items) y notificación `task_assigned` verificados en DB.

## Brechas conocidas (post-encendido)

- **Email de invitación**: Resend sin dominio verificado solo entrega al correo del dueño de la
  cuenta; a otros destinatarios NO llega (verificado en preview). El flujo funciona igual con el
  **enlace para WhatsApp** que muestra la app. Cerrar: verificar dominio en Resend y cambiar el
  `from` de `api/invite.ts`.
- Confirmación de correo del dueño usa el SMTP default de Supabase (2-4 emails/hora). Suficiente
  para pilotos; para volumen real configurar SMTP de Resend en Supabase.
- **Datos de prueba vivos en prod**: negocio "Super Prueba Fase 0" con usuarios
  `antunezc628+fase0/+empleado/+empleado2/+empleado3@gmail.com`. Limpiar antes del primer
  negocio real (borrar el business en cascada + los 4 usuarios de auth).
- Las notificaciones aún son in-app (push reales = Fase 2).
- El PDF semanal usa los datos nuevos pero no se re-verificó visualmente en esta fase.
- Avisos cosméticos de ESLint (`react-refresh/only-export-components`) heredados del patrón V1.
- Opcional dashboard: activar "leaked password protection" en Supabase Auth (advisor WARN).
