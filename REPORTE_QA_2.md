# REPORTE QA 2 — Pórtico (build de producción)

Fecha: 9 nov 2026 · Commit probado: `f81eb0d` + tu trabajo de planos sin commitear · `next build` + `next start` (puertos 3300 y 3301) · Playwright a 390 px y 1280 px · No modifiqué código; evidencia en `/qa2` (`salidas/` = salida de cada script, `capturas/`, `scripts/`).

## 0. Estado después de la pasada de correcciones (9 nov 2026)

Verificado sobre `next build` + `next start` (puerto 3300; un segundo servidor con `TRUSTED_PROXY=xff:1` en 3301). Salidas en `qa2/run4/`; scripts en `qa2/scripts/`; reejecutable con `bash qa2/run-all.sh`.

| ID | Estado | Commit | Cómo se comprobó |
|---|---|---|---|
| B31 Deshacer toca lotes de otros | **Resuelto** | `b5731be` | 9 pruebas (`undo-ownership`), incluida carrera deshacer vs. apartar y deshacer una venta; E2E con dos asesores reales (`17-concurrencia`, `17b-deshacer-venta`): el lote X queda Apartado por el otro cliente y el lote Y queda Disponible |
| B33 Liberar a mano un lote apartado | **Falsa alarma mía** | `0dc3457` (solo prueba) | El inventario ya lo rechazaba (QA B01). En QA2 leí mal una línea de log de `f5`. Probado con clics: "La unidad Lote 2 está apartada por L1. Para liberarla, cambia primero la etapa de ese cliente" (`14b-b33`). No cambió código |
| B35 Error inesperado al perder la carrera | **Resuelto** | `b5731be` | 12 rondas en prueba y 8 en E2E: siempre "La unidad ya fue apartada por otro cliente"; ya no sale "error inesperado" |
| B32 Hueco del financiamiento | **Resuelto** | `cc0a8b9` | `quote-policy` (12 pruebas); E2E: 360 meses/0 % enganche/0 % interés queda pendiente con el motivo escrito. Ver consecuencia abajo |
| B36 Solicitudes de un asesor dado de baja | **Resuelto** | `92dc59a` | `authorization-deactivation` (5 pruebas) y E2E (`19-baja`): pasan al heredero, la cotización sale a nombre del heredero |
| B34 Un script bloquea el formulario | **Resuelto con límite conocido** | `5061545` | E2E: 120 peticiones de un script → 60 respondidas 429; una persona con el formulario alojado envía sin problema justo después. Límite: sin IP identificada no se puede separar a un bot que obtenga marcas nuevas del formulario (ver D-Q4) |
| B39 CSP y cabeceras | **Resuelto; HSTS queda al hosting** | `5061545` | CSP en app y login, 0 violaciones en consola en 7 pantallas; formulario incrustable solo por sitios permitidos: permitido se muestra, otro origen bloqueado. HSTS documentado en `docs/PILOTO.md` |
| B38 Primer día sin guía | **Resuelto** | `6b220e8` | `onboarding` (5 pruebas); E2E: 0 → 1 → 2 → 3 de 4 y desaparece al guardar la configuración (`36-cliente-nuevo`) |
| B37 Reasignar todo sin confirmar | **Resuelto** | `9013c24` | `bulk-reassign-undo` (4 pruebas); E2E `20-masiva`: el diálogo dice cuántos y a quién, Cancelar no mueve nada, Deshacer restaura 2 de 2 y 13 de 13 |
| B40 Campos de 14–15 px | **Resuelto** | `3144ef1` | `28-movil`: 0 campos <16 px y 0 controles <44 px en 10 pantallas a 390 px |
| B41 Deshacer de 32 px | **Resuelto** | `3144ef1` | Mide 44 px |
| B42 "Lote Lote 1" en el PDF | **Resuelto** | `3144ef1` | `unit-label` (3 pruebas); PDF real: "Lote 1" |
| B43 Diferencia de tiempo | **Resuelto** | `c334b58` | Diferencia medida: 0–1 ms (antes 8–11) |

