# Reporte QA — Pórtico (CRM inmobiliario)

Fechas: 9 nov 2026 (auditoría y primeras correcciones) y 10 nov 2026 (pasada de piloto, verificada sobre el **build de producción**) · Entorno: local (`next dev` en :3010, Supabase local, proveedor de WhatsApp **simulado**, sin llave de IA) · Navegador: Chromium 141 vía Playwright, 1280×800 y 390×844.
Evidencia: capturas en `qa/capturas/` (136 archivos), scripts reproducibles en `qa/scripts/`, CSV de prueba en `qa/csv/`, salidas de lint/typecheck/tests en `qa/*.txt`, y de cada regresión completa en `qa/run2/` (pasada 1, `next dev`) y `qa/run3/` (pasada de piloto, **`next build` + `next start`**; se repite con `QA_BASE=http://localhost:3300 bash qa/run-all.sh`).

---

## 0. Estado actual (pasada de piloto, 10 nov 2026)

**Objetivo de esta pasada:** dejar el producto listo para un piloto acompañado con 2 o 3 desarrolladoras reales. Se trabajó en el orden pedido, con la prueba escrita primero, un commit por punto y el reporte actualizado en cada uno. Luego se repitió **todo** el recorrido de QA sobre el **build de producción** (`next build` + `next start`), no sobre `next dev`.

| # | Punto | Resultado | Commit |
|---|---|---|---|
| 1 | B15, B16: formulario público neutro, límites compartidos, anti-bots | ✅ | `9526f84` |
| 2 | B17: baja con heredero + reasignación masiva | ✅ | `afc092c` |
| 3 | B18: alerta de frío por etapa, sin leads con cita o tarea, "5 más urgentes" | ✅ | `9854dea` |
| 4 | B14: celular completo (menú, tarjetas, pipeline por etapa) | ✅ | `e67f63e` |
| 5 | Tope de descuento por organización y cola de autorización | ✅ | `27edd5e` |
| 6 | Sin jerga de WhatsApp/Meta (bloque "Avanzado" plegado) | ✅ | `b133bb1` |
| 7 | Confirmar el cambio de etapa y "Deshacer" 10 s | ✅ | `db33e69` |
| 8 | B26: base de datos de pruebas separada | ✅ | `1904bc4` |
| 9 | Verificación sobre el build de producción + pasos manuales | ✅ (con límites, ver abajo) | `69851d0` y este reporte |
| 10 | Checklist, límites en lenguaje de cliente y despliegue | ✅ | [docs/PILOTO.md](docs/PILOTO.md) |

**Lo que verificó la regresión sobre producción (27 pasos de navegador y de API, todos con código de salida 0, además de lint, tipos y pruebas; el contenido de cada paso se leyó contra lo esperado, no solo el código de salida):**
- Lint 0 errores, typecheck sin errores y **228 pruebas automáticas** pasando contra su propia base `inmobiliaria_test` (al correr la suite, la base de desarrollo no cambió: 20 organizaciones y 10,114 leads antes y después).
- **Un commit limpio por sí solo:** una copia de HEAD *sin* el trabajo de planos que sigue sin commitear compila, pasa lint y 220 pruebas (las 8 de diferencia son los tests de planos).
- Aislamiento entre organizaciones (URL, API, IDs sustituidos en 8 acciones, cookie `org_id` falsificada), permisos de asesor repitiendo peticiones de administrador y **ausencia de secretos en el JavaScript del build de producción** (21 archivos, 1 MB): todo igual de sólido.
- Cola de autorización de punta a punta, deshacer, baja con heredero, sin internet, formulario hospedado con humano real, recuperación de contraseña desde otro navegador, 10 secciones del menú y 15 páginas sin desplazamiento horizontal a 390 px, jerga ausente con "Avanzado" plegado.
- Comprobaciones propias de producción (`qa/scripts/prod-checks.mjs`): sin cabecera `x-powered-by`, sin restos de modo desarrollo, 404 y errores en español sin detalles técnicos, cookie de sesión `HttpOnly`+`Secure`+`SameSite=Lax`, resumen diario protegido (401 sin secreto o con uno incorrecto; 200 con el correcto, envió 12 resúmenes) y formulario público con la misma respuesta para teléfonos nuevos y existentes.

**Hallazgos nuevos de esta pasada (B28–B30 en la tabla):**
- **B28 (media, resuelto):** en producción la cookie de sesión de Supabase salía **sin `HttpOnly` ni `Secure`**: legible por cualquier script de la página y enviada por http plano. Se endureció (`69851d0`).
- **B29 (baja, abierto):** justo después de **registrarse**, el build de producción deja 3 precargas internas de `/app` con la respuesta abierta; no ocurre al recargar, al volver a entrar ni con usuarios existentes. La app funciona normal, pero no se investigó la causa a fondo (ver detalle en la tabla).
- **B30 (alta de configuración, abierto para ti):** el `CRON_SECRET` de tu `.env.local` mide **15 caracteres** y el resumen diario exige 16 o más: con ese valor el endpoint responde 401 siempre. Genera uno nuevo para producción.
- **Puerto 3010 bloqueado por Windows:** tras reiniciar, Windows reservó el rango 2957–3056 y `npm run dev` falla con `EACCES`. Para esta pasada corrí en el 3300 (las pruebas aceptan `QA_BASE`). Se arregla reiniciando el servicio `winnat` con permisos de administrador o reiniciando la máquina.

**Qué NO se pudo verificar sin credenciales reales (pasos en [docs/PILOTO.md](docs/PILOTO.md), parte 2):** WhatsApp contra Meta (ni con el número de pruebas), Resend real (el proveedor solo se probó contra una llamada simulada y contra Mailpit local), la plantilla de recuperación y la *Site URL* en el Supabase de producción, el resumen diario programado en un hosting, y la IA contra la API real. Tampoco se probó en un hosting real ni con teléfonos reales.

**Sigue sin resolver y fuera de lo pedido:** B19, B20, B22–B25, B27, la exportación a Excel, el apartado con vencimiento y todo lo que el usuario excluyó a propósito (Infonavit, comisiones, CFDI, cobro, portales y etapas posteriores a la venta).

**Decisiones tomadas ante ambigüedades** están en [DECISIONS.md](DECISIONS.md) (secciones D-P1 a D-P8).

---

## 0b. Pasada 1: bugs bloqueantes y altos (9 nov 2026)

Se corrigieron todos los bugs **bloqueantes y altos** (B01–B07) y los 5 primeros cambios del plan (secc. 7), en 7 commits con prueba escrita primero. Después se repitió todo el recorrido con organizaciones nuevas. Lo que quedó **sin resolver** se marca ❌ abajo, sin maquillar.

