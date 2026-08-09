# Fase 3 — Archivos por área + Capacitación — ✅ EN PRODUCCIÓN

> Estado al 2026-08-08 (nocturno). SPEC: `docs/SPEC-V2.md` §M4 y §M5 (+ anexo §M5.1 El Panal).
> **`v2-fase-3` mergeada a master y desplegada en https://my-delega.vercel.app.**

## Qué quedó construido y VERIFICADO

### Archivos por área (M4)
- Tabla `documents` + bucket privado `documents` en Storage (RLS por negocio;
  cualquier miembro sube, borra admin o quien subió). Acceso por URL firmada (1h).
- Pestaña **Archivos** en Capacitación: subida con título/área/descripción,
  filtro por área, abrir y eliminar. Verificado: archivo subido a Storage y listado.
- Los `document_ids` de los módulos dejan listos estos archivos para el RAG
  del agente en Fase 5.

### Capacitación (M5)
- **Módulos** (`training_modules` + `training_progress`): contenido paso a paso,
  links y documentos adjuntos; asignación multi-empleado con fecha límite
  (notificación in-app `training_assigned` + push real); barra de progreso y
  detalle de quién completó y cuándo.
- **Conocimiento por puesto** (`skill_checklists/items/checks`): el manager define
  qué debe dominar cada puesto y marca lo verificado EN PERSONA — queda sello de
  quién verificó y cuándo (insumo directo de la dimensión "Conocimiento" de las
  evaluaciones de Fase 4).
- **"Aprender" del empleado**: panal de capacitaciones (celda de miel al completar,
  roja si venció la fecha límite), detalle con material completo y sección de
  conocimiento validado con % por checklist.
- Nav: admin ganó **Capacitar** (salió "Nueva", que vive en el Dashboard y en el
  botón + de Tareas); empleado ganó **Aprender**.

## Verificación E2E (2026-08-08, navegador local contra Supabase cloud)

1. Admin creó módulo "Protocolo de cuarto frio" (Carnicería) → asignado a Marta.
2. Marta lo vio en su panal, abrió el material y lo completó → 100% de miel;
   `training_progress` completed + notificación verificadas en DB.
3. Checklist "Carnicero: dominio del puesto" (3 puntos) → punto verificado a Marta
   con sello "Verificado por … + fecha" visible.
4. Documento `protocolo-limpieza.txt` subido a Storage y listado en Archivos.
5. Login del admin real (antunezc628@gmail.com) probado en la UI.
6. Typecheck + build en verde; bundle de producción confirmado con las rutas nuevas.

## Cuentas del entorno de prueba (negocio "Super Prueba Fase 0")

Ver mensaje de entrega a Cesar. El admin real es `antunezc628@gmail.com`;
empleados de prueba Marta/Pedro/Lucia con alias `antunezc628+*@gmail.com`.
**Todo esto se limpia antes del primer negocio real.**

## Brechas conocidas

- Quizzes de capacitación generados por IA = Fase 5 (agente), como manda la SPEC.
- Sin extracción de texto/embeddings de documentos todavía (RAG en Fase 5).
- Límite de subida: el límite default de Supabase Storage (50MB); sin validación
  de tamaño en UI.
- Heredadas: dominio Resend pendiente; datos de prueba vivos en prod;
  gate de push en dispositivo real de Cesar sigue abierto (Fase 2).
