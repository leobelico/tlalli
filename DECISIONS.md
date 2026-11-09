# DECISIONS

Registro de decisiones tomadas ante ambigüedades. Formato: decisión — motivo.

## Infraestructura

1. **Next.js 16.4 + React 19.3 + Prisma 7.10 + Tailwind 4** (versiones estables actuales que instala `create-next-app`). En Next 16 el middleware se llama `proxy.ts`; Prisma 7 requiere driver adapter (`@prisma/adapter-pg`) y `prisma.config.ts`.
2. **Supabase local vía CLI (`supabase start`)** para desarrollo y pruebas. Se excluyen servicios no usados (realtime, storage, edge functions, logs) para que sea ligero.
3. **npm** como gestor de paquetes (no hay pnpm instalado).
4. Las skills para agentes que instala `prisma init` (`.agents/`, `.windsurf/`, `skills-lock.json`) se excluyen de git: no son parte del producto.

## Multi-tenant

5. **Aislamiento en dos capas**:
   - **RLS en Postgres**: todas las tablas con `organization_id` tienen `ENABLE ROW LEVEL SECURITY` (ver punto 13) y una política `organization_id = current_setting('app.org_id')::uuid` para el rol `app_rls`.
   - Toda consulta de negocio corre dentro de `withOrg(orgId, tx => ...)`, que abre una transacción, hace `SET LOCAL ROLE app_rls` y fija `app.org_id`. Aunque el código olvide un filtro, la BD no devuelve filas de otra organización.
   - El cliente Prisma "raíz" (sin RLS) solo se usa en módulos explícitos: sesión/membresías, invitaciones, resolución de webhooks públicos y seed. Una regla de ESLint impide importarlo fuera de esos módulos.
6. **Se revocan permisos de `anon` y `authenticated`** sobre las tablas de `public` y se activa RLS en todas: así la API REST de Supabase (PostgREST) no expone datos aunque alguien tenga la anon key. Toda lectura/escritura pasa por el servidor Next.js.
7. El rol `app_rls` se crea en una migración como `NOLOGIN` y se concede a `postgres`; no requiere credenciales adicionales.

## Auth y roles

8. **Supabase Auth con email + contraseña**. La tabla `users` en `public` replica el `id` de `auth.users` (se crea/actualiza al iniciar sesión).
9. Un usuario puede pertenecer a varias organizaciones; la organización activa se guarda en una cookie `org_id` y siempre se valida contra sus membresías.
10. **Roles**: `ADMIN` (todo) y `ASESOR`. El asesor solo ve y trabaja los leads asignados a él; puede consultar inventario y cotizar, pero no edita desarrollos, precios, campañas, configuración ni invita usuarios.
11. **Invitaciones** por enlace con token (se guarda el hash SHA-256, expira en 7 días). No se integra proveedor de correo en el MVP: el admin copia el enlace y lo envía (p. ej. por WhatsApp). El límite de asesores lo marca el plan de la organización.
12. **Se desactiva `cacheComponents`** (venía activado en el scaffold de Next 16.4). Todo el CRM depende de la sesión y la organización activa; con Cache Components cada lectura de cookies tendría que ir detrás de `<Suspense>`. Se usa renderizado dinámico tradicional. Se puede adoptar después ruta por ruta (landing y precios sí son estáticas).
13. **RLS sin `FORCE`**: el dueño de las tablas (`postgres`) no está sujeto a RLS, y solo se usa en módulos auditados (`src/server/db/root.ts`, permitido solo en `src/server/auth/*`, `src/server/public/*`, seed y pruebas, vía regla de ESLint). Toda la lógica de negocio usa `withOrg()` con el rol `app_rls`, que sí está sujeto a RLS.
14. **Lugares del plan** = miembros activos (admins + asesores) + invitaciones pendientes vigentes.
15. **Nombre comercial provisional: "Prospecta"** (reemplazado por "Pórtico", ver punto 42). Fácil de cambiar en `src/lib/brand.ts`.

## Leads y campañas

