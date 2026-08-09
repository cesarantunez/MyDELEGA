# Fase 0 — Fundación Supabase (rama `v2-fase-0`)

> Estado al 2026-08-08. SPEC: `docs/SPEC-V2.md` (firmada).

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

## Para encender producción (pasos de Cesar / siguiente sesión)

1. **Vercel env vars**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (build) +
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` (functions).
   La service role key se saca del dashboard de Supabase → Settings → API. NUNCA al repo.
2. **Supabase Auth → URL Configuration**: Site URL = dominio de producción; añadir
   `https://<dominio>/join` y `/onboarding` a Redirect URLs.
3. **Email**: el remitente sigue `onboarding@resend.dev` (solo entrega al dueño de la cuenta
   Resend). Para invitar empleados reales: verificar dominio en Resend y cambiar el `from` en
   `api/invite.ts`. Mientras tanto, la app entrega el **enlace de invitación para WhatsApp**.
4. **Mergear `v2-fase-0` a master** = deploy (repo standalone). Hacerlo cuando 1-3 estén listos.

## Brechas conocidas de la fase

- El endpoint `/api/invite` NO se pudo probar punta a punta en local (requiere service role key
  que solo vive en el dashboard); el trigger y el flujo `/join` se probaron por separado.
  Probarlo en el primer deploy de preview.
- Confirmación de correo del dueño usa el SMTP default de Supabase (2-4 emails/hora). Suficiente
  para pilotos; para volumen real configurar SMTP de Resend en Supabase.
- Las notificaciones aún son in-app (push reales = Fase 2).
- El PDF semanal usa los datos nuevos pero no se re-verificó visualmente en esta fase.
- Avisos cosméticos de ESLint (`react-refresh/only-export-components`) heredados del patrón V1.
