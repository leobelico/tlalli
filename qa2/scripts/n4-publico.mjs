// Pasada 2, punto 4: formulario público (respuesta igual, límites, X-Forwarded-For, XSS, llaves), con dos servidores:
//   3300 = TRUSTED_PROXY sin configurar   3301 = TRUSTED_PROXY=xff:1
import { browser, login } from './lib.mjs';
import { log, fail, ok, finish, sql, shot } from './n-lib.mjs';
const orgA = (await sql("select id, lead_form_key k, slug from organizations where slug='demo-potosi'"))[0];
const orgB = (await sql("select id, lead_form_key k, slug, name from organizations where slug<>'demo-potosi' order by created_at desc limit 1"))[0];
const phoneN = () => '444' + String(Math.floor(Math.random() * 1e7)).padStart(7, '0');
const post = (base, body, headers = {}) => fetch(base + '/api/public/leads', { method: 'POST', headers: { 'content-type': 'application/json', 'x-form-key': orgA.k, ...headers }, body: JSON.stringify(body) });
const lite = async (r) => ({ s: r.status, b: await r.text(), h: [...r.headers.entries()].filter(([k]) => !/^(date|content-length|etag)$/i.test(k)).map(([k, v]) => `${k}=${v}`).sort().join(';') });

for (const [name, base, spoofIsTrusted] of [['sin TRUSTED_PROXY (puerto 3300)', 'http://localhost:3300', false], ['TRUSTED_PROXY=xff:1 (puerto 3301)', 'http://localhost:3301', true]]) {
  log('=========', name);
  // 1) mismo cuerpo/estatus/cabeceras para teléfono nuevo y existente; medir tiempos
  const phone = phoneN();
  const tNew = [], tOld = [];
  const first = await lite(await post(base, { nombre: 'Prueba', telefono: phone, acepta_privacidad: true }, { 'x-forwarded-for': '9.9.9.1, 10.0.0.1' }));
  const second = await lite(await post(base, { nombre: 'Prueba', telefono: phone, acepta_privacidad: true, mensaje: 'otra vez' }, { 'x-forwarded-for': '9.9.9.2, 10.0.0.1' }));
  log('nuevo ->', first.s, first.b, '| existente ->', second.s, second.b);
  if (first.s !== second.s || first.b !== second.b || first.h !== second.h) fail(`[${name}] la respuesta para nuevo y existente difiere: ${JSON.stringify([first, second])}`); else ok(`[${name}] respuesta idéntica (estatus, cuerpo y cabeceras) para teléfono nuevo y existente`);
  // oráculo por tiempo: 12 nuevos vs 12 existentes (IPs distintas para no topar el límite)
  const known = phoneN(); await post(base, { nombre: 'Base', telefono: known, acepta_privacidad: true });
  for (let i = 0; i < 4; i++) {
    let t = performance.now(); await post(base, { nombre: 'N' + i, telefono: phoneN(), acepta_privacidad: true }, { 'x-forwarded-for': `7.7.${i}.1, 10.0.0.1` }); tNew.push(performance.now() - t);
    t = performance.now(); await post(base, { nombre: 'E' + i, telefono: known, acepta_privacidad: true }, { 'x-forwarded-for': `8.8.${i}.1, 10.0.0.1` }); tOld.push(performance.now() - t);
  }
  const med = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
  log(`mediana de tiempo: nuevo ${med(tNew).toFixed(0)} ms | existente ${med(tOld).toFixed(0)} ms (diferencia ${(med(tNew) - med(tOld)).toFixed(0)} ms, 4 muestras)`);

  // 2) límite por IP con X-Forwarded-For falso distinto en cada petición
  let limited = 0, okc = 0;
  const t0 = Date.now();
  for (let i = 0; i < 30; i++) {
    const r = await post(base, { nombre: 'Flood' + i, telefono: phoneN(), acepta_privacidad: true }, { 'x-forwarded-for': `203.0.113.${i + 1}, 198.51.100.7` });
    if (r.status === 429) limited++; else okc++;
  }
  log(`30 peticiones en ${(Date.now() - t0) / 1000}s con X-Forwarded-For falso distinto (último valor fijo 198.51.100.7): aceptadas ${okc}, 429 ${limited}`);
  if (spoofIsTrusted) { if (limited === 0) fail('xff:1: el límite por IP no se activó con 30 peticiones desde la misma IP real'); else ok('xff:1: el límite por IP se activa aunque el cliente cambie el inicio de X-Forwarded-For'); }
  else log('(sin TRUSTED_PROXY no hay límite por IP: solo quedan los límites por organización (300/min) y por teléfono (5/h))');
  // spoofing contra xff:1 anteponiendo valores
  if (spoofIsTrusted) {
    const r2 = await post(base, { nombre: 'x', telefono: phoneN(), acepta_privacidad: true }, { 'x-forwarded-for': '198.51.100.7' });
    log('misma IP real esperando ya limitada ->', r2.status);
  }
  // 3) límite por teléfono: 8 envíos del mismo teléfono
  const pp = phoneN();
  for (let i = 0; i < 8; i++) await post(base, { nombre: 'Repite', telefono: pp, acepta_privacidad: true, mensaje: 'm' + i }, { 'x-forwarded-for': `50.0.0.${i}, 10.0.0.9` });
  const hist = (await sql("select count(*)::int n from activities a join leads l on l.id=a.lead_id where l.phone like $1 and l.organization_id=$2", ['%' + pp.slice(-10), orgA.id]))[0].n;
  log('8 envíos del mismo teléfono -> actividades en el historial:', hist);
  if (hist > 6) fail(`[${name}] el mismo teléfono puede inflar el historial más allá del tope de 5/h (${hist})`);
}

