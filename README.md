# Pórtico — CRM inmobiliario con WhatsApp e IA

SaaS multi-tenant para inmobiliarias y desarrolladoras de México: saber qué campaña (radio, espectaculares, redes, portales, referidos…) trajo a cada lead, no dejar que ninguno se enfríe y, en el plan Élite, apoyarse en un asistente de IA. Producto en español de México; código y commits en inglés. "Pórtico" y `hola@portico.mx` son marcadores de posición: no se ha verificado marca ni dominio (`src/lib/brand.ts`).

**Stack:** Next.js 16 (App Router) · TypeScript · Prisma 7 · Supabase (Postgres 17 + Auth) · Tailwind 4 · Vitest · SDK de Anthropic (solo para el plan Élite).

## Qué incluye

Auth y organizaciones con roles (admin/asesor) e invitaciones · desarrollos e inventario · leads (manual, CSV, webhook público, formulario hospedado) con campaña de origen y consentimiento LFPDPPP · pipeline kanban con motivo de pérdida · tareas y alerta de lead frío configurable · WhatsApp (adaptador simulado + Cloud API de Meta) · cotizador con PDF · dashboard · landing y precios · **plan Élite IA** (asistente por lead con resumen, temperatura, siguiente paso y borrador de WhatsApp; análisis de métricas; cuota de 500 consultas al mes).

Bitácora por fase, pendientes y cómo probar cada cosa: [PROGRESS.md](PROGRESS.md). Decisiones tomadas ante ambigüedades: [DECISIONS.md](DECISIONS.md). Conectar WhatsApp real: [docs/WHATSAPP.md](docs/WHATSAPP.md).

## Requisitos

- Node.js 22+ y npm
- Docker Desktop (para Supabase local)

## Cómo correrlo

```bash
npm install                       # también genera el cliente de Prisma
npx supabase start                # Postgres + Auth locales (primera vez descarga imágenes)
cp .env.example .env.local        # completa NEXT_PUBLIC_SUPABASE_ANON_KEY con `npx supabase status`
npx prisma migrate deploy         # tablas + políticas RLS
npm run db:seed                   # datos de prueba inventados (requiere SUPABASE_SERVICE_ROLE_KEY en .env.local)
npm run dev                       # http://localhost:3010
```

> El puerto es **3010** a propósito: en Windows el 3000 suele estar ocupado y Hyper-V reserva el rango 3093–3989. Si cambias el puerto, actualiza también `APP_URL` y `site_url` en `supabase/config.toml`.

Cuentas del seed (contraseña `Demo1234!`): `admin@potosi.ejemplo.test`, `asesor1@potosi.ejemplo.test`, `asesor2@potosi.ejemplo.test` (organización 1) y `admin@lomas.ejemplo.test`, `asesor@lomas.ejemplo.test` (organización 2). El correo de Auth local llega a http://127.0.0.1:54324 (Mailpit).

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` / `build` / `start` | Desarrollo / build / producción (puerto 3010) |
| `npm run lint` | ESLint (incluye la regla que restringe el cliente Prisma sin RLS) |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm test` | Vitest contra su **propia base `inmobiliaria_test`** en el Postgres local (**requiere `supabase start`**); se crea, migra y vacía sola, y no toca tus datos de desarrollo |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:seed` | Seed idempotente (solo Supabase local) |
| `npm run db:reset` | Borra y recrea la base local |

## Variables de entorno

Ver [.env.example](.env.example) (comentado). Solo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` llegan al navegador; la anon key es pública por diseño porque ninguna tabla es legible con ella. Todo lo demás (`DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WHATSAPP_*`, `ANTHROPIC_API_KEY`) vive solo en el servidor.

**IA:** pon `ANTHROPIC_API_KEY` y la organización en plan `ELITE` (el seed deja la demo "Desarrollos del Potosí" en Élite). Modelo por defecto `claude-opus-5-5`; cambia `AI_MODEL` para usar uno más barato. La IA solo propone (nunca envía mensajes), no recibe teléfono, correo ni apellido, y cada consulta se cuenta en `ai_usage`.

## Arquitectura en 60 segundos