**Consecuencias de B32 que conviene que sepas.** Con los valores iniciales (tasa de referencia 4 %, enganche mínimo 10 %, plazo máximo 120 meses), el plan estándar (20 % de enganche, 24 meses, sin intereses, sin descuento) pasa solo, pero un asesor que ofrezca 2 % de descuento con ese mismo plan ya necesita autorización (sumado al valor de las mensualidades sin intereses supera 5 %). Si la desarrolladora vende "a meses sin intereses" como plan normal, hay que subir el tope o bajar la tasa de referencia en Configuración (con 0 el financiamiento deja de medirse). Quedó escrito en `docs/PILOTO.md`.

**Pruebas que tuve que corregir (y por qué).**
- `authorizations.test.ts` (B05) y `authorization-queue.test.ts`: fijaban "un descuento exactamente en el tope pasa" con mensualidades sin intereses; con el descuento equivalente eso ya pide autorización. Ahora cotizan con intereses a la tasa de referencia. Es un cambio de comportamiento deliberado (D-Q2), no un arreglo para que pase.
- `tests/undo-ownership.test.ts`: mi primera versión validaba el inventario completo de la organización y arrastraba basura entre pruebas; ahora valida solo los lotes de cada prueba.
- Mis scripts de QA (no del producto): en `n1` el inventario completo de la organización demo traía restos de corridas anteriores, y `resetRace` no limpiaba clientes ajenos que tenían el lote apartado (por eso la primera corrida mostraba a "Humano" bloqueando a los dos asesores); `n3` y `n3b` usaban el parámetro `?stage=` en lugar de `?etapa=` y no pasaban por el nuevo diálogo de confirmación; `n7` esperaba `16,166.67` y el PDF redondea hacia abajo (`16,166.66` × 23 + `16,166.82`, correcto); `n8` choca con el puerto 3400 (otro proyecto tuyo, `agenda`) y 3450 está reservado por Windows, usé 8123. Una primera corrida completa quedó duplicada (dos procesos a la vez) y la descarté; la tabla de arriba sale de una corrida única y de reejecuciones de los pasos que fallaron por esas causas.

**Qué no pude verificar.**
- **Build limpio del commit sin tu trabajo de planos:** el worktree de `HEAD` pasa lint, tipos y 270 pruebas, pero `next build` falla ahí solo porque Turbopack no resuelve `next` a través del enlace de `node_modules`; el build sí pasó con tu árbol de trabajo completo. Un despliegue real desde `HEAD` hay que hacerlo con tu trabajo de planos ya commiteado y `npm ci`.
- **Carrera entre dos instancias del servidor:** las pruebas y el E2E corren contra una sola instancia; el candado es de base de datos (`FOR UPDATE` e índice único), así que debería sostenerse, pero no lo medí con dos procesos.
- **CSP en Safari/iPhone y en el visor de PDF:** probado en Chromium; excluí `/api` del CSP justamente para no arriesgar el visor de PDF, pero no abrí un PDF en un visor real.
- **HSTS y `Secure` tras un proxy HTTPS real**, y la detección automática de Vercel (`VERCEL=1`): cubierta por prueba unitaria, no con un despliegue.
- **Safari/iPhone real:** medí tamaños (16 px, 44 px) en Chromium a 390 px; el comportamiento real del zoom del teclado no.
- **Avisos por correo** de solicitudes (se envían a un buzón simulado).
- **Tu trabajo de planos sigue sin commitear** en el árbol (el estado de git al terminar mostraba `prisma/schema.prisma`, `DECISIONS.md`, etc. modificados): dejé mis cambios en esos archivos como cambios quirúrgicos y los commits solo llevan mis líneas.

**Lint, tipos y pruebas al cerrar.** `tsc`: sin errores. `vitest`: 36 archivos, **278 pruebas**, todas pasan (en `HEAD` limpio: 35 archivos, 270; la diferencia es `plans.test.ts`, que depende de tus archivos sin commitear). Lint: 0 errores; 21 advertencias, todas en los scripts de `qa/` y `qa2/`, ninguna en `src/` ni `tests/`.

---

## 1. Veredicto (5 líneas)