16. **Campaña con código único por organización** (ej. `ESP-57`, `RAD-EXA`). El lead guarda su campaña y además su `channel` (denormalizado) para leads sin campaña. El código se usa en el anuncio, en la URL (`?c=`), en el formulario hospedado y en el CSV.
17. **Deduplicación por teléfono** normalizado E.164 (`+52` por defecto; quita el "1" antiguo de celulares). Si el lead ya existe no se duplica: se agrega una actividad "Volvió a dejar sus datos" con el nuevo origen. La campaña original se conserva (atribución *first-touch*).
18. **Asignación automática** (webhook y CSV): al miembro activo con menos leads abiertos, prefiriendo asesores sobre admins. El asesor que captura un lead manual siempre queda asignado.
19. **Consentimiento LFPDPPP**: captura manual exige casilla "el prospecto aceptó el aviso"; webhook exige `acepta_privacidad=true`; CSV exige que el admin confirme el consentimiento del archivo (queda registrado a su nombre). Cada consentimiento se liga a la versión del aviso vigente, con IP y user-agent cuando aplica. Borrar un lead (derecho ARCO de cancelación) elimina su historial en cascada.
20. **Llave de formulario pública** (`lfk_…`): es publicable por diseño (va en el HTML de la landing). Solo permite crear leads en esa organización; se puede regenerar. Protecciones: honeypot `website`, límite de 20 req/min por IP y 300/min por organización, cuerpo ≤16 KB.
21. **Formulario hospedado** `/f/[slug]?c=CODIGO` sin JavaScript, para QR en espectaculares/volantes.
22. **"Contacto" para la alerta de lead frío** = llamada, visita, correo o WhatsApp saliente. Las notas no cuentan. Etapas que generan alerta: Nuevo → Cotización (no Apartado, Vendido ni Perdido). El primer contacto mueve automáticamente Nuevo → Contactado.
23. **Recordatorios dentro de la app** (sin correo ni push en el MVP): banner rojo en todas las páginas privadas con tareas vencidas, leads fríos y leads sin asignar, más la vista `/app/tareas` (Vencidas / Hoy / Próximas / Completadas). Enviar recordatorios por WhatsApp o correo al asesor queda como pendiente (requiere guardar el teléfono del asesor y una plantilla aprobada).
24. **Zona horaria fija `America/Mexico_City` (UTC−6, sin horario de verano desde 2022)** para mostrar fechas y para interpretar `datetime-local`. Clientes en zona fronteriza requerirían zona configurable.

## WhatsApp

25. **Adaptador `WhatsAppProvider`** con dos implementaciones (`mock` y `cloud`) seleccionadas por `WHATSAPP_PROVIDER`. Ambos comparten el formato de webhook de Meta y el mismo procesamiento de entrada; la firma `X-Hub-Signature-256` se valida siempre (en desarrollo con un secreto de prueba).
26. **Una app de Meta para toda la plataforma**; cada organización configura su *Phone number ID*, que enruta los mensajes entrantes. Tokens por organización / Embedded Signup quedan como pendiente.
27. **Consentimiento y WhatsApp**: las plantillas (contacto proactivo) exigen consentimiento registrado. Las respuestas de texto libre se permiten solo dentro de la ventana de 24 h abierta por un mensaje del propio prospecto (atender su solicitud). Si escribe un número desconocido se crea el lead sin consentimiento y el asesor debe compartir el aviso y registrarlo.
28. Un WhatsApp saliente cuenta como contacto (reinicia la alerta de lead frío y mueve Nuevo → Contactado). Un mensaje entrante no, porque la alerta mide la respuesta del equipo.
29. Las plantillas viven en código (`src/server/whatsapp/templates.ts`) porque deben coincidir exactamente con las aprobadas en Meta.

## Cotizador

30. **Cálculo en centavos enteros** (`src/lib/quote.ts`), una sola función usada por la vista previa del navegador y por el servidor. Sin interés: mensualidad fija y la última absorbe el redondeo. Con interés: anualidad estándar (tasa anual / 12); la última mensualidad cierra el saldo exacto. El servidor siempre recalcula con el precio de la unidad en BD; nunca confía en montos del cliente.
31. La cotización guarda una copia de los montos (precio, descuento, enganche, plazo, tasa) para que cambios posteriores de precio no alteren documentos ya entregados. Vigencia impresa en el PDF: 15 días (texto informativo, no se hace cumplir).
32. Cotizar a un lead en etapa temprana (Nuevo → Visita realizada) lo mueve a "Cotización". No se cotizan unidades vendidas.
33. PDF con `pdf-lib` (fuentes estándar, sin dependencias nativas). Caracteres fuera de WinAnsi (p. ej. emojis) se omiten en el PDF en lugar de fallar.