| Commit | Qué arregla |
|---|---|
| a1a7d56 | B01, B02, B03: inventario y apartados |
| 3526bcf | B04, B05: tope de descuento y ventas por debajo de lista |
| 275389d | B06: caída de internet |
| 0b01e22 | B07, B08, B09, B13: importación CSV y teléfonos |
| b02bd32 | B10, B11, B12, B21: español, 404/errores, permisos |
| 428d0e9 | Plan 3: correos de invitación, aviso de lead nuevo, resumen diario |
| e00ac18 | Plan 3: "Olvidé mi contraseña" (correo en español) |

**Resultado de la regresión:** lint 0 errores; typecheck sin errores; **190 de 190 pruebas pasan** (eran 141; 49 nuevas). Recorridos de navegador: signup, inventario, equipo y leads, CSV (8 archivos), apartado, asesor y cotizaciones, venta, aislamiento entre organizaciones, manipulación de IDs, roles, secretos en el cliente, WhatsApp simulado, 5,000 leads, sin internet, baja de asesor y recuperación de contraseña. Salidas completas en `qa/run2/`.

**Siguen sin cambio (sí se re-verificaron):** aislamiento entre organizaciones, permisos por rol y ausencia de secretos en el cliente (los tres siguen bien).

**Veredicto actualizado:** el riesgo de corrupción del inventario y de dinero (B01–B05) ya está cubierto. **Todavía no lo pagaría** por: WhatsApp real e IA sin probar, sin cobro/CFDI, menú del celular incompleto (B14), baja de asesor que deja leads huérfanos (B17), alerta de "frío" que satura (B18) y endpoint público que delata teléfonos (B15, B16).

**Lo que quedó fuera del alcance pedido (no se tocó):** B14–B20, B22–B25, B27 y los cambios 6–10 del plan.

**Límites y decisiones de las correcciones que conviene conocer:**
- El tope de descuento del asesor es **fijo en 5 %** (`src/lib/policy.ts`); no es configurable por organización ni hay cola de aprobación: el asesor recibe el mensaje "pide a un administrador". Un asesor tampoco puede registrar una venta sin unidad ligada (cambio de reglas: hay que ligarla en "Editar datos" o cotizarla).
- La restricción "un cliente por lote" es un **índice parcial en la base de datos** (`prisma/migrations/20261109120000_one_hold_per_unit`). Prisma no puede describirlo en `schema.prisma`, así que un `prisma migrate dev` podría marcarlo como diferencia; usar `migrate deploy`.
- Correos: `EMAIL_PROVIDER=mock` por defecto (no envía nada). `mailpit` es para desarrollo y **`resend` solo se probó contra un `fetch` simulado, nunca contra el servicio real**. El resumen diario existe como `GET /api/cron/daily-digest` (requiere `CRON_SECRET` de al menos 16 caracteres), pero **nadie lo programa todavía**: falta configurar el cron en el hosting. No hay aviso por WhatsApp ni notificación push.
- Recuperar contraseña usa el correo de Supabase Auth con plantilla en español (`supabase/templates/recovery.html`). **Hay que pegar el mismo asunto y cuerpo en el panel de Supabase en producción** y fijar la *Site URL*. Para probarlo reinicié Supabase local (`supabase stop/start`; los datos se conservaron). Aprendizaje: el flujo estándar de Supabase (PKCE) falla si el enlace se abre en otro navegador que el que lo pidió, por eso se usa `token_hash`.
- Se cambió `tests/dashboard.test.ts` a propósito: su venta sin unidad hecha por un asesor ya no es válida (B04). También `tests/lead-import.test.ts` (B08).
- Mi primera medición de rendimiento en la regresión fue inválida (apuntaba a una organización antigua); se corrigió y repitió. En esa repetición las filas de asesor no son comparables (el usuario ya estaba dado de baja), por eso la tabla de abajo solo informa al administrador.
- No probé en esta ronda: el aviso de lead nuevo ni el resumen diario con un proveedor real, el correo de invitación abierto en un cliente de correo, ni nada de lo que ya estaba como "no probado" más abajo.

## 1. Veredicto (director comercial, SLP, 3 fraccionamientos, 8 asesores)

> **Actualización tras la pasada de piloto:** el veredicto de abajo es el de la auditoría original (9 nov). Hoy: **sí a un piloto acompañado con 2 o 3 desarrolladoras**, con WhatsApp en modo de prueba hasta que Meta apruebe el número, soporte cercano y alguien que revise "Autorizaciones" a diario. **Todavía no a vender abierto:** falta cobro, las integraciones reales (Meta, Resend, IA) nunca se probaron, y faltan lo que el negocio dejó para después de los pilotos (Infonavit, comisiones, post-venta). Ya no pone en riesgo dinero ni inventario, el celular funciona completo y un asesor que se va deja de ser un problema. Lo que cambia mi respuesta a "¿lo pagaría?": de *no* a *lo probaría con mi equipo un mes*, si soporte me contesta rápido.


1. **¿Lo pagaría?** Todavía no. La atribución por campaña (radio, espectacular, Facebook) con costo por lead es justo lo que quiero, pero hoy el sistema **puede apartar el mismo lote a dos clientes** y deja a un asesor registrar una venta por $1 sin que nadie la autorice. Con eso no le confío mi inventario.
2. **¿Lo usaría mi equipo?** A medias. En el celular el menú esconde la mitad de las secciones, si se va la señal en la caseta se pierde lo capturado y el asesor no recibe ningún aviso cuando le cae un lead (todo se ve solo dentro de la app). Van a seguir en su WhatsApp personal.
3. **Qué lo bloquea:** (a) inventario que se desincroniza (B01–B03), (b) WhatsApp real y la IA nunca se probaron contra Meta ni contra Anthropic, (c) no hay recuperación de contraseña, ni notificaciones, ni cobro, (d) la importación desde Excel corrompe acentos.
4. Necesitaría el plan Profesional ($3,490 + IVA) por los 3 desarrollos, y con 8 asesores + yo + gerente llego justo al tope de 10 lugares, contando invitaciones pendientes.
5. La base técnica es sólida: el aislamiento entre empresas resistió todo lo que intenté. Lo que falta es el oficio inmobiliario (apartado con vencimiento, autorizaciones, comisiones, Infonavit) y pulir la experiencia en celular.

---

## 2. Bugs