1. **¿Lo pagaría? Para un piloto acompañado, sí; para firmar un contrato abierto, todavía no.** Lo crítico (doble apartado, venta sin unidad, venta por $1, tope de descuento, aislamiento entre organizaciones, secretos) resistió todo lo que le tiré, incluida la concurrencia.
2. **Bloqueante nuevo: ninguno de seguridad.** El defecto más serio es de integridad de inventario: **"Deshacer" un apartado puede dejar un lote libre aunque otro cliente lo tenga apartado y otro lote apartado sin dueño** (B31).
3. **Lo que me preocupa como director comercial:** un lote que dice "Disponible" y no se puede apartar (o uno "Apartado" que nadie tiene) hace perder ventas y confianza en el inventario; el administrador puede además liberar a mano un lote vendido sin advertencia (B33).
4. **Hueco del tope de descuento:** el asesor puede dar financiamiento a 360 meses sin enganche y sin intereses sin pedir permiso (B32), que equivale a >65 % de descuento.
5. **Operación:** el formulario público de una organización se puede bloquear un minuto con un solo script (B34, mitigado si se configura `TRUSTED_PROXY`), y el primer día de un cliente nuevo es un tablero de ceros sin guía (B38).

## 2. Resultados por punto pedido

| # | Punto | Resultado |
|---|---|---|
| 1 | B01–B05 + Deshacer + concurrencia | B01–B05 siguen resueltos en secuencia. En carrera (8 rondas) nunca hubo 2 titulares. **Falla en Deshacer** (B31) y mensaje crudo al perder la carrera (B35). |
| 2 | Cola de autorizaciones | Aprobar, rechazar, doble aprobación simultánea (1 sola cotización) y "baja a medias" correctas. No existe edición de cotizaciones (404). Se evade con financiamiento (B32). Solicitud de asesor dado de baja queda pendiente (B36). |
| 3 | Baja y reasignación masiva | Sin leads huérfanos; sesión y pestaña abierta del asesor bloqueadas; heredero de otra organización o inactivo rechazado; filtro de etapa respetado. Reasignar todo sin filtro no pide confirmación (B37). |
| 4 | Seguridad pública | Respuesta idéntica nuevo/existente; `xff:1` resiste cabeceras falsas; cookie HttpOnly+Secure+SameSite=Lax; 0 secretos en 21 archivos JS; XSS almacenado no se ejecuta. Faltan CSP y HSTS; `npm audit --omit=dev` = 0, `npm audit` completo = 8 moderadas (solo herramientas de lint). Ver B34, B39. |
| 5 | Celular | Sin desplazamiento horizontal en las pantallas probadas; menú con 10 secciones (admin) / 7 (asesor); pipeline por etapa; confirmación y Deshacer funcionan. Detalles B40, B41. |
| 6 | Alerta de frío | Con 14 leads de datos controlados: total 8 correcto, cita/tarea futura excluida, umbral por etapa desde Configuración surte efecto, banner con 5 nombres reales. Nota de diseño D1. |
| 7 | Cliente nuevo de principio a fin | Completo en 20 s de script: registro → desarrollo y 30 lotes → CSV Windows-1252 (acentos y ñ intactos) → asesor invitado → captura y movimiento → cotización → PDF correcto. Detalle cosmético B42. |
| 8 | Lint, tipos, pruebas | Ver sección 5. |

## 3. Bugs (pasos para reproducir)

Severidad: A = alta, M = media, B = baja. Numeración continúa la del reporte 1 (B30).

