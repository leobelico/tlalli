# Antes del primer piloto

Documento para quien va a poner Pórtico en manos de 2 o 3 desarrolladoras reales. Tiene cuatro partes:

1. [Checklist "Antes del primer piloto"](#1-checklist-antes-del-primer-piloto)
2. [Pasos manuales con credenciales reales, en orden](#2-pasos-manuales-con-credenciales-reales-en-orden) (lo que **no** se pudo probar sin ellas)
3. [Desplegar con `migrate deploy`](#3-desplegar-con-migrate-deploy)
4. [Límites conocidos, en lenguaje de cliente](#4-límites-conocidos-en-lenguaje-de-cliente) (para decírselos a las desarrolladoras tal cual)

Estado verificado: build de producción (`next build` + `next start`) con el recorrido completo de QA, 228 pruebas automáticas, sin errores de lint ni de tipos. Detalle en [REPORTE_QA.md](../REPORTE_QA.md).

---

## 1. Checklist "Antes del primer piloto"

Marca cada punto. Los marcados **(bloquea)** no se deben saltar.

### Lo que sigue pendiente y decide una persona

- [ ] **(bloquea) Aviso de privacidad y términos revisados por un abogado.** Son borradores. Cada desarrolladora necesita su propio aviso (la plataforma les da una plantilla) y un contrato de encargo de datos con ustedes.
- [ ] **(bloquea) Que el aviso de cada desarrolladora mencione a quién se transmiten los datos:** Meta (WhatsApp) y, si usan IA, el proveedor de IA (en EE. UU.).
- [ ] **Marca y dominio.** "Pórtico" y `hola@portico.mx` son marcadores: sin búsqueda de marca ni dominio registrado. Los correos que salen de la plataforma usan ese remitente.
- [ ] **Precios y plan.** Los planes (Básico $1,490 a Élite IA $12,990) son propuestas sin validar. En el piloto nadie paga ni se vence la prueba de 14 días: **cambiar de plan es manual en la base de datos**.
- [ ] **Quién da soporte y por qué canal.** No hay ayuda dentro de la app. Definan un WhatsApp o correo de soporte y una persona responsable; el texto de "Avanzado" en Configuración ya manda a escribir a `hola@portico.mx`.
- [ ] **Reglas del tope de descuento.** Cada organización arranca con 5 % de descuento, tasa de referencia 4 %, enganche mínimo 10 % y plazo máximo 120 meses para asesores. Pregunten a cada desarrolladora cuánto puede dar un asesor sin autorización y ajusten los cinco valores en Configuración antes de entregar. **Ojo:** mensualidades sin intereses cuentan como descuento (ver el límite 6): si la desarrolladora vende "a meses sin intereses" como plan normal, suban la tasa de referencia solo hasta donde su plan estándar siga sin pedir autorización, o pónganla en 0 para no medir el financiamiento.
- [ ] **Quién autoriza.** Alguien con rol Administrador debe revisar "Autorizaciones" a diario: si nadie lo hace, las ventas y descuentos grandes quedan esperando.

### Lo que hay que hacer en el servidor (ver partes 2 y 3)

- [ ] **(bloquea) Confirmar que el trabajo de planos está commiteado.** Al escribir este documento (9 nov 2026) el árbol de trabajo aún lo mostraba sin commitear; si ya lo subiste, tacha este punto tras revisar `git status`. El plano interactivo de lotes (`prisma/migrations/20261106193955_development_plan`, `src/server/services/plans.ts`, `src/app/app/desarrollos/[id]/plan-*.tsx`, `src/app/api/developments/`, `src/lib/plan-shape.ts`, `prisma/plano-layout.ts` y los cambios en `desarrollos/[id]/page.tsx` y `desarrollos/actions.ts`) está **sin commitear**. El build y las pruebas de este recorrido lo incluyeron; un despliegue desde el último commit no.

- [ ] **(bloquea)** Crear el proyecto de Supabase de producción y aplicar las migraciones (parte 3).
- [ ] **(bloquea)** Definir todas las variables de entorno de producción (parte 3, paso 3). En especial `TRUSTED_PROXY`, `CRON_SECRET` (16+ caracteres) y `FORM_TOKEN_SECRET`.
- [ ] **(bloquea)** Pegar la plantilla de recuperación de contraseña en Supabase y fijar la *Site URL* (parte 2, paso 3).
- [ ] **Resend con dominio verificado** para que lleguen las invitaciones, avisos y el resumen diario (parte 2, paso 4).
- [ ] **Programar el resumen diario** (parte 2, paso 5). Hoy el endpoint existe, pero nadie lo llama.
- [ ] **Respaldos.** Activar los respaldos diarios de Supabase y **probar una restauración** una vez. No hay copia propia.
- [ ] **Monitoreo de errores.** No hay (ni Sentry ni equivalente). Mínimo: revisar los logs del hosting cada día durante el piloto.
- [ ] **WhatsApp real** (parte 2, paso 6). Puede tardar días por la verificación de Meta; empiecen cuanto antes y mientras tanto el piloto funciona en modo de prueba.
- [ ] **Llave de IA** solo si venden el plan Élite (parte 2, paso 7).

### Lo que conviene hacer pero no bloquea

- [ ] Que el equipo técnico recorra una vez la app en **dos teléfonos reales** (un iPhone y un Android): solo se probó emulando 390 px.
- [ ] Capacitar a los asesores 30 minutos: crear un lead, cotizar, mover de etapa y qué hacer cuando una solicitud queda "pendiente".
- [ ] Importar la base de prospectos de cada desarrolladora **con ellos presentes** (el archivo debe guardarse como CSV; el sistema ya reconoce los acentos de Excel).
- [ ] Revisar que su sitio o landing envíe los leads al formulario de Pórtico (liga lista en Configuración).

---

## 2. Pasos manuales con credenciales reales, en orden

Esto es lo que **no se pudo verificar** porque requiere cuentas reales. Está en el orden en que conviene hacerlo: cada paso depende del anterior. Después de cada uno hay una prueba de 1 minuto.

### Paso 0. Antes de empezar, reúne
Cuenta de hosting (Vercel u otro con Node 22), proyecto de Supabase de producción, dominio con acceso a su DNS, cuenta de Resend, cuenta de Meta Business (opcional, para WhatsApp), cuenta de Anthropic (opcional, para IA).

### Paso 1. Base de datos y despliegue (parte 3 completa)
Hazla entera. **Prueba:** abre `https://TU-DOMINIO/login`; debe verse la pantalla en español, sin errores.

### Paso 2. Crear la primera organización de prueba
1. Regístrate en `https://TU-DOMINIO/registro` con tu correo.
2. Si Supabase te pide confirmar el correo (en producción lo normal es que sí), confirma y entra.
3. Crea un desarrollo, 3 lotes, una campaña y un lead de prueba.

**Prueba:** el lead aparece en Leads y en el Pipeline.

### Paso 3. Plantilla de recuperación de contraseña y URL del sitio (Supabase)
En el panel de Supabase de producción → *Authentication*:
1. **URL Configuration → Site URL:** `https://TU-DOMINIO` (sin diagonal final). En *Redirect URLs* agrega la misma.
2. **Email Templates → Reset Password:**
   - *Subject:* `Crea tu contraseña nueva en Pórtico`
   - *Body:* copia el contenido de [`supabase/templates/recovery.html`](../supabase/templates/recovery.html).
3. **Importante:** en producción el correo de Supabase sale de su servicio de pruebas con límites muy bajos. Para el piloto configura **SMTP propio** en *Authentication → SMTP Settings* con las credenciales de Resend (host `smtp.resend.com`, puerto `465`, usuario `resend`, contraseña = tu API key, remitente = el de tu dominio verificado).

**Prueba:** cierra sesión → "¿Olvidaste tu contraseña?" → llega el correo **en español**, con botón "Crear contraseña nueva" → abre el enlace **en otro navegador** → crea la contraseña → entras. Si el enlace te manda a `/recuperar` con aviso amarillo, revisa la Site URL.

### Paso 4. Correo de la plataforma con Resend
1. En Resend: *Domains → Add Domain*, agrega tu dominio y copia los registros DNS (SPF y DKIM) a tu proveedor de DNS. Espera a que diga **Verified**.
2. Crea una *API key* con permiso de envío.
3. En el hosting define: `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=...`, `EMAIL_FROM="Pórtico <avisos@TU-DOMINIO>"` y reinicia.

**Prueba:** en Equipo, invita a un correo tuyo → debe llegar "te invitó a …" con botón. Luego crea un lead asignado a otra persona → a esa persona le llega "Nuevo lead asignado". Si no llega: mira *Logs* en Resend y la carpeta de spam. Un fallo de correo **no rompe nada** en la app; solo se registra en los logs.

### Paso 5. Programar el resumen diario
El endpoint es `GET https://TU-DOMINIO/api/cron/daily-digest` con el encabezado `Authorization: Bearer <CRON_SECRET>`. Está cerrado si `CRON_SECRET` mide menos de 16 caracteres. Genera uno largo: `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`.
- **Vercel:** crea `vercel.json` con `{"crons":[{"path":"/api/cron/daily-digest","schedule":"0 14 * * *"}]}` (08:00 hora del centro de México). Vercel manda solo el encabezado `Authorization` con el valor de la variable `CRON_SECRET`.
- **Otro hosting:** un programador externo (GitHub Actions, cron-job.org) que haga la llamada una vez al día.

**Prueba:** `curl -s -H "Authorization: Bearer TU_SECRETO" https://TU-DOMINIO/api/cron/daily-digest` debe responder `{"ok":true,"sent":N,...}`; sin el encabezado, `401`. Para que `sent` sea mayor que 0 debe haber alguien con tareas vencidas o leads fríos.

### Paso 6. WhatsApp real (opcional para el piloto, lento por Meta)
Sigue [`docs/WHATSAPP.md`](WHATSAPP.md) de principio a fin. Resumen del orden:
1. Verificar el negocio en Meta Business (días).
2. Crear la App, agregar WhatsApp y usar primero el **número de pruebas** que da Meta (gratis, solo escribe a números que tú registres).
3. Copiar `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, inventar `WHATSAPP_VERIFY_TOKEN`, poner `WHATSAPP_PROVIDER=cloud` y reiniciar.
4. Registrar el webhook `https://TU-DOMINIO/api/webhooks/whatsapp` en Meta (verifica con el token).
5. En la organización, en *Configuración → Avanzado*, guardar el identificador del número.
6. Pedir la aprobación de las 4 plantillas con el mismo nombre que en `src/server/whatsapp/templates.ts` (puede tardar horas o días).

**Prueba:** desde un celular escribe al número → el lead aparece en el CRM con el mensaje. Luego, desde la ficha, responde (dentro de las 24 h) → llega al celular. Mientras Meta no apruebe las plantillas, solo se puede contestar a quien escribió primero.
**Esto nunca se probó contra Meta real**: es la parte con más riesgo de sorpresas.

### Paso 7. IA (solo plan Élite)
1. Crea la API key en la consola de Anthropic y define `ANTHROPIC_API_KEY` (y `AI_MODEL` si quieres uno más barato).
2. Pasa la organización a Élite (hoy a mano en la base: `update organizations set plan='ELITE' where slug='...'`).
3. En la ficha de un lead, "Analizar este lead".

**Prueba:** devuelve resumen, temperatura y siguiente paso en español, sin pedir teléfono ni correo. **Nunca se probó contra la API real**: revisen calidad, costo por consulta y tiempo de respuesta con 10 leads reales antes de venderla.

### Paso 8. Prueba de humo final con dos organizaciones
Crea dos organizaciones con dos correos distintos y confirma que **ninguna ve los datos de la otra** (Leads, Pipeline, una URL de lead copiada de la otra, y el PDF de una cotización). Esta separación es lo más importante del producto y ya pasó todas las pruebas, pero se repite una vez en el entorno real.

---

## 3. Desplegar con `migrate deploy`

Las migraciones crean las tablas, los permisos y la **seguridad por organización** (RLS). **Nunca uses `migrate dev` ni `db:reset` en producción** (borran datos) y **nunca ejecutes el seed**: está pensado solo para la base local.

1. **Crea el proyecto de Supabase** (región cercana: us-east o equivalente). Guarda la contraseña de la base.
2. **Obtén dos cadenas de conexión** (*Project Settings → Database*):
   - **Directa** (puerto 5432) → será `DIRECT_URL`. Solo para migrar.
   - **Pooler de transacciones** (puerto 6543) → será `DATABASE_URL`, agregando `?pgbouncer=true` al final.
3. **Variables de entorno en el hosting** (ninguna con `NEXT_PUBLIC_` salvo las dos primeras; **no definas `SUPABASE_SERVICE_ROLE_KEY` en producción**):

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | del proyecto (la anon key es pública por diseño) |
   | `DATABASE_URL` | pooler 6543 + `?pgbouncer=true` |
   | `APP_URL` | `https://TU-DOMINIO` (sin diagonal final) |
   | `TRUSTED_PROXY` | `vercel` en Vercel (si no la defines y el hosting es Vercel, se usa sola), `cloudflare` tras Cloudflare, o `xff:N` si tienes N proxies. **Con otro hosting y sin esto no hay límite por IP**: el formulario público se protege solo con límites por carril (ver abajo), que un solo origen puede agotar para los demás scripts, nunca para quien usa el formulario alojado |
   | `CRON_SECRET` | 16+ caracteres aleatorios |
   | `FORM_TOKEN_SECRET` | 32+ caracteres aleatorios |
   | `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY` | ver paso 4 |
   | `WHATSAPP_PROVIDER` (`mock` mientras no haya número real), `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_API_VERSION` | ver paso 6 |
   | `ANTHROPIC_API_KEY`, `AI_MODEL` | solo con IA |

4. **Aplica las migraciones desde tu computadora o desde CI**, con la conexión **directa**:
   ```bash
   DIRECT_URL="postgresql://postgres:CONTRASEÑA@db.XXXX.supabase.co:5432/postgres" npx prisma migrate deploy
   ```
   Debe terminar con `All migrations have been successfully applied.` (hoy son 11 migraciones).
5. **Verifica** en el editor SQL de Supabase:
   ```sql
   select rolname from pg_roles where rolname = 'app_rls';                       -- debe devolver 1 fila
   select count(*) from pg_policies where policyname = 'tenant_isolation';        -- debe ser mayor que 0
   select indexname from pg_indexes where indexname = 'leads_one_hold_per_unit';  -- debe devolver 1 fila
   ```
   Si el rol `app_rls` no existe, la migración no tuvo permisos para crearlo: no sigas, la separación entre organizaciones depende de él.
6. **Construye y publica:** el hosting ejecuta `npm run build` y luego `npm start`. Si lo haces tú: `npm ci && npm run build && npm start` (puerto 3010 por defecto; el hosting suele fijar el suyo).
7. **Cada actualización futura:** primero `migrate deploy`, luego publicar el código. Nunca al revés si la versión nueva usa columnas nuevas.
8. Continúa en la parte 2 (pasos 2 a 8).

**Cabeceras de seguridad (QA2 B39).** La aplicación ya manda `Content-Security-Policy` (sin permitir que la metan en un marco, sin `<object>`, formularios y conexiones solo al mismo sitio), `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`. **`Strict-Transport-Security` (HSTS) lo debe poner el hosting o el proxy**, porque solo tiene sentido detrás de HTTPS real: en Vercel actívalo en *Settings → Security* o con un bloque `headers` en `vercel.json` (`max-age=31536000; includeSubDomains`); tras Cloudflare, en *SSL/TLS → Edge Certificates → HSTS*. Verifícalo con `curl -sI https://TU-DOMINIO/login | grep -i strict-transport`. Limitación conocida: `script-src` conserva `'unsafe-inline'` porque Next.js inyecta scripts de arranque y aún no usamos nonces; el resto de la política es lo que corta los ataques prácticos.

**Formulario incrustado en otra página.** Por defecto nadie puede mostrar `/f/TU-ORGANIZACION` dentro de su sitio. El administrador agrega los sitios permitidos en *Configuración → Avanzado → Mostrar tu formulario dentro de otra página* (uno por línea, con `https://`); la respuesta del formulario trae entonces `frame-ancestors` con solo esos sitios. El cambio puede tardar hasta 30 segundos en verse.

**Límites del formulario público.** Por IP: 20 por minuto si el hosting identifica al visitante. Por organización, dos carriles separados: quien usa el formulario alojado (con su marca firmada) 200 por minuto; todo lo demás (sitios propios con la llave, scripts) 60 por minuto. Cada marca del formulario sirve máximo 3 envíos. Por teléfono: 5 por hora. Un script que sature el carril "todo lo demás" no deja sin formulario a las personas reales.

**Dónde se cae con más frecuencia:** (a) `APP_URL` con diagonal final o distinto del dominio real: los enlaces de invitación salen mal; (b) `DATABASE_URL` sin `?pgbouncer=true`: errores de "prepared statement" bajo carga; (c) `CRON_SECRET` corto: el resumen diario responde 401 siempre (en la máquina de desarrollo mide 15 caracteres: necesita uno nuevo).

---

## 4. Límites conocidos, en lenguaje de cliente

Estas frases están pensadas para entregarlas tal cual a las desarrolladoras del piloto.

**Lo que ya puedes hacer:** registrar leads por formulario, a mano o desde Excel; ver de qué campaña viene cada uno y cuánto cuesta cada prospecto; moverlos por etapas con confirmación y "Deshacer"; cotizar con PDF; apartar y vender lotes sin que dos asesores se pisen; que los descuentos grandes los autorice un administrador; recibir avisos por correo de los leads nuevos y un resumen diario.

**Lo que todavía no hace o hace a medias:**

1. **No cobra.** Durante el piloto no pagas ni se vence tu prueba; cambiar de plan lo hace nuestro equipo a mano. Tampoco emite factura.
2. **WhatsApp:** hasta que conectemos tu número de WhatsApp Business los mensajes no salen de verdad. Conectarlo depende de que Meta verifique tu empresa y apruebe los mensajes, y puede tardar de unos días a un par de semanas. Fuera de las 24 horas desde el último mensaje del cliente, WhatsApp solo permite mensajes predefinidos.
3. **El asistente de IA** (plan Élite) todavía no se ha probado con conversaciones reales. Úsalo como apoyo, no como verdad; solo propone, nunca envía nada solo.
4. **Los avisos llegan por correo**, no por WhatsApp ni notificación en el teléfono. Si un asesor no revisa su correo, no se entera. Pídeles que lo tengan abierto en el celular.
5. **Cada asesor ve solo sus leads.** Si dos asesores capturan el mismo teléfono, el sistema lo detecta y avisa al administrador, pero no reasigna solo.
6. **El tope de descuento es uno para todos los asesores** de tu empresa (no por persona ni por desarrollo). Además del descuento en pesos, cuenta lo que vale darle al cliente mensualidades sin intereses o a plazos muy largos (medido con una tasa de referencia que tú defines). También hay un enganche mínimo, una tasa mínima y un plazo máximo para asesores. Lo que se salga de cualquiera de esos límites queda esperando a un administrador: **si nadie lo revisa, el cliente espera.** Un administrador no tiene estos límites.
7. **Un asesor no puede registrar una venta si el cliente no tiene un lote ligado.** Se liga cotizando o en "Editar datos".
8. **Cotizador:** solo calcula financiamiento directo (enganche y mensualidades). No incluye crédito Infonavit, Fovissste ni bancario, ni pagos extraordinarios.
9. **No lleva la cobranza ni las etapas posteriores a la venta** (contrato, mensualidades pagadas o vencidas, escrituración, entrega) **ni comisiones.**
10. **Importar desde Excel:** guarda el archivo como CSV. Hasta 2,000 filas por archivo. Si una fila tiene el correo mal escrito, el prospecto se importa sin correo y te avisamos. Las exportaciones de Facebook Lead Ads se reconocen; las de portales inmobiliarios todavía no. **Aún no puedes exportar tus datos a Excel desde la app**; si los necesitas, pídenoslos.
11. **Plano de lotes:** hay que subirlo como imagen (PNG, JPG o WebP), no como PDF.
12. **En el celular** todo funciona sin deslizar de lado, pero la lista de leads es muy larga (una tarjeta por prospecto). Para encontrar a alguien usa el buscador.
13. **Pipeline con muchos leads:** muestra los 150 más recientes de cada etapa; usa los filtros para ver el resto.
14. **Seguridad de tus datos:** cada empresa solo ve lo suyo (probado con intentos de saltarse la separación). Aun así, aún no hay verificación en dos pasos ni registro de quién hizo cada cambio, y la app todavía no ha tenido una revisión de seguridad externa.
15. **Derechos ARCO:** si un prospecto te pide borrar sus datos, el botón "Eliminar lead y su historial" lo hace; aún no hay una pantalla para entregarle una copia de sus datos ni constancia del borrado.
16. **Respaldos y soporte:** haremos respaldos diarios, pero durante el piloto el soporte es por correo o WhatsApp en horario laboral, no 24 horas.

17. **Primer día:** en el Inicio de una empresa nueva aparece "Empieza aquí" con cuatro pasos (crear tu primer desarrollo, importar tus leads, invitar a tus asesores, definir tu tope de descuento). Desaparece solo al terminar los cuatro; el último se marca la primera vez que guardas la configuración.
18. **Reasignar muchos leads a la vez** pide confirmación diciendo cuántos se mueven, y tienes 10 segundos para deshacerlo. Los vendidos y perdidos nunca se mueven.
19. **Deshacer un cambio de etapa** solo sirve para el último cambio de ese cliente, los 10 segundos siguientes. Si alguien más ya tomó el lote, no se deshace y se te explica por qué.
20. **Tu formulario en otra página:** por seguridad nadie puede mostrar tu formulario dentro de su sitio. Si quieres ponerlo en tu página, tu administrador escribe el sitio en Configuración → Avanzado; el cambio puede tardar hasta 30 segundos.
