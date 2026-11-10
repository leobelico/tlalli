// B34/B39 sobre el build de producción: cabeceras (CSP), incrustación del formulario solo donde se permite, carriles del límite.
import http from 'http';
import { browser, login } from './lib.mjs';
import { log, fail, ok, finish, sql, shot, BASE } from './n-lib.mjs';
const slug = 'demo-potosi';
const org = (await sql("select id, lead_form_key k from organizations where slug=$1", [slug]))[0];
const head = async (path) => { const r = await fetch(BASE + path, { redirect: 'manual' }); return Object.fromEntries([...r.headers.entries()].map(([k, v]) => [k.toLowerCase(), v])); };

// 1) cabeceras
for (const path of ['/login', '/app', '/registro']) {
  const h = await head(path);
  const csp = h['content-security-policy'] ?? '';
  console.log(`   ${path.padEnd(10)} CSP: ${csp.slice(0, 90)}… | XFO: ${h['x-frame-options']} | nosniff: ${h['x-content-type-options']}`);
  if (!/default-src 'self'/.test(csp) || !/frame-ancestors 'none'/.test(csp) || !/object-src 'none'/.test(csp)) fail(`${path}: falta una directiva clave del CSP`);
  if (h['x-frame-options'] !== 'DENY') fail(`${path}: sin X-Frame-Options`);
}
const api = await head('/api/public/leads');
log('API pública (sin CSP a propósito para el visor de PDF):', api['content-security-policy'] ?? '(sin CSP)', '| XFO', api['x-frame-options']);
const form0 = await head('/f/' + slug);
log('formulario por defecto:', form0['content-security-policy']?.match(/frame-ancestors[^;]*/)?.[0], '| XFO', form0['x-frame-options']);
if (!/frame-ancestors 'none'/.test(form0['content-security-policy'] ?? '') || form0['x-frame-options'] !== 'DENY') fail('el formulario alojado se puede incrustar por defecto');
const res = await fetch(BASE + '/login'); const html = await res.text();
log('HSTS desde la aplicación (lo debe poner el hosting):', res.headers.get('strict-transport-security') ?? '(no)');

// 2) la app sigue funcionando con el CSP (sin violaciones en consola)
const b = await browser();
const adm = await login(b, 'admin@potosi.ejemplo.test', { width: 1280, height: 800 });
const violations = [];
adm.p.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text().slice(0, 160)); });
for (const path of ['/app', '/app/leads', '/app/pipeline', '/app/cotizador', '/app/configuracion', '/app/desarrollos', '/app/equipo']) { await adm.p.goto(BASE + path); await adm.p.waitForTimeout(600); }
log('violaciones del CSP en la consola del navegador en 7 pantallas:', violations.length, JSON.stringify(violations.slice(0, 3)));
if (violations.length) fail('el CSP bloquea recursos de la propia aplicación: ' + violations[0]);