| ID | Sev. | Pasos para reproducir | Esperado | Real | Evidencia |
|---|---|---|---|---|---|
| **B31** | A | 1) Asesor1 mueve el lead L1 a **Apartado** (lote X) y deja visible "Deshacer". 2) En otra pestaña cambia la unidad de L1 a lote Y ("Editar datos"). 3) Asesor2 aparta el lote X. 4) Asesor1 pulsa **Deshacer**. | Deshacer no debe tocar un lote que ya es de otro, y debe liberar el lote Y. | Lote X queda **Disponible** aunque el lead de asesor2 lo tiene Apartado; lote Y queda **Apartado sin ningún lead**. Causa: el deshacer compara solo el estado del lote (`APARTADO`), no quién lo tiene, y solo restaura el lote del evento. | `salidas/n1-concurrencia.txt` (bloque D) |
| **B32** | A | Asesor en `/app/cotizador`: descuento 0, enganche 0 %, plazo 360, tasa 0 → Cotizar. | Un financiamiento sin intereses y sin enganche es un descuento: debería pedir autorización o tener tope. | Se genera la cotización (mensualidad $1,511 sobre $544,000, sin permiso). A 10 % anual su valor presente es ≈ $172 mil (≈ 68 % de descuento). El tope solo mira el descuento en pesos. | `salidas/n2-autorizaciones.txt` |
| **B33** | M | Admin en el inventario de un desarrollo pone **Disponible** a un lote con un lead Apartado/Vendido. | Advertir o bloquear. | Se acepta sin aviso; inventario y leads quedan contradictorios y el lote se puede ofrecer de nuevo (el índice único frena un segundo apartado, pero con error confuso). Visto en `f5` (lote 1 liberado a mano con MJ apartado). | `salidas/f5-apartado.txt` |
| **B34** | M | Sin `TRUSTED_PROXY`: 320 peticiones inválidas seguidas a `/api/public/leads` desde un cliente, y justo después un cliente real llena el formulario. | El bot no debería impedir a los reales. | Cliente real recibe **429 "Demasiadas solicitudes"** ~1 min (límite por organización de 300/min; sin límite por IP no se pueden separar). Sin esa variable tampoco hay límite por IP (30/30 aceptadas con IPs falsas). Con `xff:1` el límite por IP corta al bot a las 20 peticiones. | `salidas/n4b-dos-org.txt`, `n4-publico.txt` |
| **B35** | B | Dos asesores aparten el mismo lote en el mismo segundo (1 de 8 rondas). | "La unidad ya está apartada por otro cliente". | El perdedor ve **"Ocurrió un error inesperado. Intenta de nuevo."** y el servidor registra un `P2002` sin traducir (`leads_one_hold_per_unit`). Los datos quedan bien. | `salidas/n1-concurrencia.txt` ronda 4, `prod-server.log` |
| **B36** | M | Asesor pide descuento sobre el tope; el admin lo da de baja (con heredero); la solicitud sigue en la cola. | Cancelarla o reasignarla al heredero. | Queda **Pendiente**; si el admin la aprueba, la cotización sale a nombre del asesor inactivo y el correo va a su buzón. | `salidas/n3-baja.txt` |
| **B37** | B | Admin en `/app/leads` sin filtros → "Reasignar los leads de esta lista" → "Dejar sin asignar" → Reasignar. | Confirmación y/o deshacer (afecta a toda la organización). | Se ejecuta con un clic; 14 de 14 leads quedaron sin dueño; sin diálogo ni Deshacer. | `salidas/n3b-filtro.txt` |
| **B38** | M | Registrarse como cliente nuevo y mirar `/app`. | Pasos siguientes ("crea tu primer desarrollo, importa leads, invita asesores"). | Tablero de ceros sin guía. | `capturas/n7-02-inicio-nuevo-cel.png` |
| **B39** | B | `curl -I` de cualquier página. | `Content-Security-Policy` y `Strict-Transport-Security`. | Solo `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`. Sin CSP ni HSTS (HSTS puede poner el hosting). Con `X-Frame-Options: DENY` el formulario `/f/…` no se puede incrustar en un iframe. | `salidas/` (cabeceras en este reporte) |
| **B40** | B | iPhone/Android a 390 px: tocar un campo de Cotizador, filtros de Leads, Configuración, Desarrollos. | Campos de ≥16 px. | Campos de 14–15 px: Safari en iPhone hace zoom al enfocar. Además hay 57–206 objetivos táctiles <36 px (nombres del banner, tarjetas del pipeline). | `salidas/n5-movil.txt` |
| **B41** | B | Celular: mover una tarjeta → botón Deshacer. | Botón cómodo para 10 s. | Alto 32 px. | `capturas/n5-pipeline-deshacer-cel.png` |
| **B42** | B | Cotizar un lote y abrir el PDF. | "Lote 1". | Dice **"Lote Lote 1"** (tipo + código). Los acentos salen bien; el emoji del nombre se omite. | `salidas/n7-cotizacion.txt` |
| **B43** | B | Enviar el mismo teléfono nuevo vs. existente y medir. | Tiempo indistinguible. | Existente responde ~8–11 ms más rápido en 4 muestras (nuevo 21–26 ms vs 13–15 ms). Ruido de red lo oculta en la práctica; riesgo bajo. | `salidas/n4-publico.txt` |

Heredados sin cambio de estado: B19, B20, B22–B25, B27, B29, B30 (ver `REPORTE_QA.md`). B30: para correr el cron usé un secreto largo; tu `.env.local` sigue con 15 caracteres.