Severidad: **Bloqueante** = impide vender o pone en riesgo dinero o el aspecto legal · **Alta** = pérdida de datos o un flujo principal roto · **Media** = error visible o riesgo acotado · **Baja** = detalle.
Todos los bugs están reproducidos en vivo, salvo los que dicen "verificado en código".

| ID | Sev. | Qué pasa | Pasos para reproducir | Esperado | Real | Evidencia | Estado tras las correcciones |
|---|---|---|---|---|---|---|---|
| B01 | **Bloqueante** | Doble apartado del mismo lote | 1) Lead "María José" → Editar datos → Lote 1 → etapa *Apartado* (el lote queda Apartado). 2) Lead "Ana" → Lote 1 → *Apartado* → lo bloquea, bien. 3) Admin en Desarrollos → Inventario cambia Lote 1 a *Disponible* (sin ningún aviso). 4) "Ana" → *Apartado* | Que no deje liberar un lote con un apartado activo, o que avise | **Dos leads en APARTADO sobre el Lote 1** (confirmado en la BD) | `f5-apartado-ana-bloqueado.png`, `f5-doble-apartado.png`, `scripts/f5-apartado.mjs` | ✅ Resuelto (a1a7d56): liberar a mano un lote apartado/vendido ya no se permite y un índice único en la BD impide dos clientes sobre un lote. Regresión: el lote quedó sin doble apartado. |
| B02 | **Alta** | Cambiar la unidad de un lead ya apartado no mueve el apartado | Con "María José" en Apartado sobre Lote 1 → Editar datos → elegir Lote 2 → Guardar | Liberar el Lote 1 y apartar el Lote 2, o impedir el cambio | El lead queda Apartado con el **Lote 2 marcado como Disponible**; el Lote 1 sigue Apartado sin dueño | `f5-apartado.mjs` (consulta final) | ✅ Resuelto (a1a7d56): el apartado se mueve de unidad (o se rechaza si la nueva ya está tomada). Regresión: Lote 1 liberado, Lote 2 apartado. |
| B03 | **Alta** | Cotizar no liga la unidad al lead; la venta no descuenta el inventario | Asesor: lead nuevo → Cotizar Lote 2 → mover a *Vendido* | Lote 2 marcado como Vendido | El lead queda Vendido **sin unidad** y el Lote 2 sigue *Disponible* | `f6-vendido-por-1-peso.png` | ✅ Resuelto (a1a7d56): cotizar liga la unidad al lead. Regresión: la cotización quedó ligada al Lote 2. La venta con unidad solo se probó por prueba automatizada (en la corrida el Lote 2 ya estaba apartado por otro, y el sistema lo bloqueó bien). |
| B04 | **Alta** | El asesor registra ventas sin autorización y con cualquier monto | Asesor → lead → Etapa *Vendido* → monto `1` → Confirmar | Que la venta la autorice un gerente o que el monto sea coherente con el precio | Venta registrada por **$1**; el dashboard muestra "Ventas 85 · $1" | `f6-dialogo-venta-cel.png`, `f12-5000-_app.png` | ✅ Resuelto (`3526bcf` + `27edd5e`): una venta de asesor por debajo del tope ya no es solo un error; queda como solicitud pendiente que un administrador autoriza o rechaza. Sin unidad ligada sigue sin poder venderse. Verificado en navegador. |
| B05 | **Alta** | Descuento sin tope en el cotizador | Asesor → Cotizador → Lote de $480,000 → descuento 479,999 | Un tope o autorización por encima de X% | Genera la cotización y el PDF con el **99.99 % de descuento** | `scripts/f6-asesor.mjs` | ✅ Resuelto (`3526bcf` + `27edd5e`): el tope (5 % por defecto) es configurable por organización en Configuración y, al excederlo, el asesor genera una solicitud pendiente que le llega al administrador por correo y en un aviso; al autorizar se crea la cotización a nombre del asesor. Verificado en navegador. |
| B06 | **Alta** | Si se cae internet al guardar, se pierde lo capturado | Celular → Nuevo lead → llenar nombre, teléfono y notas → sin conexión → Guardar | Mensaje "Sin conexión, reintenta" conservando los datos | Pantalla completa **"This page couldn't load"** (en inglés) y el formulario se borra | `f13-sin-internet-cel.png` | ✅ Resuelto (275389d): mensaje en español, datos conservados y el reintento guarda. Regresión en navegador: confirmado. |
| B07 | **Alta** | El CSV de Excel en español corrompe los acentos | Importar un CSV guardado como "CSV (delimitado por comas)", que es Windows-1252 (`csv/csv-ansi-sin-acento-header.csv`) | Detectar la codificación o rechazar con un mensaje claro | Importa **"Jos� Pe�a"** sin avisar. Si el encabezado trae acento ("Teléfono"), rechaza el archivo con "debe tener columnas nombre y telefono" (`csv-excel-1252.csv`) | `f4-csv-excel-1252.png`, consulta en BD | ✅ Resuelto (0b01e22): detecta Windows-1252. Regresión: "José Peña" y encabezado "Teléfono" importados bien. |
| B08 | Media | Un correo mal escrito descarta todo el lead en la importación | CSV con fila `Ñoño,…,correo@malo` | Importar el lead sin correo y avisar | La fila se pierde: "Correo inválido" | `f4-csv-utf8.png` | ✅ Resuelto (0b01e22): se importa sin correo y se avisa por fila. Regresión: "1 con avisos". |
| B09 | Media | No reconoce el export de Facebook Lead Ads | Importar `csv/csv-facebook.csv` (`full_name`, `phone_number`) | Reconocer las columnas o pedir que se mapeen | "El archivo debe tener al menos las columnas nombre y telefono" | `f4-csv-facebook.png` | 🟡 Parcial (0b01e22): reconoce el export de Facebook Lead Ads (full_name, phone_number). No se añadieron otros formatos ni mapeo manual de columnas. |
| B10 | Media | El asesor captura un teléfono que ya es de otro y cae en un 404 en inglés | Asesor → Nuevo lead → teléfono de un lead de otro asesor → Guardar | "Este prospecto ya lo atiende X; se avisó al administrador" | Redirige a la ficha ajena → **"404 This page could not be found."** | `f6-asesor-duplicado-ajeno.png` | ✅ Resuelto (b02bd32): mensaje claro en lugar de 404. Verificado en navegador; en la regresión completa solo se confirmó que ya no redirige a un 404 (el texto exacto quedó fuera del recorte de la captura). |
| B11 | Media | Mensajes de validación en inglés | Lead con nombre de más de 80 caracteres; notas de más de 2000; clave de unidad de más de 40 | Mensaje en español | "**Too big: expected string to have <=80 characters**" (también con 2000 y 40). Por código pasa igual en ciudad, nombre de campaña y otros `max()` sin mensaje | `scripts/f2`, `f3` | ✅ Resuelto (b02bd32): "Máximo 80 caracteres." etc. Regresión: confirmado en lead, unidad y notas. |
| B12 | Media | 404 y páginas de error genéricas en inglés en toda la app | Abrir un lead ajeno o borrar un lead con ID inválido | Página en español con botón de regreso | "This page could not be found." / "This page couldn't load… ERROR 1751892011". No existen `not-found.tsx` ni `error.tsx` | `f8-borrar-lead-ajeno.png`, `f9-asesor-lead-ajeno.png` | ✅ Resuelto (b02bd32): 404 y error en español dentro y fuera de /app. El aviso "N Issue" de Next solo aparece en desarrollo. |
| B13 | Media | La validación de teléfono acepta basura y rechaza formatos mexicanos reales | Nuevo lead con `0000000000`; otro con `01 444 123 4567` | Rechazar el primero y normalizar el segundo | Guarda **"+00000000"** como número internacional; rechaza `01 444…` (por código, también `044`/`045`) | `scripts/f3`, consulta en BD | 🟡 Parcial (0b01e22): se rechazan 0000000000/1111111111 y se aceptan 01/044/045. Regresión: confirmado. Sigue rechazando extensiones ("ext 12"). |
| B14 | Media | Celular (390 px) roto en varias pantallas | Abrir Inicio y Desarrollo → Inventario en un iPhone 12-14 | Sin desplazamiento horizontal | Desborda 174–175 px; el menú superior **esconde Cotizador, Campañas, Equipo y Configuración** fuera de la pantalla; la tabla de leads corta la columna Etapa | `cel-app.png`, `cel-desarrollos-detalle.png`, `cel-app_leads.png` | ✅ Resuelto (`e67f63e`): menú con las 10 secciones, tablas como tarjetas y pipeline por etapa en celular; sin desplazamiento horizontal a 390 px en 13 pantallas (guion qa/scripts/e2e-movil.mjs). Probado en Chromium emulando 390 px, no en teléfonos reales. La lista de leads queda muy larga (~12,000 px con 50 leads). |
| B15 | Media | El endpoint público revela si un teléfono ya es cliente | `POST /api/public/leads` con la llave del formulario (es pública, está en el HTML de la landing) y un teléfono existente | Respuesta neutra | `{"ok":true,"id":"57275c48-…","nuevo":false}`: confirma que es cliente y da el ID interno. Además, cualquiera puede escribir texto en el historial de un lead existente | `scripts` (curl en la sección 6) | ✅ Resuelto (`9526f84`): siempre `{ok:true}` 200, sin ID ni `nuevo`; el contacto repetido se registra solo por dentro y un mismo teléfono no puede escribir más de 5 veces por hora en el historial. Verificado con curl y con el formulario hospedado. |
| B16 | Media | El límite por IP se brinca falsificando `X-Forwarded-For` | 22 POST desde una IP → 429; luego 5 con XFF distinto → 201 | Seguir en 429 | Acepta todas (depende del hosting: en Vercel el encabezado se reescribe; en otros no) | ver sección 6 | ✅ Resuelto (`9526f84`): límites en Postgres compartidos entre instancias (por organización, por teléfono y por IP solo si `TRUSTED_PROXY` está configurado). Falsificar X-Forwarded-For ya no sirve. Anti-bots invisible (token con tiempo mínimo) además del honeypot; no hay captcha de terceros. |
| B17 | Media | Dar de baja a un asesor deja sus leads huérfanos | Equipo → Desactivar a "Carla Asesora QA" | Preguntar a quién pasar sus leads | **2,005 leads abiertos** siguen asignados a una persona inactiva; no hay reasignación masiva. El ex-asesor ve "Crea tu organización" | `f14-baja-asesor.png`, `f14-asesor-dado-de-baja.png` | ✅ Resuelto (`afc092c`): la baja exige elegir heredero (o "sin asignar"); se mueven leads abiertos y tareas pendientes, con aviso al heredero. Reasignación masiva por filtros en Leads; el filtro incluye inactivos para rescatar huérfanos. El dado de baja ve un aviso y ningún dato. Verificado en navegador (10 huérfanos rescatados, baja con 2 leads y 1 tarea). |
| B18 | Media | La alerta de "frío" ignora citas y tareas futuras | Ver el pipeline de la demo | Un lead con visita agendada no debería salir en rojo | 18 de 30 leads en rojo; con 5,000 leads el banner dice "**2973 leads sin contacto**". Esto genera ceguera de alertas (verificado en código: solo usa `lastContactAt`) | `desk-app_pipeline.png`, `f12-5000-_app_pipeline.png` | ✅ Resuelto (`9854dea`): no cuenta leads con tarea o cita futura, umbral por etapa configurable (sugeridos 24/72/168/72/120 h) y el banner nombra a los 5 más urgentes con enlace a cada uno. Con 5,000 leads: 2,973 → 2,472 fríos con los sugeridos. |
| B19 | Baja | El PDF de la cotización dice "**Lote Lote 2**" y no trae el teléfono del asesor | Generar PDF de un lote tipo Lote | "Lote 2" y un teléfono de contacto | Duplica la palabra; solo trae el correo. El emoji del nombre del desarrollo deja un doble espacio | `qa/cotizacion.pdf` | ❌ No resuelto |
| B20 | Baja | Se pueden crear tareas con fecha pasada | Tarea con fecha 01/01/2020 | Aviso o rechazo | Se crea y nace "Vencida" | `scripts/f6` | ❌ No resuelto |
| B21 | Baja | Un asesor que entra a una sección de admin regresa a Inicio sin explicación | Asesor abre `/app/equipo` | "No tienes permiso…" | Redirige a `/app?error=permiso` y no muestra ningún mensaje | `scripts/f9` | ✅ Resuelto (b02bd32): aviso "No tienes permiso…". |
| B22 | Baja | El selector de cliente del Cotizador solo muestra los 50 leads más recientes | Org con 5,000 leads → Cotizador → Cliente | Buscador | No aparecen los leads anteriores (solo se llega por el botón "Cotizar" de la ficha). Verificado en código (`listLeads` paginado) | — | ❌ No resuelto |
| B23 | Baja | Errores duplicados en el cotizador | Plazo 0 con saldo | Un mensaje | "Indica el plazo en meses para el saldo." aparece dos veces | `scripts/f6` | ❌ No resuelto |
| B24 | Baja | Doble punto | Registrar una org que termine en "S.A. de C.V." | — | "Resumen de Competencia Inmobiliaria S.A. de C.V.." | `f1-registro-ok-B.png` | ❌ No resuelto |
| B25 | Baja | El pipeline pesa mucho con volumen | 5,000 leads | — | 1.6 MB de HTML y 19,355 nodos; solo 150 tarjetas por columna ("+850 más (usa los filtros)") | `f12-5000-_app_pipeline.png` | ❌ No resuelto. Re-medido: 1.0–1.1 s en desarrollo y **0.37–0.47 s en el build de producción**, con 1.6 MB y 19,379 nodos con 5,000 leads. En celular ahora es una lista plegable por etapa (menos dibujo, mismo peso de datos). |
| B26 | Baja | Las pruebas automáticas ensucian la base de desarrollo | Ver la lista de organizaciones en la BD local | Base de pruebas aparte | 14 organizaciones basura ("Desarrollos Pipeline", "Desarrollos Dbg"…) de corridas interrumpidas | consulta en BD | ✅ Resuelto (`1904bc4`): `npm test` usa su propia base `inmobiliaria_test` (se crea, migra y vacía sola, con salvaguardas) y ya no escribe en la de desarrollo; verificado: 224 pruebas y la base de desarrollo quedó idéntica (20 organizaciones, 10,114 leads). La basura anterior sigue en desarrollo hasta un `db:reset`. |
| B27 | Baja | Polígono deformado en el plano de la demo | Demo → Residencial Los Pinos → Plano | Lote 1 rectangular | El Lote 1 es un triángulo encimado sobre el 2 y el 7; se ve mal en una demo de ventas | `f13-plano-demo.png` | ❌ No resuelto |
| B28 | Media | La cookie de sesión de Supabase es legible desde scripts y viaja por http | Iniciar sesión en el build de producción → revisar las cookies (`qa/scripts/prod-checks.mjs`) | `HttpOnly` y, en producción, `Secure` | `sb-…-auth-token` sin `HttpOnly` ni `Secure`: cualquier script inyectado en una página podía robar la sesión | `qa/run3/35-produccion.txt` | ✅ Resuelto (`69851d0`): `HttpOnly` + `SameSite=Lax` siempre y `Secure` en producción, en el cliente de servidor y en el proxy. Verificado: `HttpOnly, Secure, SameSite=Lax`. |
| B29 | Baja | Tras registrarse, el build de producción deja 3 precargas de `/app` abiertas | Registrarse con un correo nuevo en el build de producción → esperar 60 s | Que las precargas internas terminen | `GET /app?_rsc=…` con cabeceras `Next-Router-Segment-Prefetch` (`/_index`, `/app`, `/app/__PAGE__`) responden 200 pero el cuerpo nunca cierra; `networkidle` nunca llega. **No** ocurre al recargar, al volver a entrar, con usuarios existentes ni en `next dev`; pedir esas mismas rutas a mano responde en ~20 ms | `qa/run3/11-registro.txt` | ❌ No resuelto ni investigado a fondo. La página funciona; el efecto visible es una conexión abierta hasta que el usuario navega. Los guiones de QA ya no esperan red inactiva tras registrarse. |
| B30 | Alta (configuración) | El resumen diario queda cerrado con el `CRON_SECRET` actual | `GET /api/cron/daily-digest` con el secreto de tu `.env.local` | 200 | 401: el secreto mide 15 caracteres y el endpoint exige 16 o más | `qa/run3/35-produccion.txt` | ❌ Abierto para ti: genera uno de 32+ caracteres para producción (paso 5 de [docs/PILOTO.md](docs/PILOTO.md)). Con uno largo: 200 y envió 12 resúmenes. |

