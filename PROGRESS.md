# PROGRESS — CRM de leads con WhatsApp para inmobiliarias (SLP)

## Plan por fases (estimado)

| Fase | Contenido | Estimado | Estado |
|---|---|---|---|
| 0 | Scaffold Next.js 16 + Prisma 7 + Supabase local + Tailwind 4 + Vitest, esquema de BD y RLS | 1 h | ✅ |
| 1 | Auth (Supabase), organizaciones, roles (admin/asesor), invitaciones | 2 h | ✅ |
| 2 | Desarrollos e inventario de unidades | 1 h | ✅ |
| 3 | Leads: captura manual, importación CSV, webhook público, campañas con código único, consentimiento | 2 h | ✅ |
| 4 | Pipeline kanban con motivo de pérdida | 1.5 h | ✅ |
| 5 | Tareas, recordatorios y alerta de lead "frío" (X horas configurables) | 1.5 h | ✅ |
| 6 | WhatsApp: adaptador (simulado + Cloud API), plantillas, webhook entrante | 2 h | ✅ |
| 7 | Cotizador (enganche, mensualidades, plazo) + PDF | 1 h | ✅ |
| 8 | Dashboard de métricas | 1.5 h | ✅ |
| 9 | Landing y precios públicos | 1 h | ✅ |
| 10 | README, .env.example, riesgos | 0.5 h | ✅ |

Total estimado: ~15 h.

## Bitácora

### Fases 0 y 1 — Base, auth, organizaciones, roles e invitaciones ✅

**Hecho**
- Next.js 16.4 (App Router) + TypeScript + Tailwind 4 + Prisma 7 (adapter pg) + Supabase local (Auth + Postgres 17).
- Esquema completo de BD para todo el MVP (`prisma/schema.prisma`) y migración de **RLS** (`prisma/migrations/*_rls`): rol `app_rls`, política por `organization_id` en todas las tablas, PostgREST bloqueado para `anon`/`authenticated`.
- `withOrg(orgId, tx => …)` (`src/server/db/tenant.ts`) para toda consulta de negocio; el cliente raíz está restringido por ESLint.
- Registro (crea organización + admin + aviso de privacidad v1), login, logout, onboarding, cambio de organización activa.
- Roles ADMIN/ASESOR con matriz de permisos (`src/server/auth/permissions.ts`).
- Equipo: invitaciones por enlace (hash SHA-256, 7 días, un solo uso, compartir por WhatsApp), límite de lugares por plan, cambiar rol, desactivar/reactivar.
- Configuración: nombre, horas para alerta de lead frío, datos de WhatsApp, llave del formulario web, aviso de privacidad versionado + página pública `/aviso-privacidad/[slug]`.

**Pruebas** (20): aislamiento RLS (lectura, update, delete, insert y cambio de organización entre tenants; sin org = cero filas; todas las tablas con `organization_id` tienen RLS; `anon` sin acceso), matriz de roles, invitaciones (correo distinto, expiradas, un solo uso, límite de plan, admin no puede auto-degradarse, no puede tocar membresías de otra org).
Verificado además de punta a punta en navegador (Playwright headless): registro → invitación → alta de asesor → asesor no ve Equipo/Configuración y es redirigido.

**Cómo probarlo**
1. `npx supabase start` y `npx prisma migrate deploy`.
2. `npm run dev` → http://localhost:3010/registro.
3. En *Equipo* invita a otro correo, abre el enlace en una ventana privada y crea la cuenta.

**Notas**
- El puerto 3000 de esta máquina lo ocupa otra app (WSL) y 3093–3989 están reservados por Windows; el proyecto usa **3010**.


### Fase 2 — Desarrollos e inventario ✅