### Falsos positivos míos (los descarté tras investigarlos)
- "Reasignación masiva ignora el filtro": usé `?stage=` y el parámetro real es `?etapa=`; con el correcto respeta el filtro.
- "Umbral por etapa no surte efecto": hacía clic en el botón de otro formulario; con el botón correcto funciona.
- "PDF con caracteres rotos": era mi `pdftotext` sin `-enc UTF-8`.
- Desajuste de inventario en toda la organización demo: son restos de mis corridas de la pasada 1; las pruebas de este reporte miran solo los lotes involucrados.

## 4. Lo que SÍ resistió (sin cambios)
- Aislamiento entre organizaciones (UI, URL, IDs sustituidos, reasignar a otra organización con valor forzado, PDF y API de planos: 404).
- Roles: el asesor es redirigido de equipo, configuración, importar y campañas; reproducir acciones de administrador devuelve error de permiso.
- Venta por $1 y sin unidad bloqueadas para el asesor; venta bajo el tope queda pendiente de autorización.
- Descuento exacto en el tope pasa; $1 arriba queda pendiente; negativo y mayor al precio rechazados; repetir la petición no duplica solicitudes; doble aprobación simultánea crea 1 cotización.
- Baja de asesor: 0 leads/tareas abiertos con el inactivo, sesión y pestaña antiguas sin efecto, API 401/404, heredero inválido rechazado.
- Formulario público: honeypot, token falso, 413, JSON roto, llave de otra organización sin efecto, XSS almacenado inerte.

## 5. Lint, tipos y pruebas

| Comprobación | Árbol de trabajo (con tus planos) | Commit `f81eb0d` limpio (worktree) |
|---|---|---|
| `npm run lint` | 0 errores, 4 advertencias | 0 errores, 4 advertencias |
| `npm run typecheck` | OK | OK |
| `npx vitest run` | **28 archivos, 228 pruebas, OK** | **27 archivos, 220 pruebas, OK** |
| `next build` | OK | no ejecutado |

**Dependen de archivos sin commitear:** solo `tests/plans.test.ts` (8 pruebas), que importa `src/server/services/plans.ts` y `src/lib/plan-shape.ts`, ambos sin commitear. Ninguna otra prueba falla sin tu trabajo. Pero el **build** y el despliegue sí lo necesitan: la página de desarrollos modificada (`desarrollos/[id]/page.tsx`, `actions.ts`), `prisma/schema.prisma` y la migración `20261106193955_development_plan` están sin commitear; el commit actual no incluye la columna `plan_shape`. Las pruebas usan su propia base `_test`.

## 6. Lo que falta
- Autorización por el hueco de financiamiento (B32) y vigilancia de inventario (B31, B33).
- Guía de primer día (B38) y cola que se limpia al dar de baja (B36).
- CSP y límite por IP por defecto (B34, B39).
- Excel de exportación, apartado con vencimiento y notificaciones por WhatsApp/push (heredado).

## 7. Lo que sobra
- Al asesor el menú del celular le muestra "Autorizaciones" aunque solo vea su propio historial; útil, pero con la sección vacía la mayor parte del tiempo.
- El resumen diario manda correo aun a administradores sin leads fríos (13 correos en las 33 organizaciones de prueba).

## 8. Lo que NO pude probar
- WhatsApp real (Meta), Resend real, Anthropic real y plantilla de recuperación en Supabase de producción.
- Concurrencia entre dos instancias del servidor (usé una sola; el candado es el índice único de la base, no memoria).
- Safari/iPhone real: medí tamaños de fuente y objetivos, pero no el comportamiento del teclado ni del zoom.
- Rendimiento con 5,000 leads en esta pasada (no repetí la medición).
- Deshacer una **venta** tras liberar el lote a mano (el flujo existe; solo lo verifiqué en apartado, aunque la lógica es la misma que B31).
- Que `HSTS` y `Secure` se comporten tras un proxy HTTPS real (probé en `http://localhost`).
- Qué ve el segundo administrador en la doble aprobación simultánea: los datos quedan bien, pero no capturé el texto del mensaje.

## 9. Nota de entorno
El build de este reporte incluye tus archivos de planos sin commitear. Los servidores de prueba (3300, 3301) quedaron detenidos; el worktree temporal se eliminó (`node_modules` intacto). La base de desarrollo conserva datos de prueba nuevos (organizaciones `nuevo-…` y `qa-…`, leads reasignados en la org demo).
