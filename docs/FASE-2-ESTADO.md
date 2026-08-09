# Fase 2 — Push reales + Control de vencimientos — ✅ EN PRODUCCIÓN

> Estado al 2026-08-08 (nocturno). SPEC: `docs/SPEC-V2.md` §M3 y §M8.
> **`v2-fase-2` mergeada a master y desplegada en https://my-delega.vercel.app.**

## Qué quedó construido y VERIFICADO

### Push notifications reales (M8)
- **Service worker custom** (`src/sw.ts`, vite-plugin-pwa en modo injectManifest):
  precache PWA + evento `push` (muestra la notificación con la marca) +
  `notificationclick` (enfoca/abre la app en la URL correcta).
- **Cliente** (`src/lib/push.ts`): suscripción con VAPID guardada en
  `push_subscriptions` (RLS: cada quien solo las suyas). Banner de activación
  para admin y empleado + toggle real en el perfil. Regla iOS respetada:
  el permiso solo se pide con gesto del usuario y solo si la PWA está instalada.
- **`/api/push-send`**: relay autenticado — valida sesión, restringe destinatarios
  al MISMO negocio, envía web-push y limpia suscripciones muertas (404/410).
  Verificado en preview: 200, scoping correcto.
- **Disparo automático**: al asignar tarea (push al empleado) y al completarla
  (push al admin), como refuerzo best-effort de la notificación in-app.

### Control de vencimientos (M3)
- **Tabla `products`** multi-tenant con RLS (cualquier miembro registra; borrar solo admin).
- **Página `/admin/products`**: registro rápido (producto, área, cantidad/unidad,
  lote, fecha), lista con semáforo por días restantes, acciones
  consumido/descartado (merma). Verificada en navegador.
- **Widget "Por vencer"** en el dashboard admin (activos ≤7 días). Verificado.
- **`/api/expiry-check` + Vercel Cron diario** (12:00 UTC = 6:00am Honduras;
  a esa hora la fecha UTC coincide con la local): umbrales 30/7/3/1/0 días,
  notificación in-app + push al área responsable y a managers, marca vencidos,
  audit_log, **idempotente** vía `last_alert_threshold`.
  Verificado en preview Y en prod: corrida 1 = 3 alertas correctas
  (vencido/mañana/30d), corrida 2 = 0 duplicados, sin secret = 401.

## Verificación (2026-08-08)

- Typecheck app + api en verde; build con SW injectManifest OK.
- UI verificada en navegador local (registro de producto, semáforo, widget).
- Job probado E2E en preview (3 corridas) y en producción (idempotente).
- `sw.js` servido en prod con handler de push.
- Fix encontrado en preview: runtime ESM de Vercel exige extensión `.js`
  en imports relativos de `api/` (commit 9970c18).

## Gate pendiente de dispositivo real (para Cesar)

El envío criptográfico de web-push está desplegado pero **nadie lo ha recibido
aún en un teléfono real** (este entorno no puede otorgar permiso de
notificaciones). Para cerrar el gate de la SPEC:
1. Abrir https://my-delega.vercel.app en el teléfono (Android directo;
   iPhone: instalar la PWA primero desde Compartir → Añadir a pantalla de inicio).
2. Entrar y tocar **Activar** en el banner de notificaciones.
3. Desde otra sesión, asignarse una tarea → debe sonar el teléfono con la app cerrada.
4. Con un producto por vencer, esperar el cron de las 6am o avisarme para dispararlo.

## Brechas conocidas

- Umbrales de alerta fijos (30/7/3/1/0). Configurables por negocio = fase futura.
- Los empleados aún no tienen página propia de registro de productos (pueden por
  RLS; la UI es de admin). Añadir captura por área cuando el uso real lo pida.
- Resend sin dominio verificado (heredado de Fase 0) — invitaciones por enlace.
- Datos de prueba en prod (negocio "Super Prueba Fase 0" + 3 productos de prueba).