**Probé y funcionó** (no son bugs): campos vacíos y montos negativos rechazados con mensaje claro; el formulario conserva lo escrito tras un error; doble clic no duplica leads ni unidades; teléfonos repetidos en distinto formato se deduplican (`+52 (444) 812-0007` = `444-812-0007`); emojis, ñ y acentos se guardan bien; `<script>` en notas no se ejecuta; máximo de 500 unidades por carga y 2,000 filas por CSV; enlace de invitación de un solo uso; CSV con punto y coma en UTF-8 sí funciona.

---

## 3. Lo que falta (ordenado por impacto en la decisión de compra)

1. **Notificaciones al asesor (WhatsApp, correo o push) cuando le cae o le reasignan un lead, y resumen diario.** El lead de radio se enfría en minutos; si el asesor tiene que abrir la app para enterarse, no sirve. → 🟡 **Parcial:** ya hay correo de lead nuevo, de reasignación, de invitación, de autorizaciones y resumen diario; faltan aviso por WhatsApp o en el teléfono, y programar el resumen en el hosting.
2. **WhatsApp real conectado y probado, con bandeja compartida.** El botón "Abrir WhatsApp" abre el WhatsApp personal del asesor: la conversación no queda registrada y el asesor se queda con el cliente, que es justo el problema que quiero resolver.
3. **Apartado formal: monto, fecha, vencimiento y liberación automática del lote.** En la práctica el apartado de $5,000–$20,000 vence en 7–15 días; sin vencimiento, los lotes quedan bloqueados para siempre.
4. **Autorizaciones de gerente** para ventas, cancelaciones, liberar lotes y descuentos arriba de X%. Sin esto no le doy acceso a 8 asesores a comisión. → 🟡 **Parcial:** descuentos y ventas por debajo de lista ya pasan por una cola con aviso al administrador (tope configurable); cancelaciones y liberar lotes siguen siendo solo del administrador.
5. **Recuperar contraseña e invitaciones por correo.** Hoy un asesor que olvida su contraseña queda fuera y el enlace de invitación hay que copiarlo y mandarlo a mano. → ✅ **Resuelto:** hay "Olvidé mi contraseña" con correo en español e invitaciones por correo (el enlace manual sigue existiendo).
6. **Exportar a Excel** leads, ventas y cotizaciones. Mi dirección y mi contador viven en Excel, y quiero poder llevarme mis datos.
7. **Reasignación masiva y reglas de asignación** (por desarrollo, por guardia en caseta, y reasignar si no contesta en X minutos). Sirve contra el asesor que acapara leads y para cubrir rotación. → 🟡 **Parcial:** la reasignación masiva y la baja con heredero ya existen; faltan las reglas (por desarrollo, guardias, reasignar si no contesta).
8. **Créditos: Infonavit, Fovissste, Cofinavit y bancario** en el lead y en el cotizador, con pago contra escrituración. En SLP buena parte de la demanda de fraccionamiento es con crédito; el cotizador solo hace financiamiento directo.
9. **Etapas posteriores a la venta:** enganche pagado, contrato firmado, mensualidades al corriente y vencidas, escrituración y entrega. "Vendido" no es el final; ahí empieza la cobranza.
10. **Comisiones por asesor** (porcentaje, cuándo se paga: al enganche o a la escrituración). Es lo primero que pregunta el asesor y lo que más pleitos causa.
11. **Agenda de citas y visitas con fecha y hora** (hoy "Cita agendada" es solo una columna) y **tareas creadas desde la lista de Tareas**.
12. **Inventario serio:** Manzana + Lote como campos separados, importar el inventario desde Excel, historial de cambios de estatus (quién y cuándo) y lista de precios por etapa de preventa. Además, que se pueda subir el plano en PDF.
13. **Integración directa con Facebook Lead Ads y portales** (Inmuebles24, Lamudi, Vivanuncios). El CSV no se puede hacer a diario.
14. **Cobro y factura CFDI.** Sin esto no puedo pagarles ni deducirlo; hoy cambiar de plan dice "escríbenos".
15. **Bitácora de auditoría** (quién borró un lead, quién cambió un precio) y rol de **gerente/coordinador por desarrollo**.
16. **Onboarding guiado** (crea desarrollo → unidades → campañas → invita → conecta WhatsApp) y ayuda dentro de la app.

