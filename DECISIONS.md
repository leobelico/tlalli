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

### D-P5. Tope de descuento por organización y cola de autorización (pilotos, punto 5)
- El tope vive en `organizations.max_asesor_discount_pct` (entero 0–100, por defecto 5) y se edita en Configuración. 0 significa que ningún descuento se da sin autorización. Solo el administrador lo cambia.
- Si un asesor excede el tope al cotizar, o intenta registrar una venta por debajo de lista menos el tope, **no hay error**: se crea una solicitud `PENDIENTE`, se avisa por correo a todos los administradores activos y el asesor ve un aviso amarillo (no rojo) que dice dónde seguirla ("Autorizaciones"). La acción original no se ejecuta.
- Una solicitud idéntica (mismo asesor, tipo, cliente, unidad y montos) no se duplica ni vuelve a mandar correo mientras siga pendiente.
- Al autorizar, la acción se ejecuta de inmediato con permisos del administrador: la cotización queda **a nombre del asesor** con el descuento pedido (y mueve al cliente a Cotización); la venta se registra como venta del cliente. Se avisa al asesor por correo con el enlace. Si algo cambió mientras tanto (p. ej. el lote ya se vendió), la autorización falla con un mensaje claro y la solicitud sigue pendiente. Al rechazar, el administrador puede escribir una nota que el asesor lee.
- Una solicitud no se puede resolver dos veces (se "reclama" antes de ejecutar); si la ejecución falla, se libera.
- Venta de un asesor **sin unidad ligada** sigue siendo un error (no hay precio de lista contra qué comparar), no una solicitud.
- Fuera de alcance por ahora: escalar solicitudes olvidadas, límites distintos por asesor o por desarrollo, y autorizar cancelaciones/liberación de lotes (siguen siendo solo del administrador).

### D-P6. Sin jerga de WhatsApp/Meta para el cliente (pilotos, punto 6)
- Configuración muestra al cliente: nombre, alerta de frío, descuento máximo, límites por etapa y **"Tu formulario de contacto"** (una liga lista para compartir, `/f/<slug>`, con `?c=CODIGO` para marcar campaña). Todo lo técnico quedó en un solo bloque plegado **"Avanzado: WhatsApp y conexión con tu sitio web"**, escrito en español, que dice que normalmente lo configura el equipo de Pórtico y da el correo de soporte.
- Los datos del número de WhatsApp se guardan con su propia acción (`updateWhatsAppSettings`); guardar la configuración general ya no puede borrarlos (antes los ponía en nulo si faltaban en el formulario).
- Mensajes de WhatsApp: "plantilla aprobada" → "mensaje predefinido"; las variables `{{1}} {{2}}` nunca se ven (un campo vacío aparece como `[Nombre del prospecto]` en la vista previa); el estado del encabezado explica en palabras si puede escribirle libremente o solo con un mensaje predefinido.
- No se tradujeron los textos del código ni de `docs/WHATSAPP.md` (los usa el equipo técnico); "plantilla" sigue apareciendo en los botones "Enviar plantilla".

### D-P7. Confirmar y deshacer el cambio de etapa (pilotos, punto 7)
- Cada cambio de etapa (selector de la ficha, "Mover a…" del pipeline y arrastrar) pide confirmación diciendo "de X a Y". Pasar a **Vendido** o **Perdido** conserva su diálogo propio (pide monto o motivo), que ya funciona como confirmación.
- Después de mover, un aviso ofrece **Deshacer** con cuenta regresiva de 10 s y desaparece solo. El servidor lo permite hasta 30 s para absorber latencia.
- "Deshacer" es de verdad, no solo "mover de regreso": restaura la etapa, las fechas de primer y último contacto (avanzar de etapa las había marcado como contactado), el motivo de pérdida, el monto/fecha de venta y el estatus del lote. Se guarda una foto del estado anterior en `lead_stage_events.undo_snapshot`.
- Reglas: solo quien hizo el cambio puede deshacerlo; solo si es el último cambio de ese lead; una sola vez; deja constancia en el historial ("Se deshizo el cambio…") y un evento compensatorio que ya no se puede deshacer. Si alguien más cambió el lote en esos segundos, el lote no se toca.
- No cubre: deshacer cambios de etapa que ocurren por otras vías (cotizar mueve a Cotización; el apartado automático), ni cambios hechos antes de esta versión (no tienen foto).

