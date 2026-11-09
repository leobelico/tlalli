// Checks that only make sense on the PRODUCTION build (next start): cookies, headers, error pages, cron.
import { browser, login, BASE, sql } from './lib.mjs';
import fs from 'fs';

let failures = 0;
const fail = (m) => { failures++; console.error('FAIL:', m); };
const ok = (m) => console.log('ok  :', m);
const env = fs.readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
// QA_CRON_SECRET: the value the server under test was started with (the endpoint needs 16+ characters)
const cronSecret = process.env.QA_CRON_SECRET || (env.match(/^CRON_SECRET=(.*)$/m) ?? [])[1]?.trim().replace(/^["']|["']$/g, '');

// 1) response headers on a public page
const res = await fetch(BASE + '/login');
if (res.headers.get('x-powered-by')) fail('expone x-powered-by: ' + res.headers.get('x-powered-by')); else ok('sin cabecera x-powered-by');
const html = await res.text();
// (a chunk named turbopack-<hash>.js is the normal runtime of a production build, not a dev leftover)
if (/__nextjs_original-stack|webpack-hmr|_next\/static\/development|react-refresh|\/_next\/webpack-hmr/i.test(html)) fail('el HTML trae restos de modo desarrollo'); else ok('el HTML de /login no trae restos de desarrollo');

// 2) session cookies after a real login
const b = await browser();
const { ctx, p } = await login(b, 'admin@potosi.ejemplo.test');
await p.goto(BASE + '/app');
const cookies = await ctx.cookies();
for (const c of cookies) {
  const flags = [c.httpOnly ? 'HttpOnly' : 'sin HttpOnly', c.secure ? 'Secure' : 'sin Secure', `SameSite=${c.sameSite}`].join(', ');
  console.log('     cookie', c.name.slice(0, 40), '->', flags);
}
const org = cookies.find((c) => c.name === 'org_id');
if (org && (!org.httpOnly || org.sameSite === 'None')) fail('la cookie org_id no es HttpOnly/SameSite');
else ok('cookie org_id: ' + (org ? 'HttpOnly + SameSite=' + org.sameSite + (org.secure ? ' + Secure' : ' (sin Secure: es http://localhost)') : 'no presente'));
const auth = cookies.filter((c) => /^sb-.*auth-token/.test(c.name));
if (!auth.length) fail('no se encontró la cookie de sesión de Supabase');
else if (auth.some((c) => !c.httpOnly)) fail('la cookie de sesión de Supabase es legible desde scripts (sin HttpOnly)');
else if (auth.some((c) => c.sameSite === 'None')) fail('la cookie de sesión tiene SameSite=None');
else ok('cookie de sesión de Supabase: HttpOnly + SameSite=' + auth[0].sameSite + (auth.every((c) => c.secure) ? ' + Secure' : ' (sin Secure: es http://localhost)'));

// 3) error pages in production are in Spanish and do not leak stack traces
const nf = await p.goto(BASE + '/app/leads/00000000-0000-4000-8000-000000000000');
const t = await p.evaluate(() => document.body.innerText);
if (nf.status() !== 404 || !/No encontramos/.test(t)) fail('404 de producción: ' + nf.status() + ' ' + t.slice(0, 80)); else ok('404 en español, sin detalles técnicos');
const bad = await p.goto(BASE + '/app/desarrollos/no-es-un-uuid');
const t2 = await p.evaluate(() => document.body.innerText);
if (/at\s+\S+\s+\(|node_modules|PrismaClient|Invalid `/.test(t2)) fail('un error filtra detalles técnicos: ' + t2.slice(0, 120)); else ok('un ID inválido no filtra detalles técnicos (' + bad.status() + ')');

// 4) daily digest endpoint
const anon = await fetch(BASE + '/api/cron/daily-digest');
if (anon.status !== 401) fail('el cron responde ' + anon.status + ' sin secreto'); else ok('cron sin secreto: 401');
const wrong = await fetch(BASE + '/api/cron/daily-digest', { headers: { authorization: 'Bearer incorrecto-incorrecto' } });
if (wrong.status !== 401) fail('el cron responde ' + wrong.status + ' con secreto incorrecto'); else ok('cron con secreto incorrecto: 401');
if (cronSecret && cronSecret.length >= 16) {
  const good = await fetch(BASE + '/api/cron/daily-digest', { headers: { authorization: `Bearer ${cronSecret}` } });
  const body = await good.json().catch(() => ({}));
  if (good.status !== 200 || body.ok !== true) fail('el cron con el secreto correcto falló: ' + good.status + ' ' + JSON.stringify(body)); else ok('cron con el secreto correcto: 200 ' + JSON.stringify(body));
} else fail('CRON_SECRET no está configurado o mide menos de 16 caracteres (' + (cronSecret?.length ?? 0) + '): el cron del resumen diario quedaría cerrado');

// 5) the public form answers the same for new and existing phones (B15) on the real build
const key = (await sql("select lead_form_key k from organizations where slug='demo-potosi'"))[0].k;
const phone = '444' + String(Date.now()).slice(-7);
const post = (extra = {}) => fetch(BASE + '/api/public/leads', { method: 'POST', headers: { 'content-type': 'application/json', 'x-form-key': key }, body: JSON.stringify({ nombre: 'Prod', telefono: phone, acepta_privacidad: true, ...extra }) });
const [r1, r2] = [await post(), await post({ mensaje: 'otra vez' })];
const [j1, j2] = [await r1.json(), await r2.json()];
if (r1.status !== r2.status || JSON.stringify(j1) !== JSON.stringify(j2) || 'id' in j1) fail('el formulario público distingue nuevo/existente'); else ok('formulario público: misma respuesta para nuevo y existente');

await b.close();
console.log(failures ? `\n${failures} fallas` : '\nTodo OK');
process.exitCode = failures ? 1 : 0;