## 4. Lo que sobra o estorba

- **Configuración técnica a la vista del cliente:** "Phone number ID (Meta)", "Meta for Developers", "Endpoint: POST …", "Consulta el README", "docs/WHATSAPP.md", "Token de verificación / App secret". Un director no técnico se asusta; eso debe hacerlo soporte. → ✅ **Resuelto:** todo quedó en un bloque plegado «Avanzado», en español, con la liga del formulario a la vista.
- **Publicidad de la IA en cada ficha y en el dashboard de quien no tiene el plan Élite.** Distrae, y la página de precios promete "Análisis semanal con IA" cuando en realidad es un botón bajo demanda: no hay nada semanal ni automático.
- **Variables `{{1}} {{2}} {{3}}` en las plantillas de WhatsApp** a la vista del asesor. Solo debería ver el mensaje final. → ✅ **Resuelto:** nunca se muestran.
- **Cambiar de etapa con un `select` que guarda al instante**, sin confirmar y sin deshacer. Un dedazo en el celular mueve al cliente. → ✅ **Resuelto:** pide confirmación y ofrece «Deshacer» 10 s (restaura contactos, lote y venta).
- **Kanban de 8 columnas** que no cabe ni en escritorio (Apartado, Vendido y Perdido quedan fuera de la vista). En celular sería mejor una lista agrupada por etapa. → ✅ **Resuelto en celular** (lista plegable por etapa); en escritorio sigue el tablero horizontal.
- **Columna "Borrar" junto a cada lote** en el inventario: demasiado a la mano para algo tan delicado.
- **Cuatro planes con 3/10/25/50 usuarios:** el Básico (3 usuarios, 1 desarrollo) no sirve a ninguna desarrolladora real, y la diferencia entre Desarrolladora y Élite no es clara.
- **Códigos de campaña en MAYÚSCULAS sin acentos** (`FB-PINOS`): es jerga técnica para el equipo comercial.
- Anglicismos: *Pipeline*, *Leads*, *kanban*, *CPL*, *webhook*, *Cloud API*. "Leads" se tolera en marketing, pero el asesor dice *prospectos*; "Pipeline" podría ser *Seguimiento* o *Embudo*, y "CPL" debería decir *costo por prospecto*.