### D-P8. Base de datos de pruebas separada (QA B26, pilotos punto 8)
- `npm test` corre contra `inmobiliaria_test` en el mismo Postgres local (se deriva de `DATABASE_URL`; se puede fijar con `TEST_DATABASE_URL`). Una base aparte en el mismo servidor, y no otro servidor ni un contenedor nuevo, para no pedirle nada más a quien desarrolla: Supabase local ya está arriba.
- `tests/global-setup.ts` la crea si falta, aplica todas las migraciones y la **vacía** (TRUNCATE) antes de cada corrida, así que ninguna prueba depende de datos viejos ni deja basura.
- Salvaguardas porque vacía datos: se niega a correr si la base no se llama `*_test`, y si no es una `TEST_DATABASE_URL` explícita exige que el servidor sea local.
- Las ~14 organizaciones basura que las pruebas dejaron antes en la base de desarrollo **no se borraron** (no se puede distinguir con certeza de datos tuyos, p. ej. "Leonardo"); desaparecen con `npm run db:reset && npm run db:seed`.

### D-Q1. Deshacer revisa quién tiene el lote y lo reconcilia en un solo paso (QA2 B31, B35)
- El estado de un lote es una consecuencia de quién lo tiene (un lead en Apartado o Vendido sobre ese lote). Antes, Deshacer comparaba solo el estado del lote con el que dejó el cambio; si el lead se movió a otro lote o alguien más apartó el original, liberaba un lote ajeno y dejaba otro apartado sin dueño.
- Ahora cada cambio de etapa, cada edición de unidad del lead y cada Deshacer bloquean primero el lead y luego sus lotes (en orden de id, para que dos operaciones nunca se esperen entre sí). Dentro de la misma transacción, Deshacer restaura el lead y **recalcula cada lote involucrado** a partir de sus titulares reales; un lote que otro cliente tiene no se toca. Si volver atrás significaría recuperar un lote que otro cliente ya apartó, se niega con "ya fue apartada por otro cliente" y no cambia nada.
- El índice único `leads_one_hold_per_unit` sigue siendo la última barrera; su violación se traduce en todas las rutas (cambio de etapa, edición de unidad, Deshacer) a "La unidad ya fue apartada por otro cliente."
- **B33 se revisó y era una falsa alarma**: el inventario ya rechazaba liberar a mano un lote apartado o vendido (QA B01), con el nombre del cliente en el mensaje. No hay cambio de código; se agregó una prueba de regresión. La forma correcta de liberar es cambiar la etapa del cliente (p. ej. a Perdido o Cotización), lo que además invalida cualquier "Deshacer" anterior de ese lead.

### D-Q2. Descuento equivalente y mínimos para asesores (QA2 B32)
- Fórmula: `VP = enganche + Σ pago_k / (1 + r/12)^k` y `descuento equivalente = precio de lista − VP`, con `r` la **tasa de referencia** de la organización y pagos a fin de mes. Con intereses iguales a `r` coincide con el descuento explícito; mensualidades sin interés o plazos largos lo hacen mayor. Se compara con el tope (% del precio de lista) y se pide autorización si lo supera. También se compara el descuento explícito por separado, para que una tasa alta no esconda un descuento grande.
- Valores por defecto: tasa de referencia **4 %**, enganche mínimo **10 %**, tasa mínima **0 %**, plazo máximo **120 meses**. Elegí 4 % para que el plan estándar (20 % de enganche, 24 meses, sin intereses, sin descuento) siga sin pedir autorización (≈3 % equivalente), pero 360 meses sin enganche ni intereses (≈44 %) sí. Cada organización lo ajusta en Configuración; con tasa de referencia 0 el financiamiento deja de medirse.
- Quien exceda cualquiera de los límites no recibe un error: la cotización se convierte en una solicitud pendiente (misma cola que el descuento) con el motivo escrito. Los administradores no tienen estos límites. Las ventas siguen usando el tope sobre el monto.
- Consecuencia asumida: una cotización con descuento justo en el tope y mensualidades sin intereses ya necesita autorización (el financiamiento gratis vale extra). Dos pruebas viejas que fijaban "descuento exacto en el tope pasa" se corrigieron para cotizar con intereses a la tasa de referencia.
- El formulario del cotizador avisa en vivo "Necesita autorización de un administrador: …" con la misma función que usa el servidor.

