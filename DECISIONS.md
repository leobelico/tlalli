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
15. **Nombre comercial provisional: "Prospecta"**. Fácil de cambiar en `src/lib/brand.ts`.

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