## 5. Fricción: 10 momentos donde un usuario no técnico se pierde

1. **Primer ingreso:** dashboard en ceros, "Sin datos en este periodo", y nada que diga qué hacer primero.
2. **Invitar al equipo:** hay que copiar un enlace que "solo se muestra una vez" y mandarlo por WhatsApp; si se pierde, hay que repetir.
3. **Subir mi Excel:** pide "CSV UTF-8"; si lo guardo normal, corrompe los acentos o dice que faltan columnas que sí tengo. → ✅ **Resuelto** (acentos, encabezados con acento, correo mal escrito).
4. **Celular:** no encuentro Cotizador, Campañas ni Configuración (están fuera de la pantalla); las tablas se cortan. → ✅ **Resuelto** (menú con las 10 secciones y tablas como tarjetas).
5. **Todo en rojo:** 60 % de los leads marcados como "Frío", incluso los que tienen cita. Al segundo día ya nadie le hace caso. → ✅ **Resuelto** (umbral por etapa, sin citas ni tareas próximas, y "tus 5 más urgentes").
6. **Configurar WhatsApp o el formulario web:** términos de Meta y de programador, y referencias a archivos del código. → ✅ **Resuelto** (plegado en «Avanzado», en español).
7. **El asesor captura un cliente que ya existía** y le sale una página en inglés que dice 404. → ✅ **Resuelto** (mensaje claro, sin 404 en inglés).
8. **Mala señal en el desarrollo:** guarda, se cae y pierde todo lo escrito, con un mensaje en inglés. → ✅ **Resuelto** (mensaje en español y no se pierde lo capturado).
9. **Tareas:** solo se crean entrando a cada lead; no hay calendario ni aviso cuando vencen.
10. **Querer cambiar de plan o recuperar la contraseña:** no hay forma desde la app. → 🟡 recuperar la contraseña ✅; cambiar de plan sigue siendo manual.

---

## 6. Riesgos antes de vender