**Hecho**
- Desarrollos: alta, edición, activar/desactivar; tarjetas con avance de ventas (apartadas + vendidas).
- Unidades (lote, casa, departamento, local): alta individual, **alta en bloque** ("Lote " del 1 al 40), estatus disponible/apartado/vendido editable en línea, borrado protegido si tiene cotizaciones, filtro por estatus, precio por m², orden natural (Lote 2 antes que Lote 10).
- Plan Básico limitado a 1 desarrollo activo.
- Los asesores ven el inventario pero no lo editan.
- Todo id referenciado se resuelve dentro de `withOrg` antes de usarlo (las llaves foráneas de Postgres no pasan por RLS).

**Pruebas** (+6): conteos por estatus, claves duplicadas, asesor sin permisos de escritura, no se puede colgar una unidad de un desarrollo de otra organización, no se puede leer/modificar inventario ajeno, límite del plan Básico.

**Cómo probarlo**: `/app/desarrollos` → crea un desarrollo → "Alta en bloque".

### Fase 3 — Leads, campañas, CSV, webhook y consentimiento ✅

**Hecho**
- Campañas (`/app/campanas`): canal, código único sugerido automáticamente, gasto, fechas, desarrollo; métricas de leads, ventas y **costo por lead**; liga al formulario hospedado por campaña.
- Leads (`/app/leads`): lista con búsqueda (nombre/teléfono/correo), filtros por etapa, campaña, asesor y "solo fríos", paginación; alerta visual de lead frío.
- Captura manual con consentimiento obligatorio; deduplicación por teléfono.
- Ficha del lead: datos editables, origen, registro de actividades (llamada, nota, visita, correo) con historial, consentimientos, eliminación por derecho ARCO.
- Importación CSV (`/app/leads/importar`): coma o punto y coma, encabezados en español con o sin acentos, BOM de Excel, errores por fila, deduplicación, reparto automático, plantilla descargable.
- **Webhook público** `POST /api/public/leads` (JSON o formulario HTML, CORS, alias en inglés, honeypot, rate limit, redirect opcional) y formulario hospedado `/f/[slug]?c=CODIGO`.

**Pruebas** (+29, total 63): normalización de teléfonos MX, webhook (llave inválida, alta con campaña/consentimiento/asignación, deduplicación, consentimiento obligatorio, validación, código de campaña de otra org ignorado, honeypot, form-urlencoded con redirect, redirect `javascript:` ignorado, JSON malformado, rate limit), parseo e importación CSV, visibilidad de leads por asesor y reasignación prohibida.
E2E en navegador: campaña → lead manual (sin y con consentimiento) → actividad → duplicado → CSV → formulario hospedado → CPL en campañas.

**Cómo probarlo**
- Webhook:
  ```bash
  curl -X POST http://localhost:3010/api/public/leads -H "Content-Type: application/json"     -H "X-Form-Key: <llave en Configuración>"     -d '{"nombre":"Ana","telefono":"4441234567","campana":"ESP-57","acepta_privacidad":true}'
  ```
- Formulario hospedado: en Campañas → "Editar y liga del formulario".

### Fase 4 — Pipeline kanban ✅

**Hecho**
- `/app/pipeline`: 8 columnas (Nuevo → Perdido) con conteo, arrastrar y soltar nativo (sin librerías) y selector "Mover a…" en cada tarjeta (móvil/teclado). Actualización optimista con reversión si el servidor rechaza.
- Diálogo obligatorio de **motivo de pérdida** (comentario obligatorio si es "Otro") y de **monto de venta** (por defecto el precio de la unidad).
- Sincronización con inventario: Apartado → unidad apartada; Vendido → unidad vendida; si el trato se cae, la unidad se libera. Se bloquea apartar/vender una unidad ya tomada por otro cliente.
- Historial de etapas (`lead_stage_events`) para métricas de conversión, actividad en la ficha, filtros por desarrollo/campaña/asesor, tarjetas frías marcadas en rojo. Vendidos/perdidos visibles 60 días.
- Selector de etapa también en la ficha del lead.