log('========= llaves, cuerpos raros y XSS (puerto 3300)');
const B = 'http://localhost:3300';
let r = await post(B, { nombre: 'x', telefono: phoneN(), acepta_privacidad: true }, { 'x-form-key': 'lfk_invalida' });
log('llave inválida ->', r.status, await r.text());
r = await fetch(B + '/api/public/leads', { method: 'POST', headers: { 'content-type': 'application/json', 'x-form-key': orgA.k }, body: '{"nombre":' });
log('JSON roto ->', r.status, await r.text());
r = await fetch(B + '/api/public/leads', { method: 'POST', headers: { 'content-type': 'application/json', 'x-form-key': orgA.k }, body: JSON.stringify({ nombre: 'x'.repeat(20000), telefono: '4441112233', acepta_privacidad: true }) });
log('cuerpo de 20 KB ->', r.status);
r = await post(B, { nombre: 'Sin aviso', telefono: phoneN(), acepta_privacidad: false });
log('sin aceptar privacidad ->', r.status, await r.text());
// la llave de la org A solo crea leads en A
const nB = (await sql('select count(*)::int n from leads where organization_id=$1', [orgB.id]))[0].n;
await post(B, { nombre: 'CruceOrg', telefono: phoneN(), acepta_privacidad: true });
log('leads de la org B antes/después de enviar con la llave de A:', nB, (await sql('select count(*)::int n from leads where organization_id=$1', [orgB.id]))[0].n);
// token firmado: falsificado y demasiado rápido
r = await lite(await post(B, { nombre: 'TokenFalso', telefono: phoneN(), acepta_privacidad: true, _t: 'falso.token' }));
const rf = (await sql("select count(*)::int n from leads where first_name='TokenFalso' and organization_id=$1", [orgA.id]))[0].n;
log('token falso ->', r.s, r.b, '| lead creado:', rf);
if (rf) fail('un token falso creó un lead');
// honeypot
r = await lite(await post(B, { nombre: 'Honey', telefono: phoneN(), acepta_privacidad: true, website: 'http://spam.example' }));
log('honeypot lleno ->', r.s, r.b, '| lead creado:', (await sql("select count(*)::int n from leads where first_name='Honey' and organization_id=$1", [orgA.id]))[0].n);
// XSS almacenado
const xss = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>';
await post(B, { nombre: xss, apellido: '"><svg onload=window.__xss=3>', telefono: phoneN(), email: 'x@x.com', mensaje: xss, acepta_privacidad: true });
const b = await browser();
const adm = await login(b, 'admin@potosi.ejemplo.test');
let dialogs = 0; adm.p.on('dialog', (d) => { dialogs++; d.dismiss(); });
const id = (await sql("select id from leads where first_name like '<img%' and organization_id=$1 limit 1", [orgA.id]))[0]?.id;
for (const path of ['/app/leads', '/app/pipeline', `/app/leads/${id}`, '/app']) {
  await adm.p.goto(B + path); await adm.p.waitForTimeout(1200);
  const x = await adm.p.evaluate(() => window.__xss ?? null);
  log('XSS en', path, '->', x === null ? 'no se ejecutó' : 'EJECUTADO ' + x, '| diálogos', dialogs);
  if (x !== null) fail('XSS almacenado ejecutado en ' + path);
}
await shot(adm.p, 'n4-xss-lead', false);
await b.close();
finish();