**Seguridad (lo que probé)**
- ✅ **Aislamiento entre organizaciones:** con dos organizaciones nuevas, la org B no vio ni modificó nada de la org A por URL (leads, desarrollos, cotizaciones, PDF, imagen del plano: todos 404) ni **interceptando sus propias peticiones y sustituyendo IDs de la org A** (nota, tarea, cambio de etapa, estatus de lote, cotización, liga a unidad, borrado de lead y cookie `org_id` falsificada). Las 8 manipulaciones fueron rechazadas y la BD quedó intacta (`scripts/f7`, `f8`).
- ✅ **Roles:** el asesor no entra a Equipo, Configuración, Importar ni Campañas; **reproducir con la sesión del asesor** las peticiones de admin (borrar lead, hacerse admin, cambiar estatus de lote, cambiar configuración, invitar a un admin) no tuvo efecto (`scripts/f9`).
- ✅ **No hay secretos en el cliente:** revisé 35 archivos JS y el HTML de 9 páginas (4.5 MB) buscando todas las variables de servidor de `.env.local`, `sb_secret`, `service_role`, `postgres://` y `sk-ant`: nada. La API REST de Supabase niega el acceso con token de usuario (`42501 permission denied`).
- ✅ **B15 y B16 resueltos:** el formulario público ya no revela si un teléfono es cliente, el límite de peticiones es compartido (Postgres) y no se deja engañar por `X-Forwarded-For`, y hay un anti-bots invisible. ⚠️ Siguen: sin captcha de terceros (si aparece abuso real, el siguiente paso es Cloudflare Turnstile), sin 2FA, sin bloqueo tras intentos fallidos de contraseña (solo el límite de Supabase), sin CSP, sin bitácora de auditoría y **sin pentest externo**. El límite por IP solo funciona si defines `TRUSTED_PROXY` en el hosting (si no, solo protegen los límites por organización y por teléfono).

**Datos personales (LFPDPPP)**
- ✅ Hay consentimiento obligatorio al capturar e importar, ligado a la versión del aviso, y aviso público por organización.
- ⚠️ Derechos ARCO incompletos: solo existe "eliminar" (borrado físico, sin constancia de quién ni cuándo) y no se pueden exportar los datos de un titular.
- ⚠️ Los datos se transfieren a Meta (WhatsApp) y a Anthropic en EE. UU. (IA): debe decirlo el aviso de cada cliente y hacen falta contratos de encargado.
- ⚠️ La casilla "el prospecto aceptó" la marca el asesor: es una declaración, no una prueba.
- ⚠️ Los textos legales no los ha revisado un abogado (lo dice el propio README).

**Confiabilidad**
- Se probó el **build de producción** (`next build` + `next start`) en local con el recorrido completo. **No** se ha probado en un hosting real, con el Supabase de producción ni con teléfonos reales.
- WhatsApp real (Meta), IA real (Anthropic) y Resend real **sin probar** (pasos en [docs/PILOTO.md](docs/PILOTO.md)).
- Sin monitoreo de errores, sin respaldos probados, sin CI, sin pruebas E2E en el repo.
- ✅ Las pruebas ya corren en su propia base (B26). ⚠️ Los guiones de navegador de `qa/scripts/` no corren solos en CI: hay que lanzarlos a mano (`bash qa/run-all.sh`).

**Soporte**
- No hay ayuda dentro de la app, ni onboarding, ni canal definido.
- El plan Básico trae soporte "por correo" sin SLA.
- Cambiar de plan es manual y no hay cobro: nadie paga ni expira la prueba.

### Lint, typecheck y pruebas
- `npm run lint`: 0 errores. Mi carpeta `qa/` agrega 3 *warnings* de variables sin usar en mis scripts; se puede ignorar o borrar.
- `npm run typecheck`: sin errores.
- `npm test`: **28 archivos, 228 pruebas, todas pasan**, ahora contra su propia base `inmobiliaria_test`. Un checkout limpio de HEAD (sin el trabajo de planos sin commitear): 27 archivos, 220 pruebas, también en verde.
- **Qué cubren (automático, en cada corrida):** aislamiento RLS entre organizaciones, permisos e invitaciones, formulario público (neutralidad, límites compartidos, token anti-bots, IP confiable), CSV y teléfonos, inventario y apartados (incluido el índice único en la base), descuentos y ventas con cola de autorización, deshacer cambios de etapa, baja con heredero y reasignación masiva, alerta de frío por etapa, correos y resumen diario, cookies de sesión, mensajes en español, pipeline, tareas, WhatsApp (firma, idempotencia, ventana de 24 h), planos, cotizador, PDF, dashboard e IA con proveedor simulado, y que las pruebas no tocan la base de desarrollo.
- **Qué cubren (guiones de navegador en `qa/scripts/`, se lanzan a mano):** registro, inventario, equipo, captura y CSV, apartado, cotizaciones, venta, aislamiento, roles, secretos en el JavaScript, 5,000 leads, sin internet, baja, recuperación de contraseña, celular a 390 px, ausencia de jerga, confirmar/deshacer etapa, cola de autorización y comprobaciones de producción.
- **Qué no cubren:** diseño en dispositivos reales, accesibilidad (lector de pantalla, contraste), concurrencia real (dos asesores apartando el mismo lote en el mismo milisegundo; la base lo impide con un índice único, pero no hay prueba de carga), arrastrar tarjetas con el dedo, WhatsApp, IA y Resend reales, y nada de lo que ocurre en un hosting real.

### Rendimiento (5,000 leads en una org, local, `next dev`, un solo usuario)
| Página | Admin | Asesor |
|---|---|---|
| Inicio (dashboard) | 456–507 ms | 218–249 ms |
| Leads (lista, búsqueda por nombre o teléfono, solo fríos, página 100) | 357–546 ms | 371–499 ms |
| Pipeline | 670–895 ms · **1.6 MB HTML, 19k nodos** | 431–635 ms · 819 KB |
| Tareas / Cotizador / Campañas | 150–360 ms | 148–355 ms |

Es aceptable en local. **No medido:** red móvil 4G, base remota, varios usuarios a la vez y build de producción. El pipeline será lento en celulares de gama media.

**Re-medición tras las correcciones (admin, 5,000 leads en la organización correcta, `next dev`, local):** Inicio 249–302 ms · Leads 418–461 ms (búsqueda y filtro de fríos 423–591 ms) · **Pipeline 1.0–1.1 s con 1.6 MB de HTML y 19,357 nodos (sin cambios, B25)** · Tareas, Cotizador y Campañas 163–485 ms.

**Re-medición sobre el build de producción (admin, 5,000 leads, local, un usuario):** Inicio 0.31 s · Leads 0.09–0.14 s (con búsqueda y filtro de fríos incluidos) · **Pipeline 0.37–0.47 s con 1.6 MB y 19,379 nodos** · Tareas, Cotizador y Campañas 0.08–0.10 s. Asesor: Leads 0.09 s, Pipeline 0.36–0.39 s. Sigue sin medirse 4G, una base remota ni varios usuarios a la vez.

---

## 7. Plan: 10 cambios con mejor impacto/esfuerzo