## Dashboard y seed

34. **Vista de cohorte**: los indicadores cuentan los leads *creados* en el periodo (por defecto 30 días); las ventas cuentan por fecha de venta. El costo por lead = gasto total capturado de la campaña ÷ leads del periodo (el gasto no se prorratea por fechas: simplificación del MVP; si el periodo es corto el CPL sale inflado).
35. **Embudo**: cuenta leads distintos que alcanzaron cada etapa a partir del historial (`lead_stage_events`); saltarse etapas (Nuevo → Vendido) cuenta como haber pasado por las anteriores. "Perdido" es salida, no paso.
36. **Primera respuesta** = `first_contact_at − created_at` (promedio y mediana). Marcar un lead como perdido no cuenta como contacto; un WhatsApp saliente, llamada, visita, correo o avanzar de etapa sí.
37. **Visibilidad**: el asesor ve el mismo dashboard limitado a sus leads y sin gasto/costos de campaña. Zona horaria de los filtros de fecha: México (UTC−6).
38. **Seed** (`npm run db:seed`): solo corre contra Supabase local, crea usuarios de Auth con la API de administración (`SUPABASE_SERVICE_ROLE_KEY`, nunca en el cliente) y es idempotente. Teléfonos `+52 444 555 0xxx` y correos `@ejemplo.test` inventados.

## Planes y precios (propuesta)

39. **Tres planes por número de usuarios**: Básico $1,490/mes (3 usuarios, 1 desarrollo), Profesional $3,490 (10, desarrollos ilimitados), Desarrolladora $6,990 (25 + acompañamiento). MXN + IVA, prueba de 14 días sin tarjeta, sin contrato. Son cifras iniciales para validar con clientes, no un estudio de mercado. Lo único que el sistema hace cumplir hoy es el límite de usuarios y los desarrollos del Básico; el soporte y el acompañamiento son servicios humanos.
40. **Sin cobro en línea en el MVP**: la prueba de 14 días y el cambio de plan no se aplican automáticamente (el plan se cambia a mano en BD). Integrar un procesador (Stripe/Conekta/Mercado Pago) queda como pendiente.
41. **Marca provisional "Prospecta"** y correo `hola@prospecta.mx` son marcadores de posición; no se ha verificado disponibilidad de marca ni de dominio.

## Rebranding, estilo e IA

42. **Nombre: Pórtico** (reemplaza a "Prospecta"). Sigue siendo un marcador: sin búsqueda de marca ni dominio.
43. **Posicionamiento general**: ya no se limita a radio ni a San Luis Potosí. El mensaje cubre todos los canales (radio, espectaculares, redes, Google, portales, referidos, expos, sitio web) y México en general. La ciudad de un desarrollo ya no tiene valor por defecto.
44. **Identidad visual**: tema de plano arquitectónico en lugar de "SaaS verde": vitela fría `#f1f3ef`, grafito `#1c2226`, azul cianotipo `#1f4e8c` como primario, naranja de topógrafo `#f0531c` solo para urgencia, esquinas casi rectas y bordes finos; Bricolage Grotesque en titulares y Geist en el cuerpo. El hero es un plano de lotificación en SVG. Los verdes de éxito (vendido, mensajes) usan esmeralda para no confundirse con el color de marca.
45. **Plan Élite IA ($12,990/mes, 50 usuarios, 500 consultas/mes)**: único plan con IA. Dos funciones: asistente por lead (resumen, temperatura, siguiente paso, borrador de WhatsApp) y análisis de métricas para administradores.
46. **Reglas de la IA**: solo propone, nunca envía; el prompt no incluye teléfono, correo ni apellido; notas y mensajes del lead se tratan como datos no confiables (se neutralizan `<` y `>` y el system prompt prohíbe obedecerlos); un asesor solo analiza sus propios leads; el plan y la cuota mensual (hora de CDMX) se validan antes de llamar al modelo; cada llamada se registra en `ai_usage` (tokens y modelo, sin contenido). Salida estructurada validada con Zod; fallback de seguridad del lado del servidor (`fallbacks: "default"`).
47. **Modelo**: `claude-opus-5-5` por defecto con esfuerzo `low` (tareas cortas); configurable con `AI_MODEL` por si se prefiere uno más barato.

## Pasada de piloto (10 nov 2026)