**Pruebas** (+7, total 70): motivo de pérdida, historial y primer contacto, sincronización de unidad y doble venta, liberación de unidad, permisos del asesor, aislamiento entre organizaciones, columnas filtradas por visibilidad.
E2E: arrastre Nuevo → Cita, Perdido con validación de motivo, Apartado → Vendido con la unidad marcada como vendida.

### Fase 5 — Tareas, recordatorios y alerta de lead frío ✅

**Hecho**
- Tareas por lead (título con sugerencias, fecha/hora en hora del centro de México, responsable). El asesor solo crea tareas para sí y solo sobre sus leads; el admin puede asignar a cualquiera.
- `/app/tareas`: Vencidas / Hoy / Próximas / Completadas (7 días); el admin puede ver "Todo el equipo".
- **Alerta visible**: banner en todas las páginas privadas con tareas vencidas, leads fríos (más de X horas sin contacto, X configurable en Configuración) y leads sin asignar; insignia "Frío" en lista, pipeline y ficha.
- Llamada/visita/correo/WhatsApp saliente reinician el contador; la nota no.

**Pruebas** (+9, total 79): regla de lead frío (sin contacto, con contacto, etapas cerradas), interpretación de fechas en hora de México, permisos de tareas, conteos de alertas, umbral configurable por organización.
E2E: tarea vencida → banner; lead envejecido 30 h → banner y filtro "Solo fríos"; llamada → desaparece la alerta; completar tarea → desaparece el banner.

### Fase 6 — WhatsApp ✅

**Hecho**
- Adaptador `src/server/whatsapp/`: interfaz `WhatsAppProvider`, proveedor **simulado** y proveedor **Cloud API** (Graph API, plantillas y texto, manejo de errores, timeout).
- Webhook `/api/webhooks/whatsapp`: verificación GET (`hub.verify_token`), POST con firma HMAC obligatoria, enrutamiento por Phone number ID, creación de lead si el número es nuevo, idempotencia por `wamid`, estados de entrega sin retroceso.
- Ficha del lead: conversación tipo WhatsApp, respuesta libre dentro de la ventana de 24 h, plantillas con variables prellenadas y vista previa, simulador de mensaje entrante (solo modo simulado), registro/revocación de consentimiento.
- Configuración muestra el estado de la conexión sin exponer secretos. Guía paso a paso: `docs/WHATSAPP.md`.

**Pruebas** (+13, total 92): firma HMAC, parser de payload (incl. números MX con 521 y tipos de mensaje), proveedor Cloud con `fetch` simulado (formato y errores), GET de verificación, POST sin firma, alta de lead desde número desconocido en la org correcta, idempotencia, phone number ID desconocido, ventana de 24 h, consentimiento para plantillas, estados sin retroceso, permisos de asesor, validación de variables.
E2E: webhook firmado real contra el servidor → lead creado → respuesta → plantilla bloqueada sin consentimiento → consentimiento → plantilla enviada → entrante simulado.

**Cómo probarlo**: abre cualquier lead → panel WhatsApp → "Simular mensaje entrante" y responde. Para la cuenta real, sigue `docs/WHATSAPP.md`.

### Fase 7 — Cotizador y PDF ✅

**Hecho**
- `/app/cotizador`: unidad, cliente opcional, descuento, enganche %, plazo y tasa anual, con **vista previa en vivo**. Guarda la cotización, la registra en el historial del lead y lo pasa a "Cotización".
- `/app/cotizador/[id]`: resumen, PDF incrustado, enlace "Enviar por WhatsApp" (wa.me).
- PDF tamaño carta (`/api/quotes/[id]/pdf`, requiere sesión y respeta aislamiento y permisos): datos del cliente y la unidad, plan de pagos, notas legales, asesor.
- Botón "Cotizar" en la ficha del lead y en la tabla de unidades.