| # | Cambio | Resuelve | Estimado |
|---|---|---|---|
| 1 | **Blindar inventario:** no permitir liberar o cambiar el estatus de un lote con apartado o venta activa (o pedir confirmación y llevar el lead a otra etapa), mover el apartado al cambiar de unidad, ligar la unidad al cotizar o vender y añadir una restricción en la BD de "un apartado activo por lote" | B01–B03 | 2 días |
| 2 | **Español en todo:** mensajes de Zod globales en español, `not-found.tsx`, `error.tsx` y `global-error.tsx` propios, aviso de "sin permiso", conservar el formulario y mostrar "sin conexión, reintenta" | B06, B10–B12, B21 | 1 día |
| 3 | **Notificaciones:** correo de invitación y de recuperación de contraseña, aviso al asesor de lead nuevo o asignado (correo y plantilla de WhatsApp) y resumen diario de pendientes | Falta 1 y 5 | 3 días |
| 4 | **Autorizaciones:** venta, cancelación y descuento arriba de X% pasan por un admin o gerente; monto de venta obligatorio y validado contra el precio | B04, B05 | 2 días |
| 5 | **Importación a prueba de Excel:** detectar Windows-1252, aceptar .xlsx, vista previa con mapeo de columnas, alias de Facebook Lead Ads, importar la fila aunque el correo sea inválido, y corregir la normalización de teléfonos (rechazar `00…`, aceptar `01/044/045`) | B07–B09, B13 | 2 días |
| 6 | **Baja de asesor con reasignación** y reasignación masiva desde la lista de leads | B17 | 1 día |
| 7 | **Apartado con monto, fecha y vencimiento** que libera el lote y avisa al asesor | Falta 3 | 2 días |
| 8 | **Celular de verdad:** menú con todas las secciones (inferior o hamburguesa), tablas como tarjetas, pipeline como lista por etapa | B14, B25 | 2 días |
| 9 | **Alerta de frío inteligente:** no contar leads con cita o tarea futura, umbral por etapa, y el banner con "tus 5 más urgentes" en lugar de un número enorme | B18 | 1 día |
| 10 | **Exportar a Excel** (leads, ventas y cotizaciones con los filtros actuales) y quitar de la interfaz la jerga técnica de Configuración | Falta 6, sección 4 | 1 día |


**Estado del plan:** #1 ✅ · #2 ✅ · #3 🟡 (correos, aviso de lead, resumen diario y recuperar contraseña ✅; falta aviso por WhatsApp/teléfono y programar el cron) · #4 ✅ (tope **configurable por organización** y cola de autorización) · #5 🟡 (B07, B08, B13 ✅; B09 solo Facebook) · #6 ✅ (B17) · #7 ❌ (apartado con monto, fecha y vencimiento: no se construyó) · #8 ✅ (B14) · #9 ✅ (B18) · #10 🟡 (jerga fuera de la vista ✅; **exportar a Excel ❌**).

Total: unos **17 días-persona**. Los puntos 1, 2 y 4 son condición para un piloto. Corregir también B15/B16 (respuesta neutra y límite de peticiones en Redis) antes de exponer el formulario en producción (½ día).

---

## 8. Lo que SÍ está bien (no tirarlo)

- **Aislamiento multi-empresa real** (RLS en Postgres más transacción por organización): resistió manipulación de IDs, cookies y reproducción de peticiones. Es lo más difícil y está bien hecho.
- **Permisos por rol consistentes**, del lado del servidor y no solo escondiendo botones.
- **Atribución por campaña con código y costo por lead/venta:** exactamente lo que necesita quien paga radio y espectaculares. Es el argumento de venta.
- **Deduplicación por teléfono normalizado** con registro de "volvió a dejar sus datos": protege contra el asesor que recaptura un cliente ajeno para quedárselo.
- **Consentimiento LFPDPPP versionado** al capturar, importar y en el formulario web.
- **Cotizador con cálculo correcto** (centavos, amortización, última mensualidad ajustada) y **PDF limpio** con leyendas legales sensatas (vigencia de 15 días, sin gastos notariales).
- **Plano interactivo de lotes con colores por estatus:** diferenciador visual fuerte para demos.
- **Validaciones claras y en buen español mexicano** en la mayoría de los formularios ("¿Qué platicaron?", "liga"); conservan lo escrito ante errores, y el doble clic no duplica.
- **WhatsApp bien modelado:** plantillas fuera de la ventana de 24 h, texto libre dentro, bloqueo sin consentimiento.
- **Rendimiento correcto con 5,000 leads** en listas y búsquedas (paginación de 50).
- Lint, typecheck y 141 pruebas en verde; código ordenado por servicios.

---

### Lo que NO pude probar (no asumir que funciona)
- **WhatsApp contra Meta real**, ni siquiera con el número de pruebas (solo modo simulado).
- **Asistente de IA** (no hice ninguna consulta; no hay llave).
- **Resend real** (el proveedor se probó contra una llamada simulada y contra Mailpit local) y el correo de invitación abierto en un cliente de correo real.
- **La plantilla de recuperación y la Site URL en el Supabase de producción**, y el **resumen diario programado** en un hosting.
- **Un hosting real**, un dominio con HTTPS y el pooler de Supabase de producción (el build se probó con `next start` en local; la cookie `Secure` solo se verificó como bandera).
- **Teléfonos reales** (iPhone/Android) y red 4G: solo Chromium emulando 390 px.
- **Arrastrar tarjetas con el dedo** (en celular se usa el selector «Mover a…», que sí se probó).
- Dibujar o marcar lotes en el plano.
- Accesibilidad (lector de pantalla, contraste).
- **Concurrencia real:** dos asesores apartando el mismo lote en el mismo instante (la base lo impide con un índice único, pero no hay prueba de carga).
- La causa de B29 (precargas abiertas tras registrarse en producción).
- La regla de 14 días de prueba (no existe) y el cobro (no existe).

### Datos de prueba que dejé en la base local
- Organizaciones "Fraccionamientos Peña & Núñez 🏡" (org A, con **5,000 leads sintéticos**) y "Competencia Inmobiliaria S.A. de C.V." (org B), usuarios `qa-*@ejemplo.test` (contraseña `Prueba123!`).
- En la demo "Desarrollos del Potosí": ~30 leads "Flood/Spoof/Web" del endpoint público y mensajes de WhatsApp simulados.
- Para limpiar: `npm run db:reset && npm run db:seed`.
- Pasada de piloto: más organizaciones `qa-*` (cada regresión crea cuentas nuevas), un lote de 5,000 leads por regresión y correos de prueba en Mailpit (http://127.0.0.1:54324). La base de **pruebas automáticas** es ahora `inmobiliaria_test` y se vacía sola; la basura anterior en la base de desarrollo sigue ahí hasta un `npm run db:reset && npm run db:seed`.