// 3) incrustación: página padre en otro origen (puerto 8123) con un iframe del formulario
const parent = http.createServer((req, res) => { res.setHeader('content-type', 'text/html'); res.end(`<h1>Sitio del cliente</h1><iframe id=f src="${BASE}/f/${slug}" width=400 height=500></iframe>`); }).listen(8123);
const ctx2 = await b.newContext({ viewport: { width: 900, height: 700 } });
const framed = async (origin) => {
  const pg = await ctx2.newPage();
  await pg.goto(origin + '/'); await pg.waitForTimeout(1800);
  const f = pg.frames().find((x) => x !== pg.mainFrame());
  const loaded = !!f && f.url().startsWith(BASE) && /Déjanos tus datos|Solicita/i.test(await f.content().catch(() => ''));
  if (origin.includes('localhost')) await shot(pg, 'r6-iframe-' + (loaded ? 'permitido' : 'bloqueado'), false);
  await pg.close();
  return loaded;
};
const before = await framed('http://localhost:8123');
log('iframe desde http://localhost:8123 por defecto:', before ? 'SE MUESTRA' : 'bloqueado');
if (before) fail('el formulario se incrusta sin permiso');
// el administrador permite solo ese sitio (por la pantalla de Configuración)
await adm.p.goto(BASE + '/app/configuracion');
await adm.p.locator('summary', { hasText: 'Avanzado' }).click();
await adm.p.fill('textarea[name=origins]', 'http://localhost:8123/cualquier/ruta');
await adm.p.getByRole('button', { name: 'Guardar sitios' }).click(); await adm.p.waitForTimeout(2000);
log('mensaje al guardar:', (await adm.p.locator('[role=status], .text-emerald-700').allInnerTexts()).join(' | ').slice(0, 140));
await shot(adm.p, 'r6-configuracion-incrustar', false);
await new Promise((r) => setTimeout(r, 31000)); // el proxy cachea 30 s por organización
const allowed = await framed('http://localhost:8123');
const other = await framed('http://127.0.0.1:8123');
const fh = await head('/f/' + slug);
log('con permiso: localhost:8123 ->', allowed ? 'se muestra' : 'BLOQUEADO', '| 127.0.0.1:8123 (no permitido) ->', other ? 'SE MUESTRA' : 'bloqueado', '| cabecera:', fh['content-security-policy']?.match(/frame-ancestors[^;]*/)?.[0], '| XFO:', fh['x-frame-options'] ?? '(ninguna)');
if (!allowed) fail('el sitio permitido no puede incrustar el formulario');
if (other) fail('un sitio NO permitido pudo incrustar el formulario');
if (allowed && !other) ok('el formulario se incrusta solo en el sitio que el cliente permitió');
// entrada inválida
await adm.p.fill('textarea[name=origins]', '*');
await adm.p.getByRole('button', { name: 'Guardar sitios' }).click(); await adm.p.waitForTimeout(1500);
log('"*" ->', (await adm.p.locator('[role=alert], .text-red-700').allInnerTexts()).join(' | ').slice(0, 160));
// restaurar
await adm.p.fill('textarea[name=origins]', '');
await adm.p.getByRole('button', { name: 'Guardar sitios' }).click(); await adm.p.waitForTimeout(1500);
parent.close();

// 4) carriles: un script saturando la API no deja sin formulario a quien usa el formulario alojado
await new Promise((r) => setTimeout(r, 62000));
const page = await (await fetch(`${BASE}/f/${slug}`)).text();
const token = page.match(/name="_t" value="([^"]+)"/)?.[1];
const formKey = page.match(/name="form_key" value="([^"]+)"/)?.[1];
await new Promise((r) => setTimeout(r, 3000)); // tiempo mínimo de llenado
const codes = {};
for (let i = 0; i < 120; i++) { const r = await fetch(BASE + '/api/public/leads', { method: 'POST', headers: { 'content-type': 'application/json', 'x-form-key': org.k }, body: JSON.stringify({ nombre: 'x', telefono: 'abc', acepta_privacidad: false }) }); codes[r.status] = (codes[r.status] || 0) + 1; }
log('120 peticiones de un script sin marca ->', JSON.stringify(codes));
if (!codes[429]) fail('el carril de scripts nunca se limitó');
const phone = '444' + String(Date.now()).slice(-7);
const human = await fetch(BASE + '/api/public/leads', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ form_key: formKey, nombre: 'Persona Real', telefono: phone, acepta_privacidad: 'on', _t: token, redirect: '' }), redirect: 'manual' });
log('una persona usa el formulario alojado justo después ->', human.status, '| lead creado:', (await sql("select count(*)::int n from leads where phone like $1 and organization_id=$2", ['%' + phone.slice(-10), org.id]))[0].n);
if (human.status === 429 || (await sql("select count(*)::int n from leads where phone like $1 and organization_id=$2", ['%' + phone.slice(-10), org.id]))[0].n !== 1) fail('B34: el script dejó sin formulario a la persona real');
else ok('B34: la persona real pudo enviar el formulario mientras un script saturaba la API');
await b.close();
finish();
