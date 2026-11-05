# Prospecta — CRM de leads con WhatsApp para inmobiliarias (SLP)

SaaS multi-tenant para inmobiliarias y desarrolladoras de San Luis Potosí: saber de qué campaña llegó cada lead y no dejar que ninguno se enfríe. Producto en español de México; código y commits en inglés. "Prospecta" es un nombre provisional (`src/lib/brand.ts`).

**Stack:** Next.js 16 (App Router) · TypeScript · Prisma 7 · Supabase (Postgres 17 + Auth) · Tailwind 4 · Vitest.

## Qué incluye

Auth y organizaciones con roles (admin/asesor) e invitaciones · desarrollos e inventario · leads (manual, CSV, webhook público, formulario hospedado) con campaña de origen y consentimiento LFPDPPP · pipeline kanban con motivo de pérdida · tareas y alerta de lead frío configurable · WhatsApp (adaptador simulado + Cloud API de Meta) · cotizador con PDF · dashboard · landing y precios.

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
| `npm test` | Vitest contra la base local (**requiere `supabase start`**) |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:seed` | Seed idempotente (solo Supabase local) |
| `npm run db:reset` | Borra y recrea la base local |

## Variables de entorno

Ver [.env.example](.env.example) (comentado). Solo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` llegan al navegador; la anon key es pública por diseño porque ninguna tabla es legible con ella. Todo lo demás (`DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WHATSAPP_*`) vive solo en el servidor.

## Arquitectura en 60 segundos

- **Aislamiento entre organizaciones en dos capas.** (1) Row Level Security en Postgres: cada tabla con `organization_id` tiene una política contra `app.org_id`. (2) Toda consulta de negocio pasa por `withOrg(orgId, tx => …)` (`src/server/db/tenant.ts`), que abre una transacción, cambia al rol `app_rls` (sujeto a RLS) y fija la organización. Aunque falte un `where`, la base no devuelve filas ajenas. El cliente "raíz" sin RLS solo se puede importar desde `src/server/db`, `auth` y `public` (regla de ESLint) para sesión, invitaciones y enrutamiento de webhooks públicos.
- **Permisos por rol** en `src/server/auth/permissions.ts`; el asesor solo ve y trabaja los leads que tiene asignados.
- **Servicios** en `src/server/services/*` reciben un contexto autenticado (`Ctx`) y validan permisos; las páginas y server actions son delgadas. Entradas validadas con Zod.
- **Rutas públicas**: `POST /api/public/leads` (formularios web), `/f/[slug]` (formulario hospedado), `/api/webhooks/whatsapp` (firma HMAC obligatoria).
- Sin secretos en el cliente; PostgREST de Supabase bloqueado para `anon`/`authenticated`.

## Pruebas

123 pruebas de integración y unitarias (`tests/`): aislamiento RLS entre organizaciones, permisos por rol e invitaciones, webhook de leads, CSV, pipeline, tareas/alertas, WhatsApp (firma, idempotencia, ventana de 24 h), cálculo del cotizador, PDF y dashboard. Además verifiqué cada fase de punta a punta en un navegador headless con scripts desechables (no incluidos en el repo; ver riesgo 9).

## Riesgos y pendientes antes de vender a un cliente real

1. **No hay cobro ni control de la prueba.** Los planes y la prueba de 14 días no se aplican: nadie paga ni expira, y cambiar de plan es manual en la base. Hace falta un procesador de pagos (Stripe, Conekta o Mercado Pago), facturación CFDI y suspensión por falta de pago.
2. **Legal/LFPDPPP sin revisar por un abogado.** Términos, aviso de privacidad de la plataforma y la plantilla de aviso para inmobiliarias son borradores. Falta el flujo completo de derechos ARCO (hoy solo se puede eliminar un lead), exportar los datos de un titular y un contrato de encargo de datos con cada cliente.
3. **WhatsApp real sin probar.** El proveedor Cloud API está probado con `fetch` simulado, nunca contra Meta. Falta verificar el negocio en Meta, aprobar las plantillas, y manejar: tokens por organización (hoy una sola app para todos), descarga de multimedia, reintentos de envíos fallidos y cobros de conversaciones. Un número mal conectado o plantillas rechazadas bloquean la propuesta de valor.
4. **Falta recuperación de contraseña y correo transaccional.** No hay "olvidé mi contraseña", ni correos propios (invitaciones se comparten por enlace manual, recordatorios solo dentro de la app). Tampoco hay 2FA ni cierre de sesión remoto.
5. **Seguridad por endurecer.** Rate limiting en memoria (no sirve con varias instancias; usar Redis/Upstash); el webhook público de leads solo tiene honeypot y límite por IP (sin captcha; riesgo de spam); sin CSP; sin bitácora de auditoría de quién cambió qué; sin pentest. En producción hay que confirmar que `DATABASE_URL` use el pooler de transacciones (`?pgbouncer=true`) y que el rol `postgres` no sea accesible desde el exterior.
6. **Operación y respaldos.** No hay monitoreo de errores (Sentry), alertas, logs centralizados ni plan de respaldos/restauración probado; la base de Supabase debe tener backups diarios/PITR y se debe ensayar la restauración.
7. **Escalabilidad no medida.** El dashboard y el embudo agregan en memoria de la aplicación y las listas están paginadas a 50, pero no hay pruebas con decenas de miles de leads ni índices revisados con `EXPLAIN`. El costo por lead usa el gasto total de la campaña sin prorratear por fechas, por lo que en periodos cortos sale inflado.
8. **Reglas de negocio simplificadas.** Un lead es una sola persona/teléfono (sin varios contactos por familia ni varias unidades por lead); atribución *first-touch* únicamente; zona horaria fija de CDMX; sin reasignación masiva cuando se desactiva a un asesor; sin importar/exportar inventario; el cotizador no contempla mensualidades diferidas, pagos extraordinarios ni créditos hipotecarios; las "plantillas" de WhatsApp viven en código.
9. **Cobertura de pruebas y CI.** No hay pruebas E2E automatizadas en el repo (las hice con scripts desechables), ni CI que corra lint/typecheck/tests en cada cambio, ni pruebas de accesibilidad ni de rendimiento. El PDF del cotizador se genera y valida, pero su diseño no lo revisé visualmente.
10. **Marca, dominio y mercado sin validar.** "Prospecta" y `hola@prospecta.mx` son marcadores de posición (sin búsqueda de marca ni dominio); los precios ($1,490 / $3,490 / $6,990) son una propuesta mía sin validar con clientes; no hay onboarding asistido, documentación de usuario ni soporte definido, y hace falta una prueba piloto con una desarrolladora real antes de escalar.
