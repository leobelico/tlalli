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
