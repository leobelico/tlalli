# PROGRESS — CRM de leads con WhatsApp para inmobiliarias (SLP)

## Plan por fases (estimado)

| Fase | Contenido | Estimado | Estado |
|---|---|---|---|
| 0 | Scaffold Next.js 16 + Prisma 7 + Supabase local + Tailwind 4 + Vitest, esquema de BD y RLS | 1 h | ✅ |
| 1 | Auth (Supabase), organizaciones, roles (admin/asesor), invitaciones | 2 h | ✅ |
| 2 | Desarrollos e inventario de unidades | 1 h | ✅ |
| 3 | Leads: captura manual, importación CSV, webhook público, campañas con código único, consentimiento | 2 h | ⏳ |
| 4 | Pipeline kanban con motivo de pérdida | 1.5 h | ⏳ |
| 5 | Tareas, recordatorios y alerta de lead "frío" (X horas configurables) | 1.5 h | ⏳ |
| 6 | WhatsApp: adaptador (simulado + Cloud API), plantillas, webhook entrante | 2 h | ⏳ |
| 7 | Cotizador (enganche, mensualidades, plazo) + PDF | 1 h | ⏳ |
| 8 | Dashboard de métricas | 1.5 h | ⏳ |
| 9 | Landing y precios públicos | 1 h | ⏳ |
| 10 | README, .env.example, riesgos | 0.5 h | ⏳ |

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
