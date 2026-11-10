# Subir Tlalli a tlalli.site (en orden)

Este documento aplica la parte 2 y 3 de `docs/PILOTO.md` a tu dominio. Se asume **Vercel** (el repositorio ya trae `vercel.json` con el resumen diario) y **Supabase** para la base de datos. Hay cosas que solo puedes hacer tú porque piden tus cuentas.

> Estado al escribir esto: `tlalli.site` aún no responde en DNS (consulta sin respuesta), no hay Supabase de producción ni proyecto en Vercel, y los 2 últimos commits no están en GitHub (`git push origin master`).

## 1. Código en GitHub
`git push origin master` (repositorio `leobelico/tlalli`).

## 2. Base de datos de producción (Supabase)
1. supabase.com → *New project* (región us-east). Guarda la contraseña de la base.
2. *Project Settings → Database*: copia la conexión **directa** (puerto 5432) y la del **pooler de transacciones** (6543).
3. Desde tu computadora, con la conexión directa:
   ```bash
   DIRECT_URL="postgresql://postgres:CONTRASEÑA@db.XXXX.supabase.co:5432/postgres" npx prisma migrate deploy
   ```
   Debe terminar con *All migrations have been successfully applied* (hoy son 13).
   - **Si dice `P1001: Can't reach database server`:** la conexión directa de Supabase es solo IPv6 y muchas redes no la tienen. Usa el **Session pooler** (Connect → Session pooler): host `aws-0-us-east-2.pooler.supabase.com`, puerto `5432`, usuario `postgres.zvtkyzrwkwailudhcnvb` (esta es la de tu proyecto).
   - **Contraseña con símbolos** (`?`, `@`, `#`, `/`…): en la URL van codificados (`?` → `%3F`, `@` → `%40`, `#` → `%23`). Lo más fácil es usar una contraseña solo de letras y números.
   - **En PowerShell** el prefijo `VARIABLE=valor comando` no existe; usa `$env:DIRECT_URL="postgresql://…"; npx prisma migrate deploy`.
4. En el editor SQL verifica: `select rolname from pg_roles where rolname='app_rls';` (1 fila) y `select indexname from pg_indexes where indexname='leads_one_hold_per_unit';` (1 fila). Si falta `app_rls`, no sigas.
5. *Authentication → URL Configuration*: **Site URL** `https://tlalli.site` y en *Redirect URLs* `https://tlalli.site/**`.
6. *Authentication → Emails → Reset password*: asunto `Crea tu contraseña nueva en Tlalli` y pega el contenido de `supabase/templates/recovery.html`.

## 3. Proyecto en Vercel
1. vercel.com → *Add New → Project* → importa `leobelico/tlalli`. Framework: Next.js (Node 22).
2. *Settings → Environment Variables* (Production):

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zvtkyzrwkwailudhcnvb.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | la llave `sb_publishable_…` de tu proyecto (pública por diseño; la app también acepta `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `DATABASE_URL` | `postgresql://postgres.zvtkyzrwkwailudhcnvb:CONTRASEÑA@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true` (transaction pooler; la contraseña codificada si tiene símbolos) |
| `APP_URL` | `https://tlalli.site` (sin diagonal final) |
| `TRUSTED_PROXY` | `vercel` |
| `CRON_SECRET` | 32+ caracteres: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"` |
| `FORM_TOKEN_SECRET` | otros 32+ caracteres, distintos |
| `EMAIL_PROVIDER` / `RESEND_API_KEY` / `EMAIL_FROM` | `resend` / tu llave / `Tlalli <ventas@koatlcyber.com>` |
| `WHATSAPP_PROVIDER` | `mock` hasta tener número real de Meta |

   **No** definas `SUPABASE_SERVICE_ROLE_KEY`.
3. *Deploy*.

## 4. Dominio tlalli.site
1. Vercel → *Settings → Domains* → agrega `tlalli.site` y `www.tlalli.site` (redirige www al dominio principal).
2. En el panel de DNS de donde compraste el dominio crea los registros que Vercel te muestre. Normalmente: `A` `@` → `76.76.21.21` y `CNAME` `www` → `cname.vercel-dns.com`. **Usa los valores que te muestre Vercel**, no estos de memoria. Si Vercel te da *nameservers*, cámbialos en el registrador en su lugar.
3. Espera la propagación (minutos a unas horas). Vercel emite el HTTPS solo.

## 5. Correos (Resend)
Resend → *Domains* → verifica `koatlcyber.com` (registros SPF y DKIM en su DNS). Sin esto las invitaciones y avisos no salen. (Si más adelante quieres `@tlalli.site`, se verifica igual y cambias `EMAIL_FROM`.)

## 6. Comprobar que quedó bien
```bash
curl -sI https://tlalli.site/login | grep -i -E "^HTTP|content-security|x-frame"
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer TU_CRON_SECRET" https://tlalli.site/api/cron/daily-digest   # 200
```
Luego, en el navegador: registra tu cuenta en `/registro`, crea un desarrollo, importa un CSV, invita a un asesor (que llegue el correo), cotiza y abre el PDF. Prueba "Olvidé mi contraseña" desde otro navegador.

## 7. Después de comprobar
- **HSTS:** actívalo (Vercel → *Settings → Security*, o `Strict-Transport-Security: max-age=31536000; includeSubDomains`) solo cuando confirmes que todo funciona por HTTPS: el navegador lo recuerda un año.
- Búsqueda de marca "Tlalli" en el IMPI.
- Respaldos diarios de Supabase y una prueba de restauración.

## Organización de demostración (opcional, en el Supabase de producción)
Carga **una** organización inventada ("Demo Tlalli · Lomas del Altiplano": 3 desarrollos con 46 unidades, el plano de lotes del desarrollo Los Pinos, 8 campañas, 120 leads con historial, 45 tareas) con tres accesos `demo.admin@`, `demo.asesor1@` y `demo.asesor2@tlalli.site`. Se vuelve a correr sin duplicar (borra y recrea solo esa organización y esos tres accesos):

```powershell
$env:DEMO_HOSTED="1"; $env:DEMO_PASSWORD="UnaContraseñaDeAlMenos12"; $env:DATABASE_URL="postgresql://postgres.zvtkyzrwkwailudhcnvb:CONTRASEÑA@aws-0-us-east-2.pooler.supabase.com:5432/postgres"; npx tsx prisma/seed.ts
```
Usa el pooler de sesión (5432) para este comando. No necesita la llave de servicio. Bórrala del proyecto cuando entregues el sistema a una desarrolladora real.