### D-Q3. Solicitudes pendientes al dar de baja a un asesor (QA2 B36)
- Con heredero: las solicitudes de autorización pendientes pasan a su nombre (igual que los leads y las tareas). Sin heredero ("Dejar sin asignar"): se cierran como **Rechazada** con la nota "Cancelada automáticamente: … fue dado de baja", y el mensaje de la baja dice cuántas se cancelaron. No agregué un estado "Cancelada" para no migrar el enum por un caso raro; la nota lo distingue.
- Al aprobar cualquier solicitud, la cotización queda a nombre de quien la pidió **si sigue activo**; si no, del dueño actual del lead; si tampoco hay, del administrador que aprueba. El correo de respuesta va a esa misma persona.

### D-Q4. Límites por IP seguros por defecto, carriles por organización y CSP (QA2 B34, B39)
- **IP del visitante.** Sin `TRUSTED_PROXY`, si el proceso corre en Vercel (variable `VERCEL=1`, la plataforma que documenta la guía de despliegue) se confía en `x-vercel-forwarded-for`, que pone el borde de Vercel y no el visitante. En otro hosting sin configurar se falla de forma segura: no se lee ningún encabezado reenviable (cualquiera puede escribirlo) y solo quedan los límites por carril, por marca y por teléfono. `TRUSTED_PROXY=none` sigue desactivándolo a propósito.
- **Carriles por organización.** El límite único de 300/min permitía que un solo script agotara el formulario de todos. Ahora hay dos carriles: formulario alojado (envío con marca firmada válida) 200/min, y todo lo demás 60/min. Inundar el segundo no afecta al primero. Una marca firmada sirve para 3 envíos en 24 h (cubre errores de captura y reenvíos, no la reutilización masiva); la marca es de un solo origen de confianza porque solo la entrega la página `/f/…`.
- **Límite de este diseño**: un script puede, a base de pedir marcas nuevas a la página del formulario, usar el carril alojado; cada marca exige además 2.5 s de "llenado", y con IP identificada (Vercel/Cloudflare/`xff:N`) el límite por IP lo frena. Sin IP identificada eso no se puede cerrar del todo; por eso la guía recomienda siempre definir `TRUSTED_PROXY`.
- **CSP.** `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. `'unsafe-inline'` en scripts porque Next.js inyecta scripts de arranque y no se usan nonces todavía (documentado como límite). Se omite en `/api/*` para que el visor de PDF del navegador no se rompa por `object-src`. HSTS queda a cargo del hosting (docs/PILOTO.md).
- **Formulario incrustable solo donde el cliente lo permita.** Nueva columna `organizations.form_embed_origins` (lista de orígenes `https://…`, vacía = nadie). El proxy responde en `/f/*` con `Content-Security-Policy: frame-ancestors <orígenes>` (o `'none'` + `X-Frame-Options: DENY` si no hay). Las demás rutas siguen con `DENY`. Se consulta la base una vez cada 30 s por organización.

### D-Q5. Guía del primer día y reasignación masiva con confirmación y Deshacer (QA2 B38, B37)
- **Guía (B38).** Solo para administradores; cuatro pasos: crear desarrollo, importar leads, invitar asesores, definir el tope de descuento. Cada paso se marca solo cuando la cosa existe (hay un desarrollo, hay un lead, hay otro miembro o una invitación sin revocar). El tope no tiene un valor "vacío" (el predeterminado es 5 %), así que se agregó `organizations.discount_policy_set_at`, que se llena la primera vez que el administrador guarda la configuración; guardar solo nombre y horas no cuenta. La guía desaparece al completar los cuatro y no se puede cerrar antes: es corta y sale del tablero cuando ya no hace falta. Las organizaciones que ya existían verán el paso del tope pendiente hasta que guarden su configuración una vez.
- **Reasignación masiva (B37).** Pedí confirmación **siempre**, no solo sin filtros: el cambio mueve de golpe muchos leads y a quienes los trabajaban; con o sin filtros el costo de equivocarse es parecido. El diálogo dice cuántos leads abiertos se mueven y a quién, y si son los de los filtros o todos los de la organización. Después hay "Deshacer" 10 s (30 s en el servidor), basado en la tabla `reassignment_batches` (dueño anterior de cada lead). Deshacer solo toca los leads que siguen donde la reasignación los dejó; los que alguien movió otra vez se cuentan como "no se tocaron". Solo quien lo hizo, una sola vez.

### D-Q6. Tiempo de respuesta del formulario público (QA2 B43)
- Toda respuesta aceptada (lead nuevo, teléfono que ya existía, envío descartado por bot o por límite) espera hasta un piso de 150 ms (más 0–20 ms al azar) antes de salir. La diferencia que se medía (8–11 ms) quedaba por debajo de ese piso. Cuesta 150 ms a quien llena el formulario, que no lo nota; las respuestas de error (400/401/413/429) no esperan.