**Pruebas** (+21, total 113): cálculo (sin interés, redondeo, descuento, anualidad estándar, contado, centavos, 9 entradas inválidas), montos calculados en servidor, cambio de etapa, unidad vendida, aislamiento entre organizaciones y asesores, PDF válido con acentos y emojis.
E2E: lead → Cotizar → vista previa → guardar → PDF 200 `application/pdf`; sin sesión 401.

**Pendiente**: revisión visual del PDF (en esta máquina no hay herramienta para rasterizarlo; abre una cotización y revísala a ojo).

### Fase 8 — Dashboard + seed ✅

**Hecho**
- Inicio (`/app`) con filtro de fechas: leads nuevos, ventas y monto, conversión, **tiempo promedio (y mediana) de primera respuesta**, leads fríos; **leads por campaña con costo por lead y por venta**; **conversión por etapa** (embudo con % del total y de la etapa anterior); **ventas por asesor** con monto y tiempo de primera respuesta.
- El asesor ve el tablero limitado a sus leads y sin costos.
- `prisma/seed.ts` (`npm run db:seed`): 2 organizaciones, 3 desarrollos, 46 unidades, 40 leads con historial, tareas y consentimientos, todo inventado y determinista. Idempotente. Logins demo en el encabezado del archivo (contraseña `Demo1234!`).

**Pruebas** (+10, total 123): rangos de fechas en hora de México, totales y conversión, CPL/costo por venta, ocultar costos al asesor, embudo con etapas saltadas, primera respuesta, ventas por asesor, aislamiento entre organizaciones y filtro por fechas.
Verificado en navegador con los datos del seed (admin, asesor y la otra organización).

### Fase 9 — Landing y precios ✅

**Hecho**
- Landing en español de México (`/`): propuesta de valor, funciones, cómo empezar, planes, preguntas frecuentes y llamadas a la acción. Estática, sin desbordamiento horizontal en móvil (390 px).
- `/precios`: **tres planes con precio visible** por número de usuarios — Básico $1,490 (3), Profesional $3,490 (10), Desarrolladora $6,990 (25), MXN + IVA — con comparativo y preguntas sobre precios.
- `/terminos` y `/privacidad` (borrador base, con aviso de que requiere revisión jurídica), `robots.txt` y `sitemap.xml`.
- Los precios y límites salen de un solo archivo (`src/lib/plans.ts`), el mismo que aplica el límite de usuarios y de desarrollos; las tablas no prometen nada que el producto no haga.

**Verificación**: `npm run build` de producción exitoso (25 rutas). Revisado en navegador, escritorio y móvil.
**Pendiente**: no hay cobro en línea (ver riesgos); los precios son una propuesta mía, por validar con clientes.

### Fase 10 — Documentación final ✅

- `README.md`: cómo correrlo, scripts, variables, arquitectura y **los 10 riesgos/pendientes** antes de vender a un cliente real.
- `.env.example` comentado, sin valores reales (`.env.local` está en .gitignore; verificado que no hay secretos en git).
- Verificación final: lint, typecheck y build limpios; 123 pruebas pasando (12 archivos).

## Estado final y cómo probar todo

1. `npx supabase start && npx prisma migrate deploy && npm run db:seed && npm run dev` → http://localhost:3010
2. Entra como `admin@potosi.ejemplo.test` / `Demo1234!` (dashboard con datos) y como `asesor1@potosi.ejemplo.test` (vista limitada).
3. Flujo sugerido: Campañas → Leads (CSV, formulario hospedado, webhook con curl) → Pipeline → ficha del lead (WhatsApp simulado, tareas, cotizar) → Inicio.

## Bloqueos
Ninguna fase se bloqueó más de 20 minutos. Incidencias menores resueltas: puerto 3000 ocupado por otra app (se usa 3010), Tailwind 4 (`@utility` en lugar de `@apply` de clases propias), formularios que perdían valores al fallar la validación, seed no idempotente (corregido).