### D-P1. Formulario público: respuesta neutra, límites compartidos y anti-bots (QA B15/B16)
- `POST /api/public/leads` responde siempre `{ ok: true }` con 200 a todo envío aceptado: lead nuevo, repetido, bot o fuera de límite. Los errores de validación siguen siendo 400 porque no revelan nada sobre clientes existentes y las integraciones los necesitan. El contacto repetido se sigue registrando en el historial del lead.
- Límites en Postgres (`rate_limit_buckets`, UPSERT atómico), no en Redis: ya tenemos la base y no agrega otro servicio que pagar u operar. Si el volumen lo exige, se cambia por Upstash sin tocar las rutas.
- La IP del visitante solo se usa si `TRUSTED_PROXY` dice cómo leerla (`vercel`, `cloudflare` o `xff:N`). Sin eso no hay límite por IP (sería un solo contador compartido por todos, que un atacante podría agotar) y protegen el límite por organización (300/min) y por teléfono (5/h).
- Anti-bots: honeypot + token firmado con tiempo mínimo de llenado (2.5 s) en el formulario hospedado, sin captcha de terceros (sin cookies, sin JavaScript, sin pedir datos a Google/Cloudflare). Los sitios propios del cliente que mandan sin token siguen funcionando; para ellos protegen honeypot y límites. Si aparece abuso real, el siguiente paso es Cloudflare Turnstile.

### D-P2. Baja de asesor y reasignación masiva (QA B17)
- No se puede desactivar a nadie sin decidir a quién pasan sus leads abiertos (o "sin asignar"). Sus tareas pendientes van al heredero; si los leads quedan sin asignar, las tareas pasan al administrador que hizo la baja, para que nadie las pierda de vista.
- Vendidos y perdidos **no** se reasignan (ni en la baja ni en la reasignación masiva): conservan a su asesor para historial y comisiones.
- La reasignación masiva aplica exactamente a los leads que muestran los filtros actuales (mismo `leadWhere` que la lista). El filtro "asesor" ahora incluye a los inactivos, para poder rescatar leads huérfanos de bajas anteriores.
- El acceso termina en la siguiente petición (cada página relee las membresías activas). No se cierran las sesiones de Supabase: la persona puede entrar a la app, pero solo ve el aviso de que fue desactivada y la opción de crear su propia organización.

### D-P3. Alerta de lead frío por etapa (QA B18)
- Un lead con una tarea pendiente cuya fecha aún no llega (cita, llamada agendada) **no** es frío; con una tarea vencida sí. No existe un modelo de "cita" aparte: las citas se registran como tareas.
- Límites sugeridos: Nuevo = la alerta general de la organización (24 h por defecto, velocidad de respuesta); Contactado 72 h; Cita agendada 168 h; Visita realizada 72 h; Cotización 120 h. Cada organización puede cambiarlos en Configuración; vacío = sugerido. Aplicarlos por defecto cambia el conteo de inmediato (en la demo de 5,000 leads pasó de 2,973 a 2,472), y lo preferimos a seguir saturando.
- "Los 5 más urgentes": primero los que nunca se contactaron (más antiguos primero), luego los de último contacto más viejo. El admin ve los de toda la organización; el asesor, solo los suyos.
- Una sola regla (`staleWhere`/`isStale`) para lista, pipeline, ficha, banner, dashboard y resumen diario.

### D-P4. Celular completo (QA B14)
- Menú: botón "Menú" que despliega las 9 secciones en una cuadrícula de 2 columnas y muestra en qué sección estás. Preferimos esto a una barra inferior: con 9 secciones una barra inferior no cabe, y la hamburguesa deja la pantalla libre.
- Tablas: en pantallas menores a 768 px todas las tablas de la app se muestran como tarjetas (cada fila, una tarjeta con su etiqueta). Es un solo CSS global más un componente que copia el encabezado de cada columna; no se tocó cada página (varias tienen cambios sin commitear de planos).
- Pipeline: en celular es una lista por etapa, plegable (queda abierta la primera con leads); en escritorio sigue el tablero horizontal. No se arrastran tarjetas en el celular: se usa el selector "Mover a…".
- Límite conocido: la lista de leads en celular mide ~12,000 px con 50 leads (una tarjeta de 7 líneas por lead). No hay desbordamiento horizontal, pero queda como mejora acortarla.