- **Aislamiento entre organizaciones en dos capas.** (1) Row Level Security en Postgres: cada tabla con `organization_id` tiene una política contra `app.org_id`. (2) Toda consulta de negocio pasa por `withOrg(orgId, tx => …)` (`src/server/db/tenant.ts`), que abre una transacción, cambia al rol `app_rls` (sujeto a RLS) y fija la organización. Aunque falte un `where`, la base no devuelve filas ajenas. El cliente "raíz" sin RLS solo se puede importar desde `src/server/db`, `auth` y `public` (regla de ESLint) para sesión, invitaciones y enrutamiento de webhooks públicos.
- **Permisos por rol** en `src/server/auth/permissions.ts`; el asesor solo ve y trabaja los leads que tiene asignados.
- **Servicios** en `src/server/services/*` reciben un contexto autenticado (`Ctx`) y validan permisos; las páginas y server actions son delgadas. Entradas validadas con Zod.
- **Rutas públicas**: `POST /api/public/leads` (formularios web), `/f/[slug]` (formulario hospedado), `/api/webhooks/whatsapp` (firma HMAC obligatoria).
- Sin secretos en el cliente; PostgREST de Supabase bloqueado para `anon`/`authenticated`.

## Pruebas

133 pruebas de integración y unitarias (`tests/`): aislamiento RLS entre organizaciones, permisos por rol e invitaciones, webhook de leads, CSV, pipeline, tareas/alertas, WhatsApp (firma, idempotencia, ventana de 24 h), cálculo del cotizador, PDF, dashboard y el asistente de IA (con un proveedor simulado: cuota, plan, privacidad del prompt, permisos). Además verifiqué cada fase de punta a punta en un navegador headless con scripts desechables (no incluidos en el repo; ver riesgo 9).

## Riesgos y pendientes antes de vender a un cliente real

1. **No hay cobro ni control de la prueba.** Los planes y la prueba de 14 días no se aplican: nadie paga ni expira, y cambiar de plan (incluido pasar a Élite) es manual en la base. Hace falta un procesador de pagos (Stripe, Conekta o Mercado Pago), facturación CFDI y suspensión por falta de pago.
2. **La IA no se ha probado contra la API real.** Se probó con un proveedor simulado y compila contra el SDK, pero no hubo llave de Anthropic durante el desarrollo: faltan pruebas de calidad con conversaciones reales, ajuste de prompts, medir costo y latencia por consulta (el plan Élite debe cubrirlo) y decidir el modelo definitivo. El aviso de privacidad de cada cliente debe mencionar el uso de proveedores de IA, y faltan evaluaciones de alucinaciones y de prompt injection más allá de las defensas básicas implementadas.
3. **Legal/LFPDPPP sin revisar por un abogado.** Términos, aviso de privacidad de la plataforma y la plantilla de aviso para inmobiliarias son borradores. Falta el flujo completo de derechos ARCO (hoy solo se puede eliminar un lead), exportar los datos de un titular y un contrato de encargo de datos con cada cliente.
4. **WhatsApp real sin probar.** El proveedor Cloud API está probado con `fetch` simulado, nunca contra Meta. Falta verificar el negocio en Meta, aprobar las plantillas, y manejar tokens por organización (hoy una sola app para todos), multimedia, reintentos de envíos fallidos y cobros de conversaciones.
5. **Falta recuperación de contraseña y correo transaccional.** No hay "olvidé mi contraseña", ni correos propios (invitaciones por enlace manual, recordatorios solo dentro de la app), ni 2FA ni cierre de sesión remoto.
6. **Seguridad y operación por endurecer.** Rate limiting en memoria (usar Redis/Upstash con varias instancias); el webhook público de leads solo tiene honeypot y límite por IP (sin captcha); sin CSP ni bitácora de auditoría; sin pentest; sin monitoreo de errores, logs centralizados ni plan de respaldos probado. En producción hay que usar el pooler de transacciones (`?pgbouncer=true`) y asegurar que el rol `postgres` no sea accesible desde el exterior.
7. **Escalabilidad no medida.** El dashboard y el embudo agregan en memoria de la aplicación; no hay pruebas con decenas de miles de leads ni índices revisados con `EXPLAIN`. El costo por lead usa el gasto total de la campaña sin prorratear por fechas.
8. **Reglas de negocio simplificadas.** Un lead es una persona/teléfono; atribución *first-touch*; zona horaria fija de CDMX; sin reasignación masiva al desactivar a un asesor; sin importar/exportar inventario; el cotizador no contempla pagos extraordinarios ni créditos hipotecarios; las plantillas de WhatsApp viven en código.
9. **Cobertura de pruebas y CI.** No hay pruebas E2E automatizadas en el repo (las hice con scripts desechables), ni CI, ni pruebas de accesibilidad o rendimiento. El PDF del cotizador no lo revisé visualmente.
10. **Marca, dominio y mercado sin validar.** "Pórtico" y `hola@portico.mx` son marcadores (sin búsqueda de marca ni dominio); los precios ($1,490 / $3,490 / $6,990 / $12,990) y el límite de 500 consultas de IA son propuestas sin validar con clientes; no hay onboarding asistido, documentación de usuario ni soporte definido, y hace falta una prueba piloto con una desarrolladora real.
